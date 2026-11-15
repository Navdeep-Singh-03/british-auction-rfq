#!/bin/bash
cd "$(dirname "$0")/backend"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r requirements.txt
fi

echo "Starting FastAPI backend server on http://localhost:8000..."
./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
