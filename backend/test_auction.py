from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import RFQ, Bid

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def test_create_rfq_validations():
    now = datetime.utcnow()
    # Invalid: forced close <= close time
    payload = {
        "reference_id": "TEST-001",
        "name": "Invalid RFQ",
        "pickup_date": "2026-11-20",
        "bid_start_time": (now - timedelta(hours=1)).isoformat(),
        "bid_close_time": (now + timedelta(hours=2)).isoformat(),
        "forced_bid_close_time": (now + timedelta(hours=1)).isoformat(), # Less than close!
        "trigger_window_minutes": 10,
        "extension_duration_minutes": 5,
        "extension_trigger": "BID_RECEIVED"
    }
    res = client.post("/api/rfqs", json=payload)
    assert res.status_code == 422 # Pydantic validation error


def test_bid_received_trigger_extends_auction():
    now = datetime.utcnow()
    # Create RFQ where close is in 5 minutes, trigger window is 10 min -> NOW is in trigger window!
    payload = {
        "reference_id": "RFQ-TRIGGER-A",
        "name": "Test Extension Trigger A",
        "pickup_date": "2026-11-20",
        "bid_start_time": (now - timedelta(hours=1)).isoformat(),
        "bid_close_time": (now + timedelta(minutes=5)).isoformat(),
        "forced_bid_close_time": (now + timedelta(minutes=20)).isoformat(),
        "trigger_window_minutes": 10,
        "extension_duration_minutes": 5,
        "extension_trigger": "BID_RECEIVED"
    }
    rfq_res = client.post("/api/rfqs", json=payload)
    assert rfq_res.status_code == 201
    rfq_id = rfq_res.json()["id"]

    # Place a bid
    bid_payload = {
        "supplier_name": "Supplier X",
        "carrier_name": "Truck 1",
        "freight_charges": 10000,
        "origin_charges": 1000,
        "destination_charges": 1000,
        "transit_time": "2 Days",
        "validity_of_quote": "5 Days"
    }
    bid_res = client.post(f"/api/rfqs/{rfq_id}/bids", json=bid_payload)
    assert bid_res.status_code == 201

    # Check updated RFQ
    updated = client.get(f"/api/rfqs/{rfq_id}").json()
    # The bid_close_time should have been extended by 5 minutes
    # Check activity log contains AUCTION_EXTENDED
    has_extension = any(log["action_type"] == "AUCTION_EXTENDED" for log in updated["activity_logs"])
    assert has_extension is True


def test_l1_rank_change_trigger():
    now = datetime.utcnow()
    payload = {
        "reference_id": "RFQ-L1-TRIGGER",
        "name": "Test L1 Trigger",
        "pickup_date": "2026-11-20",
        "bid_start_time": (now - timedelta(hours=1)).isoformat(),
        "bid_close_time": (now + timedelta(minutes=5)).isoformat(),
        "forced_bid_close_time": (now + timedelta(minutes=30)).isoformat(),
        "trigger_window_minutes": 10,
        "extension_duration_minutes": 5,
        "extension_trigger": "L1_RANK_CHANGE"
    }
    rfq_res = client.post("/api/rfqs", json=payload)
    rfq_id = rfq_res.json()["id"]

    # First bid: Supplier A (10,000) -> Becomes L1, should extend
    bid1 = {
        "supplier_name": "Supplier A",
        "carrier_name": "Truck 1",
        "freight_charges": 8000,
        "origin_charges": 1000,
        "destination_charges": 1000, # Total 10,000
        "transit_time": "2 Days",
        "validity_of_quote": "5 Days"
    }
    res1 = client.post(f"/api/rfqs/{rfq_id}/bids", json=bid1)
    assert res1.status_code == 201

    # Second bid: Supplier B (12,000) -> Higher than L1! L1 does not change!
    bid2 = {
        "supplier_name": "Supplier B",
        "carrier_name": "Truck 2",
        "freight_charges": 10000,
        "origin_charges": 1000,
        "destination_charges": 1000, # Total 12,000
        "transit_time": "3 Days",
        "validity_of_quote": "5 Days"
    }
    res2 = client.post(f"/api/rfqs/{rfq_id}/bids", json=bid2)
    assert res2.status_code == 201

    # Check logs: only 1 extension should exist (from bid1), not from bid2
    updated = client.get(f"/api/rfqs/{rfq_id}").json()
    ext_count = sum(1 for log in updated["activity_logs"] if log["action_type"] == "AUCTION_EXTENDED")
    assert ext_count == 1


def test_forced_bid_close_time_hard_cap():
    now = datetime.utcnow()
    # Close is in 3 min, forced close is in 5 min, extension duration is 10 min
    # When extended, it should cap at forced close (5 min), NOT extend to 13 min!
    payload = {
        "reference_id": "RFQ-HARD-CAP",
        "name": "Test Forced Close Cap",
        "pickup_date": "2026-11-20",
        "bid_start_time": (now - timedelta(hours=1)).isoformat(),
        "bid_close_time": (now + timedelta(minutes=3)).isoformat(),
        "forced_bid_close_time": (now + timedelta(minutes=5)).isoformat(),
        "trigger_window_minutes": 10,
        "extension_duration_minutes": 10, # Proposed would be +10 min
        "extension_trigger": "BID_RECEIVED"
    }
    rfq_res = client.post("/api/rfqs", json=payload)
    rfq_id = rfq_res.json()["id"]

    bid = {
        "supplier_name": "Supplier C",
        "carrier_name": "Truck 3",
        "freight_charges": 5000,
        "origin_charges": 500,
        "destination_charges": 500,
        "transit_time": "1 Day",
        "validity_of_quote": "5 Days"
    }
    client.post(f"/api/rfqs/{rfq_id}/bids", json=bid)

    updated = client.get(f"/api/rfqs/{rfq_id}").json()
    # close_time must equal forced_bid_close_time, NOT exceed it
    assert updated["bid_close_time"] == updated["forced_bid_close_time"]
