from datetime import datetime, timedelta
from typing import List, Tuple, Optional
from .models import RFQ, Bid, ActivityLog

def get_auction_status(rfq: RFQ) -> str:
    now = datetime.utcnow()
    
    if now >= rfq.forced_bid_close_time:
        return "FORCE_CLOSED"
    if now >= rfq.bid_close_time:
        return "CLOSED"
    if now < rfq.bid_start_time:
        return "UPCOMING"
    return "ACTIVE"


def get_supplier_rankings(bids: List[Bid]) -> List[str]:
    # Each supplier's best (lowest) quote
    best_quotes = {}
    for b in bids:
        if b.supplier_name not in best_quotes or b.total_price < best_quotes[b.supplier_name]:
            best_quotes[b.supplier_name] = b.total_price
    
    # Sort suppliers by lowest total price
    sorted_suppliers = sorted(best_quotes.keys(), key=lambda s: best_quotes[s])
    return sorted_suppliers


def evaluate_and_apply_extension(
    rfq: RFQ,
    new_bid: Bid,
    previous_bids: List[Bid]
) -> Tuple[bool, Optional[str], Optional[datetime], Optional[datetime]]:
    # Only applicable if British Auction is enabled
    if not rfq.is_british_auction:
        return False, None, None, None

    now = datetime.utcnow()
    x_minutes = rfq.trigger_window_minutes
    y_minutes = rfq.extension_duration_minutes
    trigger_rule = rfq.extension_trigger

    # Check if the current time is within the trigger window [bid_close_time - X minutes, bid_close_time]
    window_start = rfq.bid_close_time - timedelta(minutes=x_minutes)
    is_in_trigger_window = window_start <= now <= rfq.bid_close_time

    if not is_in_trigger_window:
        return False, None, None, None

    # Check the specific extension trigger condition
    should_extend = False
    reason = ""

    if trigger_rule == "BID_RECEIVED":
        should_extend = True
        reason = f"Bid of ₹{new_bid.total_price:,.2f} received from '{new_bid.supplier_name}' within the {x_minutes} min trigger window."

    elif trigger_rule == "ANY_RANK_CHANGE":
        old_rankings = get_supplier_rankings(previous_bids)
        new_rankings = get_supplier_rankings(previous_bids + [new_bid])
        
        if old_rankings != new_rankings:
            should_extend = True
            reason = f"Supplier ranking changed within the {x_minutes} min window following bid by '{new_bid.supplier_name}'."
        else:
            reason = "Bid submitted, but supplier rankings remained unchanged."

    elif trigger_rule == "L1_RANK_CHANGE":
        old_l1 = None
        if previous_bids:
            sorted_prev = sorted(previous_bids, key=lambda b: b.total_price)
            old_l1 = sorted_prev[0].supplier_name
        
        all_bids = previous_bids + [new_bid]
        sorted_all = sorted(all_bids, key=lambda b: b.total_price)
        new_l1 = sorted_all[0].supplier_name

        if old_l1 != new_l1:
            should_extend = True
            reason = f"L1 (Lowest Bidder) changed to '{new_l1}' with a quote of ₹{sorted_all[0].total_price:,.2f}."
        else:
            reason = f"Bid placed by '{new_bid.supplier_name}', but L1 supplier remained '{old_l1}'."

    if not should_extend:
        return False, reason, None, None

    # Apply extension duration (Y minutes)
    old_close = rfq.bid_close_time
    proposed_close = old_close + timedelta(minutes=y_minutes)

    # Hard Cap Rule: The auction must never extend beyond the Forced Bid Close Time
    if proposed_close > rfq.forced_bid_close_time:
        new_close = rfq.forced_bid_close_time
        capped_reason = reason + f" (Auction extended to hard cap at Forced Close Time: {new_close.strftime('%Y-%m-%d %H:%M:%S UTC')})"
    else:
        new_close = proposed_close
        capped_reason = reason + f" (Auction extended by {y_minutes} minutes to {new_close.strftime('%Y-%m-%d %H:%M:%S UTC')})"

    if new_close > old_close:
        rfq.bid_close_time = new_close
        return True, capped_reason, old_close, new_close

    return False, "Auction has already reached the Forced Bid Close Time and cannot be extended further.", old_close, old_close
