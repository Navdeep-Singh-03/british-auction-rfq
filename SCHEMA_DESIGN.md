# Database Schema Design

## ER Diagram

```mermaid
erDiagram
    RFQS ||--o{ BIDS : "has many"
    RFQS ||--o{ ACTIVITY_LOGS : "has many"

    RFQS {
        int id PK
        string reference_id UK
        string name
        string pickup_date
        timestamp bid_start_time
        timestamp bid_close_time
        timestamp forced_bid_close_time
        int trigger_window_minutes
        int extension_duration_minutes
        string extension_trigger
        boolean is_british_auction
        string status
        timestamp created_at
    }

    BIDS {
        int id PK
        int rfq_id FK
        string supplier_name
        string carrier_name
        float freight_charges
        float origin_charges
        float destination_charges
        float total_price
        string transit_time
        string validity_of_quote
        timestamp submitted_at
    }

    ACTIVITY_LOGS {
        int id PK
        int rfq_id FK
        string action_type
        string supplier_name
        float bid_amount
        timestamp old_close_time
        timestamp new_close_time
        string reason
        timestamp created_at
    }
```

## Table Details

### rfqs

Main table that stores each auction along with its British Auction configuration.

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key, auto-increment |
| reference_id | VARCHAR | Unique business ID like `RFQ-MUM-DEL-101` |
| name | VARCHAR | Title describing the shipment |
| pickup_date | VARCHAR | When the goods need to be picked up |
| bid_start_time | TIMESTAMP | When suppliers can start bidding |
| bid_close_time | TIMESTAMP | Current closing deadline (this gets extended dynamically) |
| forced_bid_close_time | TIMESTAMP | Absolute hard cap — close time can never go past this |
| trigger_window_minutes | INTEGER | X — how many minutes before close to watch for activity |
| extension_duration_minutes | INTEGER | Y — how many minutes to add when triggered |
| extension_trigger | VARCHAR | One of: `BID_RECEIVED`, `ANY_RANK_CHANGE`, `L1_RANK_CHANGE` |
| is_british_auction | BOOLEAN | Whether the extension mechanism is enabled |
| status | VARCHAR | `ACTIVE`, `CLOSED`, `FORCE_CLOSED`, or `UPCOMING` |
| created_at | TIMESTAMP | When this RFQ was created |

### bids

Each row is a supplier's submitted quote for an RFQ. Multiple suppliers can bid on the same RFQ, and the same supplier can bid multiple times (to lower their price).

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| rfq_id | INTEGER | FK to rfqs.id (cascade delete) |
| supplier_name | VARCHAR | Company name |
| carrier_name | VARCHAR | Vehicle/vessel used |
| freight_charges | FLOAT | Base freight cost |
| origin_charges | FLOAT | Charges at pickup location |
| destination_charges | FLOAT | Charges at delivery location |
| total_price | FLOAT | Sum of above three (calculated on submit) |
| transit_time | VARCHAR | e.g. "24 Hours", "3 Days" |
| validity_of_quote | VARCHAR | How long the quote is valid |
| submitted_at | TIMESTAMP | When the bid was placed |

### activity_logs

Audit trail for everything that happens in an auction. Used to show the timeline on the frontend and to explain why each extension happened.

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| rfq_id | INTEGER | FK to rfqs.id (cascade delete) |
| action_type | VARCHAR | `RFQ_CREATED`, `BID_SUBMITTED`, `AUCTION_EXTENDED`, etc. |
| supplier_name | VARCHAR | Which supplier triggered this event (nullable) |
| bid_amount | FLOAT | The bid amount involved (nullable) |
| old_close_time | TIMESTAMP | Previous close time before extension (nullable) |
| new_close_time | TIMESTAMP | New close time after extension (nullable) |
| reason | TEXT | Human-readable explanation |
| created_at | TIMESTAMP | When this event occurred |

## Indexes

- `rfqs(reference_id)` — unique index for fast lookup and preventing duplicates
- `bids(rfq_id, total_price)` — for quickly fetching ranked bids per RFQ
- `activity_logs(rfq_id, created_at)` — for displaying the timeline in order
