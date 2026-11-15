from datetime import datetime, timedelta
from app.database import SessionLocal, engine, Base
from app.models import RFQ, Bid, ActivityLog

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear old data
    db.query(ActivityLog).delete()
    db.query(Bid).delete()
    db.query(RFQ).delete()
    db.commit()

    now = datetime.utcnow()

    # RFQ 1: Trigger rule = BID_RECEIVED (Active, closes in 20 minutes)
    rfq1 = RFQ(
        reference_id="RFQ-MUM-DEL-101",
        name="Air Cargo Express: Mumbai to Delhi (500kg)",
        pickup_date="2026-11-20",
        bid_start_time=now - timedelta(hours=2),
        bid_close_time=now + timedelta(minutes=20),
        forced_bid_close_time=now + timedelta(minutes=45),
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger="BID_RECEIVED",
        is_british_auction=True,
        status="ACTIVE"
    )
    db.add(rfq1)
    db.commit()
    db.refresh(rfq1)

    # Initial bids for RFQ 1
    t_rfq1_created = now - timedelta(hours=2)
    t_rfq1_bid1 = now - timedelta(minutes=45)
    t_rfq1_bid2 = now - timedelta(minutes=20)

    bids_rfq1 = [
        Bid(
            rfq_id=rfq1.id,
            supplier_name="BlueDart Aviation",
            carrier_name="Boeing 737 Cargo",
            freight_charges=42000.0,
            origin_charges=3000.0,
            destination_charges=2500.0,
            total_price=47500.0,
            transit_time="24 Hours",
            validity_of_quote="7 Days",
            submitted_at=t_rfq1_bid1
        ),
        Bid(
            rfq_id=rfq1.id,
            supplier_name="SpiceXpress Logistics",
            carrier_name="Q400 Freighter",
            freight_charges=40000.0,
            origin_charges=2800.0,
            destination_charges=2200.0,
            total_price=45000.0,
            transit_time="18 Hours",
            validity_of_quote="5 Days",
            submitted_at=t_rfq1_bid2
        )
    ]
    for b in bids_rfq1:
        db.add(b)
    
    db.add(ActivityLog(
        rfq_id=rfq1.id,
        action_type="RFQ_CREATED",
        reason="Auction created with BID_RECEIVED rule (X=10m, Y=5m).",
        created_at=t_rfq1_created
    ))
    db.add(ActivityLog(
        rfq_id=rfq1.id,
        action_type="BID_SUBMITTED",
        supplier_name="BlueDart Aviation",
        bid_amount=47500.0,
        reason="Initial quote placed by BlueDart Aviation (₹47,500.00)",
        created_at=t_rfq1_bid1
    ))
    db.add(ActivityLog(
        rfq_id=rfq1.id,
        action_type="BID_SUBMITTED",
        supplier_name="SpiceXpress Logistics",
        bid_amount=45000.0,
        reason="Underbid placed by SpiceXpress Logistics (₹45,000.00)",
        created_at=t_rfq1_bid2
    ))
    db.commit()

    # RFQ 2: Trigger rule = L1_RANK_CHANGE (Active, close time in 8 minutes -> INSIDE trigger window of 10 min!)
    # Perfect for quick live testing in UI!
    t_rfq2_created = now - timedelta(hours=1)
    t_rfq2_bid1 = now - timedelta(minutes=25)

    rfq2 = RFQ(
        reference_id="RFQ-BLR-HYD-202",
        name="FTL Road Freight: Bengaluru to Hyderabad (16-Ton)",
        pickup_date="2026-11-22",
        bid_start_time=t_rfq2_created,
        bid_close_time=now + timedelta(minutes=8),
        forced_bid_close_time=now + timedelta(minutes=30),
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger="L1_RANK_CHANGE",
        is_british_auction=True,
        status="ACTIVE"
    )
    db.add(rfq2)
    db.commit()
    db.refresh(rfq2)

    bid_rfq2 = Bid(
        rfq_id=rfq2.id,
        supplier_name="VRL Logistics",
        carrier_name="Tata Prima 4028",
        freight_charges=28000.0,
        origin_charges=1500.0,
        destination_charges=1500.0,
        total_price=31000.0,
        transit_time="36 Hours",
        validity_of_quote="10 Days",
        submitted_at=t_rfq2_bid1
    )
    db.add(bid_rfq2)
    db.add(ActivityLog(
        rfq_id=rfq2.id,
        action_type="RFQ_CREATED",
        reason="Auction created with L1_RANK_CHANGE rule (X=10m, Y=5m).",
        created_at=t_rfq2_created
    ))
    db.add(ActivityLog(
        rfq_id=rfq2.id,
        action_type="BID_SUBMITTED",
        supplier_name="VRL Logistics",
        bid_amount=31000.0,
        reason="Initial quote placed by VRL Logistics (₹31,000.00)",
        created_at=t_rfq2_bid1
    ))
    db.commit()

    # RFQ 3: Already reached Forced Close Time (to test FORCE_CLOSED)
    t_rfq3_created = now - timedelta(hours=5)
    t_rfq3_bid = now - timedelta(hours=3)
    t_rfq3_closed = now - timedelta(minutes=10)

    rfq3 = RFQ(
        reference_id="RFQ-CHN-KOL-303",
        name="Container Ocean Freight: Chennai to Kolkata Port",
        pickup_date="2026-11-18",
        bid_start_time=t_rfq3_created,
        bid_close_time=t_rfq3_closed,
        forced_bid_close_time=t_rfq3_closed,
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger="BID_RECEIVED",
        is_british_auction=True,
        status="FORCE_CLOSED"
    )
    db.add(rfq3)
    db.commit()
    db.refresh(rfq3)

    db.add(Bid(
        rfq_id=rfq3.id,
        supplier_name="Maersk Line India",
        carrier_name="Triple-E Vessel",
        freight_charges=75000.0,
        origin_charges=5000.0,
        destination_charges=4000.0,
        total_price=84000.0,
        transit_time="4 Days",
        validity_of_quote="14 Days",
        submitted_at=t_rfq3_bid
    ))
    db.add(ActivityLog(
        rfq_id=rfq3.id,
        action_type="RFQ_CREATED",
        reason="Auction created with BID_RECEIVED rule (X=10m, Y=5m).",
        created_at=t_rfq3_created
    ))
    db.add(ActivityLog(
        rfq_id=rfq3.id,
        action_type="BID_SUBMITTED",
        supplier_name="Maersk Line India",
        bid_amount=84000.0,
        reason="Initial quote placed by Maersk Line India (₹84,000.00)",
        created_at=t_rfq3_bid
    ))
    db.add(ActivityLog(
        rfq_id=rfq3.id,
        action_type="AUCTION_FORCE_CLOSED",
        reason="Auction reached Forced Bid Close Time and was automatically closed.",
        created_at=t_rfq3_closed
    ))
    db.commit()

    # RFQ 4: Long-Running Active Auction with Multiple Rank Changes & Extension Logs
    # Stays ACTIVE for 7 days so it is guaranteed active on your deployed URL!
    t_rfq4_created = now - timedelta(hours=4)
    t_rfq4_bid1 = now - timedelta(hours=3, minutes=15)
    t_rfq4_bid2 = now - timedelta(hours=2, minutes=20)
    t_rfq4_bid3 = now - timedelta(hours=1, minutes=30)
    t_rfq4_bid4 = now - timedelta(minutes=45)

    rfq4 = RFQ(
        reference_id="RFQ-DEL-BLR-404",
        name="Cold Chain Pharma Express: Delhi to Bengaluru (Dedicated Reefer)",
        pickup_date="2027-11-28",
        bid_start_time=t_rfq4_created,
        bid_close_time=now + timedelta(days=365),
        forced_bid_close_time=now + timedelta(days=380),
        trigger_window_minutes=15,
        extension_duration_minutes=5,
        extension_trigger="L1_RANK_CHANGE",
        is_british_auction=True,
        status="ACTIVE"
    )
    db.add(rfq4)
    db.commit()
    db.refresh(rfq4)

    bids_rfq4 = [
        Bid(
            rfq_id=rfq4.id,
            supplier_name="Safexpress Logistics",
            carrier_name="BharatBenz Reefer 2823R",
            freight_charges=55000.0,
            origin_charges=5000.0,
            destination_charges=5000.0,
            total_price=65000.0,
            transit_time="48 Hours",
            validity_of_quote="14 Days",
            submitted_at=t_rfq4_bid1
        ),
        Bid(
            rfq_id=rfq4.id,
            supplier_name="TCI Freight",
            carrier_name="Tata Signa 4825.T",
            freight_charges=50000.0,
            origin_charges=4000.0,
            destination_charges=4000.0,
            total_price=58000.0,
            transit_time="42 Hours",
            validity_of_quote="10 Days",
            submitted_at=t_rfq4_bid2
        ),
        Bid(
            rfq_id=rfq4.id,
            supplier_name="Gati KWE",
            carrier_name="Eicher Pro 6028",
            freight_charges=52000.0,
            origin_charges=4500.0,
            destination_charges=4500.0,
            total_price=61000.0,
            transit_time="44 Hours",
            validity_of_quote="12 Days",
            submitted_at=t_rfq4_bid3
        ),
        Bid(
            rfq_id=rfq4.id,
            supplier_name="Delhivery Freight",
            carrier_name="Volvo FM 420 Reefer",
            freight_charges=46000.0,
            origin_charges=4000.0,
            destination_charges=4000.0,
            total_price=54000.0,
            transit_time="38 Hours",
            validity_of_quote="15 Days",
            submitted_at=t_rfq4_bid4
        )
    ]
    for b in bids_rfq4:
        db.add(b)

    db.add(ActivityLog(
        rfq_id=rfq4.id,
        action_type="RFQ_CREATED",
        reason="Auction created with L1_RANK_CHANGE rule (X=15m, Y=5m). Closes in 7 days.",
        created_at=t_rfq4_created
    ))
    db.add(ActivityLog(
        rfq_id=rfq4.id,
        action_type="BID_SUBMITTED",
        supplier_name="Safexpress Logistics",
        bid_amount=65000.0,
        reason="Initial quote placed by Safexpress Logistics (₹65,000.00) - Assigned Rank L1",
        created_at=t_rfq4_bid1
    ))
    db.add(ActivityLog(
        rfq_id=rfq4.id,
        action_type="BID_SUBMITTED",
        supplier_name="TCI Freight",
        bid_amount=58000.0,
        reason="Underbid placed by TCI Freight (₹58,000.00) - Rank changed: TCI became new L1 leader",
        created_at=t_rfq4_bid2
    ))
    db.add(ActivityLog(
        rfq_id=rfq4.id,
        action_type="BID_SUBMITTED",
        supplier_name="Gati KWE",
        bid_amount=61000.0,
        reason="Quote submitted by Gati KWE (₹61,000.00) - Rank changed: Gati slotted into Rank L2",
        created_at=t_rfq4_bid3
    ))
    db.add(ActivityLog(
        rfq_id=rfq4.id,
        action_type="AUCTION_EXTENDED",
        supplier_name="Delhivery Freight",
        bid_amount=54000.0,
        reason="L1 (Lowest Bidder) changed to 'Delhivery Freight' with a quote of ₹54,000.00 (Auction extended by 5 minutes)",
        created_at=t_rfq4_bid4
    ))
    db.add(ActivityLog(
        rfq_id=rfq4.id,
        action_type="BID_SUBMITTED",
        supplier_name="Delhivery Freight",
        bid_amount=54000.0,
        reason="Winning underbid placed by Delhivery Freight (₹54,000.00) - Displaced TCI Freight to take L1",
        created_at=t_rfq4_bid4
    ))
    db.commit()
    db.commit()
    db.close()

    print("Seed data created successfully!")

if __name__ == "__main__":
    seed()
