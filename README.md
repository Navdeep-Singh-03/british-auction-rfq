# British Auction in RFQ System

A full-stack Request for Quotation (RFQ) platform featuring a **British Auction bidding engine**. The system enables buyers to publish freight/procurement RFQs and suppliers to compete transparently with live price revisions, ranking updates, and anti-sniping dynamic deadline extensions.

---

## 1. Key Concept: What is a British Auction?

In standard auctions, bidders often wait until the last few seconds to place bids ("bid sniping"), preventing others from reacting. A **British Auction** solves this problem:
1. **Suppliers submit bids openly** and can continuously lower prices to win.
2. **Dynamic Extension Window (X minutes):** If qualifying bidding activity occurs inside the trigger window before close time, the auction deadline automatically extends by **Y minutes**.
3. **Unbreachable Forced Close Time:** The auction has a hard cap deadline (`Forced Bid Close Time`) after which no further extensions are permitted, preventing runaway auctions.

### Three Configurable Extension Triggers:
* **a) Bid Received in Last X Minutes (`BID_RECEIVED`):** Any valid bid placed within X minutes of closing extends the auction by Y minutes.
* **b) Any Supplier Rank Change in Last X Minutes (`ANY_RANK_CHANGE`):** If a new bid alters any supplier position in the rankings, the auction extends by Y minutes.
* **c) Lowest Bidder (L1) Rank Change in Last X Minutes (`L1_RANK_CHANGE`):** The auction extends **only** when a supplier successfully beats the current lowest bid (L1).

---

## 2. Tech Stack

* **Backend:** Python 3.11, FastAPI, SQLAlchemy 2.0, Pydantic v2.
* **Database:** PostgreSQL (with automatic SQLite fallback for local development).
* **Frontend:** React 18, JavaScript (ES6+), Vite, clean responsive CSS.
* **Testing:** Pytest, FastAPI TestClient.

---

## 3. Quick Start Guide

### Prerequisites
* Python 3.10+
* Node.js v18+ and npm

### One-Command Startup
Run the unified launch script from the project root:
```bash
cd /Users/namyasingh/Desktop/RFQ
./start.sh
```
This script initializes the virtual environment, installs packages, runs database migrations, and boots both the FastAPI backend (`http://localhost:8000`) and the Vite React frontend (`http://localhost:5173`).

---

### Manual Startup (Step-by-Step)

#### 1. Backend Setup
```bash
cd backend

# Create virtual environment and activate
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# (Optional) Seed realistic demo RFQs and bids
python seed_data.py

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
* Interactive API Documentation (Swagger UI): `http://localhost:8000/docs`
* API Health Check: `http://localhost:8000/api/health`

#### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
* Open in browser: `http://localhost:5173`

---

## 4. Running Automated Tests

A comprehensive unit test suite is included in `backend/test_auction.py` verifying all core business rules:
```bash
cd backend
./venv/bin/pytest -v test_auction.py
```

### What the test suite covers:
1. **Validation Checks:** Ensures `Forced Close Time > Bid Close Time` and `Bid Close Time > Start Time`.
2. **Trigger Window Evaluation:** Confirms `BID_RECEIVED` properly triggers time extensions.
3. **Rank Change Validation:** Tests `L1_RANK_CHANGE` to verify that an extension occurs only when L1 is displaced, and does *not* trigger when a non-L1 bid arrives.
4. **Hard Cap Rule:** Asserts that proposed extensions never push the deadline past `forced_bid_close_time`.

---

## 5. Project Structure

```
RFQ/
├── HLD.md                   # High-Level Architecture Design & diagrams
├── SCHEMA_DESIGN.md         # Database schema, ER diagram & index specifications
├── README.md                # Project documentation & execution guide
├── start.sh                 # Unified startup script
├── run_backend.sh           # Backend start script
├── run_frontend.sh          # Frontend start script
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── database.py       # SQLAlchemy engine with SQLite fallback
│   │   ├── models.py         # RFQ, Bid, ActivityLog ORM models
│   │   ├── schemas.py        # Pydantic v2 validation models
│   │   ├── auction_engine.py # British auction extension & ranking logic
│   │   └── main.py           # FastAPI REST API endpoints & CORS
│   ├── seed_data.py         # Seeds demo RFQs for quick testing
│   ├── test_auction.py      # Pytest unit tests for all business rules
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment variables template
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx            # Top navigation & role toggling
    │   │   ├── AuctionList.jsx       # RFQ listing table with filters
    │   │   ├── AuctionDetail.jsx     # Detail view, rankings table & logs
    │   │   ├── CountdownTimer.jsx    # Live ticking countdown & status banner
    │   │   ├── CreateRFQModal.jsx    # Buyer RFQ creation form
    │   │   ├── BidSubmissionModal.jsx# Supplier quote entry form
    │   │   └── ActivityLog.jsx       # Extension audit trail timeline
    │   ├── services/
    │   │   └── api.js                # Fetch API client
    │   ├── App.jsx                   # Main state & view routing
    │   ├── index.css                 # Clean, modern UI stylesheet
    │   └── main.jsx                  # React application entry point
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## 6. How to Demo & Test in the UI

1. Open `http://localhost:5173` in your browser.
2. In the listing, click on **`RFQ-BLR-HYD-202`** (pre-seeded with close time in ~5 minutes, trigger window X = 10 min, rule = `L1_RANK_CHANGE`).
3. Notice the orange banner indicating the **Trigger Window is Active**.
4. Click **`+ Submit Quote`** and enter a quote with total price **lower** than the current L1 price (e.g. ₹25,000).
5. Watch the auction **instantly extend by 5 minutes**, the countdown update live, and an entry appear in the **Activity Log** citing the exact trigger reason!
6. Submit another quote higher than L1 (e.g. ₹35,000): notice the quote is recorded as L2/L3, but the auction deadline is **not** extended.

---

## 7. Interview Talking Points (How to explain this project)

When explaining this project in an interview:
* **The Problem:** Explain how traditional procurement auctions suffer from last-minute bid sniping where vendors place bids in the dying seconds, resulting in sub-optimal pricing for buyers.
* **The Solution:** Explain how the British Auction model monitors bidding in a configurable trigger window (X min) and adds extension duration (Y min), encouraging vendors to compete actively while maintaining a firm hard cap (`forced_bid_close_time`) so the auction cannot run indefinitely.
* **Architecture:** Explain that you separated the bidding rules into a clean `auction_engine.py` service layer rather than mixing business logic inside API handlers.
* **Real-time Sync:** Explain that you used periodic polling in React with `useEffect` and `setInterval` to keep all connected buyers and suppliers synchronized, while keeping the architecture simple and easy to deploy without heavy Redis or socket brokers initially.
