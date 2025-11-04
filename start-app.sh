#!/bin/bash

#============================================================================
# SCRAPI - Complete Startup Script
# Description: Comprehensive script to run frontend and backend services
# Author: Auto-generated
# Date: 2025
#============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="/app/backend"
FRONTEND_DIR="/app/frontend"
MONGO_URL="mongodb://localhost:27017"
DB_NAME="scrapi"
BACKEND_PORT=8001
FRONTEND_PORT=3000

#============================================================================
# UTILITY FUNCTIONS
#============================================================================

print_header() {
    echo -e "\n${PURPLE}================================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

check_command() {
    if command -v $1 &> /dev/null; then
        print_success "$1 is installed"
        return 0
    else
        print_error "$1 is not installed"
        return 1
    fi
}

check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

wait_for_service() {
    local service_name=$1
    local port=$2
    local max_wait=$3
    local elapsed=0
    
    print_info "Waiting for $service_name to start on port $port..."
    
    while [ $elapsed -lt $max_wait ]; do
        if check_port $port; then
            print_success "$service_name is running on port $port"
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
        echo -n "."
    done
    
    echo ""
    print_error "$service_name failed to start within ${max_wait}s"
    return 1
}

#============================================================================
# SYSTEM CHECK
#============================================================================

system_check() {
    print_header "SYSTEM CHECK"
    
    # Check required commands
    print_info "Checking required commands..."
    
    local all_good=true
    
    if ! check_command "node"; then
        all_good=false
    fi
    
    if ! check_command "npm"; then
        all_good=false
    fi
    
    if ! check_command "yarn"; then
        all_good=false
    fi
    
    if ! check_command "mongod"; then
        all_good=false
    fi
    
    if [ "$all_good" = false ]; then
        print_error "Some required commands are missing. Please install them first."
        exit 1
    fi
    
    # Display versions
    print_info "Node.js version: $(node --version)"
    print_info "npm version: $(npm --version)"
    print_info "yarn version: $(yarn --version)"
    print_info "MongoDB version: $(mongod --version | head -n 1)"
    
    print_success "All system checks passed"
}

#============================================================================
# MONGODB SETUP
#============================================================================

setup_mongodb() {
    print_header "MONGODB SETUP"
    
    # Check if MongoDB is already running
    if check_port 27017; then
        print_success "MongoDB is already running on port 27017"
        return 0
    fi
    
    print_info "Starting MongoDB..."
    
    # Create MongoDB data directory if it doesn't exist
    mkdir -p /data/db
    
    # Start MongoDB in background
    nohup mongod --bind_ip_all > /var/log/mongodb.out.log 2> /var/log/mongodb.err.log &
    
    # Wait for MongoDB to start
    if wait_for_service "MongoDB" 27017 30; then
        print_success "MongoDB started successfully"
    else
        print_error "Failed to start MongoDB"
        exit 1
    fi
}

#============================================================================
# BACKEND SETUP
#============================================================================

setup_backend() {
    print_header "BACKEND SETUP"
    
    # Navigate to backend directory
    cd $BACKEND_DIR
    
    print_info "Backend directory: $(pwd)"
    
    # Check if .env file exists
    if [ ! -f .env ]; then
        print_warning ".env file not found, creating default..."
        cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=scrapi
PORT=8001
NODE_ENV=development
JWT_SECRET=$(openssl rand -base64 32)
EOF
        print_success "Created .env file with default values"
    else
        print_success ".env file exists"
    fi
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_info "node_modules not found. Installing dependencies..."
        yarn install
        print_success "Backend dependencies installed"
    else
        print_info "node_modules found, checking for updates..."
        yarn install --check-files
        print_success "Backend dependencies verified"
    fi
    
    # Install Chromium for Puppeteer if not already installed
    print_info "Checking Chromium installation for web scraping..."
    if ! command -v chromium &> /dev/null; then
        print_info "Installing Chromium browser..."
        apt-get update -qq > /dev/null 2>&1
        apt-get install -y chromium > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            print_success "Chromium installed successfully at /usr/bin/chromium"
        else
            print_warning "Chromium installation failed, scrapers may not work"
        fi
    else
        CHROMIUM_PATH=$(which chromium)
        print_success "Chromium already installed at $CHROMIUM_PATH"
    fi
    
    print_success "Backend setup complete"
}

start_backend() {
    print_header "STARTING BACKEND"
    
    cd $BACKEND_DIR
    
    # Check if backend is already running
    if check_port $BACKEND_PORT; then
        print_warning "Backend is already running on port $BACKEND_PORT"
        print_info "Stopping existing backend process..."
        pkill -f "node server.js" || true
        sleep 2
    fi
    
    print_info "Starting backend on port $BACKEND_PORT..."
    
    # Start backend in background
    nohup node server.js > /var/log/backend.out.log 2> /var/log/backend.err.log &
    BACKEND_PID=$!
    
    echo $BACKEND_PID > /tmp/backend.pid
    
    # Wait for backend to start
    if wait_for_service "Backend" $BACKEND_PORT 30; then
        print_success "Backend started successfully (PID: $BACKEND_PID)"
        
        # Test backend health
        sleep 3
        if curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null 2>&1; then
            print_success "Backend health check passed"
        else
            print_warning "Backend is running but health check endpoint may not be available"
        fi
    else
        print_error "Failed to start backend"
        print_info "Check logs: tail -f /var/log/backend.err.log"
        exit 1
    fi
}

#============================================================================
# FRONTEND SETUP
#============================================================================

setup_frontend() {
    print_header "FRONTEND SETUP"
    
    # Navigate to frontend directory
    cd $FRONTEND_DIR
    
    print_info "Frontend directory: $(pwd)"
    
    # Check if .env file exists
    if [ ! -f .env ]; then
        print_warning ".env file not found, creating default..."
        cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=443
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
EOF
        print_success "Created .env file with default values"
    else
        print_success ".env file exists"
    fi
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_info "node_modules not found. Installing dependencies..."
        yarn install
        print_success "Frontend dependencies installed"
    else
        print_info "node_modules found, checking for updates..."
        yarn install --check-files
        print_success "Frontend dependencies verified"
    fi
    
    print_success "Frontend setup complete"
}

start_frontend() {
    print_header "STARTING FRONTEND"
    
    cd $FRONTEND_DIR
    
    # Check if frontend is already running
    if check_port $FRONTEND_PORT; then
        print_warning "Frontend is already running on port $FRONTEND_PORT"
        print_info "Stopping existing frontend process..."
        pkill -f "react-scripts start" || true
        pkill -f "craco start" || true
        sleep 2
    fi
    
    print_info "Starting frontend on port $FRONTEND_PORT..."
    
    # Start frontend in background
    export HOST=0.0.0.0
    export PORT=$FRONTEND_PORT
    nohup yarn start > /var/log/frontend.out.log 2> /var/log/frontend.err.log &
    FRONTEND_PID=$!
    
    echo $FRONTEND_PID > /tmp/frontend.pid
    
    # Wait for frontend to start (takes longer)
    if wait_for_service "Frontend" $FRONTEND_PORT 60; then
        print_success "Frontend started successfully (PID: $FRONTEND_PID)"
    else
        print_error "Failed to start frontend"
        print_info "Check logs: tail -f /var/log/frontend.err.log"
        exit 1
    fi
}

#============================================================================
# STATUS CHECK
#============================================================================

check_status() {
    print_header "SERVICE STATUS"
    
    echo -e "${CYAN}Service Status:${NC}"
    echo "----------------------------------------"
    
    # MongoDB status
    if check_port 27017; then
        echo -e "MongoDB:     ${GREEN}Running${NC} (port 27017)"
    else
        echo -e "MongoDB:     ${RED}Stopped${NC}"
    fi
    
    # Backend status
    if check_port $BACKEND_PORT; then
        if [ -f /tmp/backend.pid ]; then
            BACKEND_PID=$(cat /tmp/backend.pid)
            echo -e "Backend:     ${GREEN}Running${NC} (port $BACKEND_PORT, PID: $BACKEND_PID)"
        else
            echo -e "Backend:     ${GREEN}Running${NC} (port $BACKEND_PORT)"
        fi
    else
        echo -e "Backend:     ${RED}Stopped${NC}"
    fi
    
    # Frontend status
    if check_port $FRONTEND_PORT; then
        if [ -f /tmp/frontend.pid ]; then
            FRONTEND_PID=$(cat /tmp/frontend.pid)
            echo -e "Frontend:    ${GREEN}Running${NC} (port $FRONTEND_PORT, PID: $FRONTEND_PID)"
        else
            echo -e "Frontend:    ${GREEN}Running${NC} (port $FRONTEND_PORT)"
        fi
    else
        echo -e "Frontend:    ${RED}Stopped${NC}"
    fi
    
    echo "----------------------------------------"
    
    print_success "All services are running!"
    
    echo ""
    print_info "Access the application:"
    echo -e "  ${CYAN}Frontend:${NC} http://localhost:$FRONTEND_PORT"
    echo -e "  ${CYAN}Backend:${NC}  http://localhost:$BACKEND_PORT"
    echo -e "  ${CYAN}MongoDB:${NC}  mongodb://localhost:27017"
    
    echo ""
    print_info "Useful commands:"
    echo -e "  ${CYAN}View backend logs:${NC}  tail -f /var/log/backend.err.log"
    echo -e "  ${CYAN}View frontend logs:${NC} tail -f /var/log/frontend.err.log"
    echo -e "  ${CYAN}View MongoDB logs:${NC}  tail -f /var/log/mongodb.err.log"
    echo -e "  ${CYAN}Stop services:${NC}      ./start-app.sh stop"
    echo -e "  ${CYAN}Restart services:${NC}   ./start-app.sh restart"
}

#============================================================================
# STOP SERVICES
#============================================================================

stop_services() {
    print_header "STOPPING SERVICES"
    
    # Stop frontend
    if [ -f /tmp/frontend.pid ]; then
        FRONTEND_PID=$(cat /tmp/frontend.pid)
        print_info "Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
        rm /tmp/frontend.pid
    fi
    pkill -f "react-scripts start" 2>/dev/null || true
    pkill -f "craco start" 2>/dev/null || true
    
    # Stop backend
    if [ -f /tmp/backend.pid ]; then
        BACKEND_PID=$(cat /tmp/backend.pid)
        print_info "Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null || true
        rm /tmp/backend.pid
    fi
    pkill -f "node server.js" 2>/dev/null || true
    
    # Stop MongoDB
    print_info "Stopping MongoDB..."
    pkill -f "mongod" 2>/dev/null || true
    
    sleep 3
    
    print_success "All services stopped"
}

#============================================================================
# LOGS
#============================================================================

view_logs() {
    local service=$1
    
    case $service in
        backend)
            print_info "Viewing backend logs (Ctrl+C to exit)..."
            tail -f /var/log/backend.err.log
            ;;
        frontend)
            print_info "Viewing frontend logs (Ctrl+C to exit)..."
            tail -f /var/log/frontend.err.log
            ;;
        mongodb)
            print_info "Viewing MongoDB logs (Ctrl+C to exit)..."
            tail -f /var/log/mongodb.err.log
            ;;
        all)
            print_info "Viewing all logs (Ctrl+C to exit)..."
            tail -f /var/log/backend.err.log /var/log/frontend.err.log /var/log/mongodb.err.log
            ;;
        *)
            print_error "Unknown service: $service"
            echo "Usage: $0 logs [backend|frontend|mongodb|all]"
            exit 1
            ;;
    esac
}

#============================================================================
# MAIN EXECUTION
#============================================================================

main() {
    local command=${1:-start}
    
    case $command in
        start)
            print_header "SCRAPI - COMPLETE APPLICATION STARTUP"
            system_check
            setup_mongodb
            setup_backend
            setup_frontend
            start_backend
            start_frontend
            check_status
            ;;
        stop)
            stop_services
            ;;
        restart)
            stop_services
            sleep 2
            main start
            ;;
        status)
            check_status
            ;;
        logs)
            view_logs ${2:-all}
            ;;
        backend)
            print_header "STARTING BACKEND ONLY"
            system_check
            setup_mongodb
            setup_backend
            start_backend
            ;;
        frontend)
            print_header "STARTING FRONTEND ONLY"
            setup_frontend
            start_frontend
            ;;
        help|--help|-h)
            echo "SCRAPI - Complete Startup Script"
            echo ""
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  start      Start all services (MongoDB, Backend, Frontend) [default]"
            echo "  stop       Stop all services"
            echo "  restart    Restart all services"
            echo "  status     Check status of all services"
            echo "  backend    Start backend only"
            echo "  frontend   Start frontend only"
            echo "  logs       View logs [backend|frontend|mongodb|all]"
            echo "  help       Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Start all services"
            echo "  $0 start              # Start all services"
            echo "  $0 stop               # Stop all services"
            echo "  $0 restart            # Restart all services"
            echo "  $0 status             # Check service status"
            echo "  $0 backend            # Start backend only"
            echo "  $0 frontend           # Start frontend only"
            echo "  $0 logs backend       # View backend logs"
            echo "  $0 logs all           # View all logs"
            ;;
        *)
            print_error "Unknown command: $command"
            echo "Use '$0 help' to see available commands"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
