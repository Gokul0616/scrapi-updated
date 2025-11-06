#!/bin/bash

# ============================================
# Scrapi Application Startup Script
# Complete startup for frontend, backend, and dependencies
# ============================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✅ ${NC}$1"
}

log_warning() {
    echo -e "${YELLOW}⚠️  ${NC}$1"
}

log_error() {
    echo -e "${RED}❌ ${NC}$1"
}

log_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ============================================
# STEP 1: System Dependencies
# ============================================
log_section "STEP 1: Installing System Dependencies"

log_info "Checking for Chromium..."
if ! command -v chromium &> /dev/null; then
    log_info "Installing Chromium for Puppeteer..."
    apt-get update -qq
    apt-get install -y -qq chromium
    log_success "Chromium installed: $(chromium --version)"
else
    log_success "Chromium already installed: $(chromium --version)"
fi

# ============================================
# STEP 2: Backend Dependencies
# ============================================
log_section "STEP 2: Installing Backend Dependencies"

cd /app/backend

if [ ! -d "node_modules" ]; then
    log_info "Installing backend dependencies with yarn..."
    yarn install
    log_success "Backend dependencies installed"
else
    log_info "Backend node_modules exists, checking for updates..."
    yarn install --check-files
    log_success "Backend dependencies verified"
fi

# ============================================
# STEP 3: Frontend Dependencies
# ============================================
log_section "STEP 3: Installing Frontend Dependencies"

cd /app/frontend

if [ ! -d "node_modules" ]; then
    log_info "Installing frontend dependencies with yarn..."
    yarn install
    log_success "Frontend dependencies installed"
else
    log_info "Frontend node_modules exists, checking for updates..."
    yarn install --check-files
    log_success "Frontend dependencies verified"
fi

# ============================================
# STEP 4: MongoDB
# ============================================
log_section "STEP 4: Starting MongoDB"

# Check if MongoDB is already running
if pgrep -x "mongod" > /dev/null; then
    log_success "MongoDB is already running"
else
    log_info "Starting MongoDB..."
    sudo supervisorctl start mongodb
    sleep 2
    
    if pgrep -x "mongod" > /dev/null; then
        log_success "MongoDB started successfully"
    else
        log_error "Failed to start MongoDB"
        exit 1
    fi
fi

# ============================================
# STEP 5: Backend Server
# ============================================
log_section "STEP 5: Starting Backend Server"

cd /app/backend

# Kill any existing backend processes
if pgrep -f "node server.js" > /dev/null; then
    log_warning "Stopping existing backend process..."
    pkill -f "node server.js" || true
    sleep 2
fi

# Stop supervisor backend (which tries to use uvicorn incorrectly)
sudo supervisorctl stop backend 2>/dev/null || true

# Start backend with Node.js
log_info "Starting backend server with Node.js..."
nohup node server.js > /var/log/supervisor/backend.out.log 2> /var/log/supervisor/backend.err.log &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

if pgrep -f "node server.js" > /dev/null; then
    log_success "Backend server started successfully on port 8001 (PID: $BACKEND_PID)"
    log_info "Checking backend logs..."
    tail -n 5 /var/log/supervisor/backend.out.log
else
    log_error "Failed to start backend server"
    log_error "Check logs: tail -f /var/log/supervisor/backend.err.log"
    exit 1
fi

# ============================================
# STEP 6: Frontend Server
# ============================================
log_section "STEP 6: Starting Frontend Server"

# Check if frontend is already running
if pgrep -f "craco start" > /dev/null; then
    log_success "Frontend is already running on port 3000"
else
    log_info "Starting frontend server..."
    sudo supervisorctl start frontend
    sleep 5
    
    if pgrep -f "craco start" > /dev/null; then
        log_success "Frontend server started successfully on port 3000"
    else
        log_error "Failed to start frontend server"
        log_error "Check logs: tail -f /var/log/supervisor/frontend.err.log"
        exit 1
    fi
fi

# ============================================
# STEP 7: Verification
# ============================================
log_section "STEP 7: Service Verification"

echo ""
log_info "Service Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check MongoDB
if pgrep -x "mongod" > /dev/null; then
    echo -e "  MongoDB:     ${GREEN}✅ Running${NC} (Port 27017)"
else
    echo -e "  MongoDB:     ${RED}❌ Not Running${NC}"
fi

# Check Backend
if pgrep -f "node server.js" > /dev/null; then
    echo -e "  Backend:     ${GREEN}✅ Running${NC} (Port 8001)"
else
    echo -e "  Backend:     ${RED}❌ Not Running${NC}"
fi

# Check Frontend
if pgrep -f "craco start" > /dev/null; then
    echo -e "  Frontend:    ${GREEN}✅ Running${NC} (Port 3000)"
else
    echo -e "  Frontend:    ${RED}❌ Not Running${NC}"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check open ports
log_info "Open Ports:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
netstat -tlnp 2>/dev/null | grep -E "3000|8001|27017" | awk '{print "  "$4" -> "$7}' || echo "  Could not check ports"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================
# FINAL STATUS
# ============================================
log_section "🎉 APPLICATION STARTUP COMPLETE!"

echo ""
echo -e "${GREEN}Application is ready!${NC}"
echo ""
echo "📍 Access Points:"
echo "  • Frontend: http://localhost:3000"
echo "  • Backend:  http://localhost:8001"
echo "  • MongoDB:  mongodb://localhost:27017"
echo ""
echo "📋 Useful Commands:"
echo "  • View backend logs:  tail -f /var/log/supervisor/backend.out.log"
echo "  • View frontend logs: tail -f /var/log/supervisor/frontend.out.log"
echo "  • Check services:     ps aux | grep -E 'node|mongod'"
echo "  • Restart backend:    pkill -f 'node server.js' && cd /app/backend && nohup node server.js > /var/log/supervisor/backend.out.log 2>&1 &"
echo ""
log_success "All services started successfully!"
echo ""
