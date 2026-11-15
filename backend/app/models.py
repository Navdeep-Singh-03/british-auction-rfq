from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class RFQ(Base):
    __tablename__ = "rfqs"

    id = Column(Integer, primary_key=True, index=True)
    reference_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    pickup_date = Column(String, nullable=False)
    
    bid_start_time = Column(DateTime, nullable=False)
    bid_close_time = Column(DateTime, nullable=False)
    forced_bid_close_time = Column(DateTime, nullable=False)

    trigger_window_minutes = Column(Integer, default=10) # X minutes
    extension_duration_minutes = Column(Integer, default=5) # Y minutes
    extension_trigger = Column(String, default="BID_RECEIVED") # BID_RECEIVED, ANY_RANK_CHANGE, L1_RANK_CHANGE
    is_british_auction = Column(Boolean, default=True)

    status = Column(String, default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)

    bids = relationship("Bid", back_populates="rfq", cascade="all, delete-orphan", order_by="Bid.total_price.asc()")
    activity_logs = relationship("ActivityLog", back_populates="rfq", cascade="all, delete-orphan", order_by="ActivityLog.created_at.desc()")


class Bid(Base):
    __tablename__ = "bids"

    id = Column(Integer, primary_key=True, index=True)
    rfq_id = Column(Integer, ForeignKey("rfqs.id"), nullable=False)
    
    supplier_name = Column(String, nullable=False)
    carrier_name = Column(String, nullable=False)
    freight_charges = Column(Float, nullable=False)
    origin_charges = Column(Float, default=0.0)
    destination_charges = Column(Float, default=0.0)
    total_price = Column(Float, nullable=False)
    transit_time = Column(String, nullable=False)
    validity_of_quote = Column(String, nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    rfq = relationship("RFQ", back_populates="bids")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    rfq_id = Column(Integer, ForeignKey("rfqs.id"), nullable=False)
    
    action_type = Column(String, nullable=False)
    supplier_name = Column(String, nullable=True)
    bid_amount = Column(Float, nullable=True)
    old_close_time = Column(DateTime, nullable=True)
    new_close_time = Column(DateTime, nullable=True)
    reason = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    rfq = relationship("RFQ", back_populates="activity_logs")
