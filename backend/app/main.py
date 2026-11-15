from datetime import datetime, timedelta
from typing import List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, Base, get_db
from .models import RFQ, Bid, ActivityLog
from .schemas import (
    RFQCreate,
    RFQResponse,
    RFQListItem,
    BidCreate,
    BidResponse,
    ActivityLogResponse
)
from .auction_engine import (
    get_auction_status,
    evaluate_and_apply_extension
)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="British Auction RFQ System API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.post("/api/rfqs", response_model=RFQResponse, status_code=status.HTTP_201_CREATED)
def create_rfq(payload: RFQCreate, db: Session = Depends(get_db)):
    # Check if reference_id already exists
    existing = db.query(RFQ).filter(RFQ.reference_id == payload.reference_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"RFQ with Reference ID '{payload.reference_id}' already exists."
        )

    rfq = RFQ(
        reference_id=payload.reference_id,
        name=payload.name,
        pickup_date=payload.pickup_date,
        bid_start_time=payload.bid_start_time,
        bid_close_time=payload.bid_close_time,
        forced_bid_close_time=payload.forced_bid_close_time,
        trigger_window_minutes=payload.trigger_window_minutes,
        extension_duration_minutes=payload.extension_duration_minutes,
        extension_trigger=payload.extension_trigger,
        is_british_auction=payload.is_british_auction,
        status="ACTIVE"
    )

    db.add(rfq)
    db.commit()
    db.refresh(rfq)

    # Initial activity log
    initial_log = ActivityLog(
        rfq_id=rfq.id,
        action_type="RFQ_CREATED",
        reason=(
            f"RFQ created with British Auction enabled. "
            f"Trigger Window: {rfq.trigger_window_minutes}m, "
            f"Extension: {rfq.extension_duration_minutes}m, "
            f"Rule: {rfq.extension_trigger}."
        )
    )
    db.add(initial_log)
    db.commit()

    return build_rfq_response(rfq)


@app.get("/api/rfqs", response_model=List[RFQListItem])
def list_rfqs(db: Session = Depends(get_db)):
    rfqs = db.query(RFQ).order_by(RFQ.created_at.desc()).all()
    results = []

    for rfq in rfqs:
        current_status = get_auction_status(rfq)
        if rfq.status != current_status:
            rfq.status = current_status
            db.commit()

        bids = rfq.bids
        lowest_bid = bids[0].total_price if bids else None

        results.append(
            RFQListItem(
                id=rfq.id,
                reference_id=rfq.reference_id,
                name=rfq.name,
                pickup_date=rfq.pickup_date,
                bid_start_time=rfq.bid_start_time,
                bid_close_time=rfq.bid_close_time,
                forced_bid_close_time=rfq.forced_bid_close_time,
                current_lowest_bid=lowest_bid,
                status=current_status,
                total_bids=len(bids),
                trigger_window_minutes=rfq.trigger_window_minutes,
                extension_duration_minutes=rfq.extension_duration_minutes,
                extension_trigger=rfq.extension_trigger
            )
        )

    return results


@app.get("/api/rfqs/{rfq_id}", response_model=RFQResponse)
def get_rfq_details(rfq_id: int, db: Session = Depends(get_db)):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"RFQ #{rfq_id} not found."
        )

    current_status = get_auction_status(rfq)
    if rfq.status != current_status:
        rfq.status = current_status
        db.commit()

    return build_rfq_response(rfq)


@app.post("/api/rfqs/{rfq_id}/bids", response_model=BidResponse, status_code=status.HTTP_201_CREATED)
def submit_bid(rfq_id: int, payload: BidCreate, db: Session = Depends(get_db)):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    current_status = get_auction_status(rfq)
    if current_status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit bid. Auction is currently '{current_status}'."
        )

    # Compute total price
    total_price = round(
        payload.freight_charges + payload.origin_charges + payload.destination_charges,
        2
    )

    new_bid = Bid(
        rfq_id=rfq.id,
        supplier_name=payload.supplier_name.strip(),
        carrier_name=payload.carrier_name.strip(),
        freight_charges=payload.freight_charges,
        origin_charges=payload.origin_charges,
        destination_charges=payload.destination_charges,
        total_price=total_price,
        transit_time=payload.transit_time.strip(),
        validity_of_quote=payload.validity_of_quote.strip(),
        submitted_at=datetime.utcnow()
    )

    previous_bids = list(rfq.bids)

    # Evaluate British Auction extension rules
    extended, ext_reason, old_close, new_close = evaluate_and_apply_extension(
        rfq=rfq,
        new_bid=new_bid,
        previous_bids=previous_bids
    )

    db.add(new_bid)
    db.commit()
    db.refresh(new_bid)

    # Log bid submission
    bid_log = ActivityLog(
        rfq_id=rfq.id,
        action_type="BID_SUBMITTED",
        supplier_name=new_bid.supplier_name,
        bid_amount=new_bid.total_price,
        reason=(
            f"Quote of ₹{new_bid.total_price:,.2f} submitted by {new_bid.supplier_name} "
            f"(Carrier: {new_bid.carrier_name}, Transit: {new_bid.transit_time})"
        )
    )
    db.add(bid_log)

    # Log extension if it happened
    if extended:
        ext_log = ActivityLog(
            rfq_id=rfq.id,
            action_type="AUCTION_EXTENDED",
            supplier_name=new_bid.supplier_name,
            bid_amount=new_bid.total_price,
            old_close_time=old_close,
            new_close_time=new_close,
            reason=ext_reason
        )
        db.add(ext_log)

    db.commit()

    # Re-fetch RFQ to compute assigned rank
    db.refresh(rfq)
    sorted_bids = sorted(rfq.bids, key=lambda b: b.total_price)
    rank_idx = [b.id for b in sorted_bids].index(new_bid.id) + 1

    bid_resp = BidResponse.model_validate(new_bid)
    bid_resp.rank = f"L{rank_idx}"
    return bid_resp


@app.post("/api/rfqs/{rfq_id}/activate-demo-window", response_model=RFQResponse)
def activate_demo_window(rfq_id: int, db: Session = Depends(get_db)):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    now = datetime.utcnow()
    # Fast-forward close time to 8 minutes from now so trigger window is immediately active
    rfq.bid_start_time = now - timedelta(hours=1)
    rfq.bid_close_time = now + timedelta(minutes=8)
    rfq.forced_bid_close_time = now + timedelta(minutes=25)
    rfq.status = "ACTIVE"

    log = ActivityLog(
        rfq_id=rfq.id,
        action_type="TIMELINE_FAST_FORWARDED",
        reason="Demo Mode: Deadline adjusted to 8 minutes from now to test live anti-sniping extension.",
        created_at=now
    )
    db.add(log)
    db.commit()
    db.refresh(rfq)
    return build_rfq_response(rfq)


def build_rfq_response(rfq: RFQ) -> RFQResponse:
    # Sort bids by total_price ascending
    sorted_bids = sorted(rfq.bids, key=lambda b: b.total_price)
    
    bid_responses = []
    for idx, b in enumerate(sorted_bids):
        resp = BidResponse.model_validate(b)
        resp.rank = f"L{idx + 1}"
        bid_responses.append(resp)

    lowest_price = sorted_bids[0].total_price if sorted_bids else None
    l1_supplier = sorted_bids[0].supplier_name if sorted_bids else None

    sorted_logs = sorted(rfq.activity_logs, key=lambda l: (l.created_at, l.id), reverse=True)
    log_responses = [ActivityLogResponse.model_validate(log) for log in sorted_logs]

    return RFQResponse(
        id=rfq.id,
        reference_id=rfq.reference_id,
        name=rfq.name,
        pickup_date=rfq.pickup_date,
        bid_start_time=rfq.bid_start_time,
        bid_close_time=rfq.bid_close_time,
        forced_bid_close_time=rfq.forced_bid_close_time,
        trigger_window_minutes=rfq.trigger_window_minutes,
        extension_duration_minutes=rfq.extension_duration_minutes,
        extension_trigger=rfq.extension_trigger,
        is_british_auction=rfq.is_british_auction,
        status=get_auction_status(rfq),
        created_at=rfq.created_at,
        current_lowest_bid=lowest_price,
        current_l1_supplier=l1_supplier,
        bids=bid_responses,
        activity_logs=log_responses
    )
