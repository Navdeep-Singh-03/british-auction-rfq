from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

class BidCreate(BaseModel):
    supplier_name: str = Field(..., min_length=2)
    carrier_name: str = Field(..., min_length=2)
    freight_charges: float = Field(..., ge=0)
    origin_charges: float = Field(0.0, ge=0)
    destination_charges: float = Field(0.0, ge=0)
    transit_time: str = Field(..., min_length=1)
    validity_of_quote: str = Field(..., min_length=1)

class BidResponse(BaseModel):
    id: int
    rfq_id: int
    supplier_name: str
    carrier_name: str
    freight_charges: float
    origin_charges: float
    destination_charges: float
    total_price: float
    transit_time: str
    validity_of_quote: str
    submitted_at: datetime
    rank: Optional[str] = None

    class Config:
        from_attributes = True

class ActivityLogResponse(BaseModel):
    id: int
    rfq_id: int
    action_type: str
    supplier_name: Optional[str] = None
    bid_amount: Optional[float] = None
    old_close_time: Optional[datetime] = None
    new_close_time: Optional[datetime] = None
    reason: str
    created_at: datetime

    class Config:
        from_attributes = True

class RFQCreate(BaseModel):
    reference_id: str = Field(..., min_length=2)
    name: str = Field(..., min_length=2)
    pickup_date: str
    bid_start_time: datetime
    bid_close_time: datetime
    forced_bid_close_time: datetime
    trigger_window_minutes: int = Field(10, gt=0)
    extension_duration_minutes: int = Field(5, gt=0)
    extension_trigger: str = Field("BID_RECEIVED")
    is_british_auction: bool = True

    @field_validator("forced_bid_close_time")
    def validate_forced_close(cls, v, info):
        bid_close = info.data.get("bid_close_time")
        if bid_close and v <= bid_close:
            raise ValueError("Forced Bid Close Time must always be greater than Bid Close Time")
        return v

    @field_validator("bid_close_time")
    def validate_close_time(cls, v, info):
        bid_start = info.data.get("bid_start_time")
        if bid_start and v <= bid_start:
            raise ValueError("Bid Close Time must be later than Bid Start Time")
        return v

class RFQListItem(BaseModel):
    id: int
    reference_id: str
    name: str
    pickup_date: str
    bid_start_time: datetime
    bid_close_time: datetime
    forced_bid_close_time: datetime
    current_lowest_bid: Optional[float] = None
    status: str
    total_bids: int = 0
    trigger_window_minutes: int
    extension_duration_minutes: int
    extension_trigger: str

    class Config:
        from_attributes = True

class RFQResponse(BaseModel):
    id: int
    reference_id: str
    name: str
    pickup_date: str
    bid_start_time: datetime
    bid_close_time: datetime
    forced_bid_close_time: datetime
    trigger_window_minutes: int
    extension_duration_minutes: int
    extension_trigger: str
    is_british_auction: bool
    status: str
    created_at: datetime
    current_lowest_bid: Optional[float] = None
    current_l1_supplier: Optional[str] = None
    bids: List[BidResponse] = []
    activity_logs: List[ActivityLogResponse] = []

    class Config:
        from_attributes = True
