#!/bin/bash

#============================================================================
# SCRAPI - Health Check Script
# Description: Check if all services are running and healthy
#============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
    fi
}

print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

print_header "SCRAPI - HEALTH CHECK"

# Check MongoDB
echo -e "${BLUE}Checking MongoDB...${NC}"
if lsof -Pi :27017 -sTCP:LISTEN -t >/dev/null 2>&1; then
    if mongosh --eval "db.adminCommand('ping')" --quiet >/dev/null 2>&1; then
        print_status 0 "MongoDB is running and healthy (port 27017)"
        MONGO_OK=true
    else
        print_status 1 "MongoDB port is open but not responding"
        MONGO_OK=false
    fi
else
    print_status 1 "MongoDB is not running (port 27017)"
    MONGO_OK=false
fi

# Check Backend
echo -e "\n${BLUE}Checking Backend...${NC}"
if lsof -Pi :8001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    if curl -s http://localhost:8001/api/health >/dev/null 2>&1; then
        print_status 0 "Backend is running and healthy (port 8001)"
        BACKEND_OK=true
    else
        print_status 1 "Backend port is open but health check failed"
        BACKEND_OK=false
    fi
else
    print_status 1 "Backend is not running (port 8001)"
    BACKEND_OK=false
fi

# Check Frontend
echo -e "\n${BLUE}Checking Frontend...${NC}"
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        print_status 0 "Frontend is running and healthy (port 3000)"
        FRONTEND_OK=true
    else
        print_status 1 "Frontend port is open but not responding"
        FRONTEND_OK=false
    fi
else
    print_status 1 "Frontend is not running (port 3000)"
    FRONTEND_OK=false
fi

# Check Disk Space
echo -e "\n${BLUE}Checking Disk Space...${NC}"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 90 ]; then
    print_status 0 "Disk space: ${DISK_USAGE}% used"
else
    print_status 1 "Disk space: ${DISK_USAGE}% used (warning: >90%)"
fi

# Check Memory
echo -e "\n${BLUE}Checking Memory...${NC}"
MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ $MEM_USAGE -lt 90 ]; then
    print_status 0 "Memory usage: ${MEM_USAGE}%"
else
    print_status 1 "Memory usage: ${MEM_USAGE}% (warning: >90%)"
fi

# Overall Status
print_header "OVERALL STATUS"

if [ "$MONGO_OK" = true ] && [ "$BACKEND_OK" = true ] && [ "$FRONTEND_OK" = true ]; then
    echo -e "${GREEN}✓ All services are running and healthy!${NC}\n"
    echo "Access the application:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend:  http://localhost:8001"
    echo "  MongoDB:  mongodb://localhost:27017"
    exit 0
else
    echo -e "${RED}✗ Some services are not running!${NC}\n"
    echo "Troubleshooting steps:"
    
    if [ "$MONGO_OK" = false ]; then
        echo "  MongoDB: mongod --bind_ip_all &"
    fi
    
    if [ "$BACKEND_OK" = false ]; then
        echo "  Backend: cd /app/backend && node server.js &"
        echo "  Logs: tail -f /var/log/backend.err.log"
    fi
    
    if [ "$FRONTEND_OK" = false ]; then
        echo "  Frontend: cd /app/frontend && yarn start &"
        echo "  Logs: tail -f /var/log/frontend.err.log"
    fi
    
    echo ""
    echo "Or use the startup script: ./start-app.sh"
    exit 1
fi
