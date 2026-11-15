# British Auction in RFQ System

Full-stack RFQ (Request for Quotation) platform with a British Auction bidding mechanism. Buyers can create RFQs for logistics/freight services, and suppliers compete by submitting quotes. The system has an anti-sniping feature — if someone bids close to the deadline, the auction automatically extends to give other suppliers a fair chance to respond.

## What is a British Auction (in this context)?

The main problem with normal timed auctions is "bid sniping" — suppliers wait until the last 5-10 seconds to place their bid so no one else can react. This results in the buyer not getting the best possible price.

British Auction rules fix this:
- The buyer sets a **Trigger Window (X minutes)** and an **Extension Duration (Y minutes)**.
- If a qualifying bid comes in during the last X minutes before close, the deadline gets pushed forward by Y minutes.
- There's also a **Forced Bid Close Time** — a hard cap that the auction can never extend beyond, no matter what.

Three trigger conditions are supported:
- **BID_RECEIVED** — any bid in last X min triggers extension
- **ANY_RANK_CHANGE** — extension only if the bid changes any supplier's rank position
- **L1_RANK_CHANGE** — extension only if the lowest bidder (L1) changes

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy, Pydantic, Python 3.11
- **Database:** PostgreSQL (falls back to SQLite locally if Postgres isn't running)
- **Frontend:** React 18, JavaScript, Vite
- **Tests:** Pytest

## How to Run

### Prerequisites
- Python 3.10+
- Node.js v18+

### Quick Start
```bash
cd RFQ
./start.sh
```
This starts both the backend (port 8000) and frontend (port 5173).

### Or run them separately

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python seed_data.py          # optional - loads demo data
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API docs (Swagger): http://localhost:8000/docs

## Running Tests

```bash
cd backend
./venv/bin/pytest -v test_auction.py
```

Tests cover:
- Input validation (forced close > bid close > start time)
- BID_RECEIVED trigger correctly extending the deadline
- L1_RANK_CHANGE only extending when L1 actually changes
- Hard cap enforcement — extension never goes past forced close time

## Project Structure

```
RFQ/
├── HLD.md                    # High level design doc
├── SCHEMA_DESIGN.md          # DB schema and ER diagram
├── README.md
├── start.sh
│
├── backend/
│   ├── app/
│   │   ├── database.py       # DB connection setup
│   │   ├── models.py         # SQLAlchemy models (RFQ, Bid, ActivityLog)
│   │   ├── schemas.py        # Pydantic request/response schemas
│   │   ├── auction_engine.py # Core auction extension logic
│   │   └── main.py           # API endpoints
│   ├── seed_data.py          # Demo data seeder
│   ├── test_auction.py       # Unit tests
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── AuctionList.jsx
    │   │   ├── AuctionDetail.jsx
    │   │   ├── CountdownTimer.jsx
    │   │   ├── CreateRFQModal.jsx
    │   │   ├── BidSubmissionModal.jsx
    │   │   └── ActivityLog.jsx
    │   ├── services/
    │   │   └── api.js
    │   ├── App.jsx
    │   ├── index.css
    │   └── main.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## How to Test the British Auction in the UI

1. Open http://localhost:5173 and switch to **Supplier View**.
2. Open any active auction (like `RFQ-DEL-BLR-404`).
3. Click the **⚡ Test Extension Window** button to bring the deadline close (puts you inside the trigger window).
4. Submit a quote with a total price lower than the current L1.
5. You should see the countdown extend and a new entry show up in the activity log explaining why.
6. Try submitting a quote higher than L1 — no extension should happen.
