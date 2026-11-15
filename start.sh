#!/bin/bash

# Trap Ctrl+C to terminate both background jobs
trap "kill 0" EXIT

echo "============================================="
echo " Starting British Auction RFQ System"
echo "============================================="

# Start backend
bash "$(dirname "$0")/run_backend.sh" &

# Wait 2 seconds for backend to initialize
sleep 2

# Start frontend
bash "$(dirname "$0")/run_frontend.sh" &

wait
