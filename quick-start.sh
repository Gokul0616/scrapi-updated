#!/bin/bash

#============================================================================
# SCRAPI - Quick Start Script
# Description: Minimal script for quick development startup
#============================================================================

set -e

echo "🚀 SCRAPI Quick Start"
echo "==========================================="
echo ""

# Check if MongoDB is running
if ! lsof -Pi :27017 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "📦 Starting MongoDB..."
    nohup mongod --bind_ip_all > /dev/null 2>&1 &
    sleep 3
    echo "✓ MongoDB started"
else
    echo "✓ MongoDB already running"
fi

# Start Backend
echo ""
echo "🔧 Starting Backend..."
cd /app/backend

# Check dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    yarn install
fi

# Check Chromium installation
if ! command -v chromium &> /dev/null; then
    echo "📦 Installing Chromium browser..."
    apt-get update -qq > /dev/null 2>&1
    apt-get install -y chromium > /dev/null 2>&1
    echo "✓ Chromium installed"
else
    echo "✓ Chromium already installed at $(which chromium)"
fi

# Kill existing backend
pkill -f "node server.js" 2>/dev/null || true

# Start backend
nohup node server.js > /var/log/backend.out.log 2> /var/log/backend.err.log &
sleep 3

if lsof -Pi :8001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✓ Backend started on port 8001"
else
    echo "✗ Backend failed to start. Check logs: tail -f /var/log/backend.err.log"
    exit 1
fi

# Start Frontend
echo ""
echo "🎨 Starting Frontend..."
cd /app/frontend

# Check dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    yarn install
fi

# Kill existing frontend
pkill -f "craco start" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true

# Start frontend
export HOST=0.0.0.0
export PORT=3000
nohup yarn start > /var/log/frontend.out.log 2> /var/log/frontend.err.log &
sleep 5

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✓ Frontend started on port 3000"
else
    echo "⚠ Frontend is starting (may take up to 60s)..."
fi

echo ""
echo "==========================================="
echo "✅ All services started!"
echo ""
echo "Access the application:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8001"
echo "  MongoDB:  mongodb://localhost:27017"
echo ""
echo "View logs:"
echo "  Backend:  tail -f /var/log/backend.err.log"
echo "  Frontend: tail -f /var/log/frontend.err.log"
echo ""
echo "Stop services:"
echo "  pkill -f 'node server.js'"
echo "  pkill -f 'craco start'"
echo "  pkill mongod"
echo "==========================================="
