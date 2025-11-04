#!/bin/bash

#============================================================================
# SCRAPI - Complete Guide & Demo
# Description: Interactive guide for managing the SCRAPI platform
#============================================================================

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

clear

echo -e "${PURPLE}"
cat << "EOF"
   _____ __________  ___    ____  ____
  / ___// ____/ __ \/   |  / __ \/  _/
  \__ \/ /   / /_/ / /| | / /_/ // /  
 ___/ / /___/ _, _/ ___ |/ ____// /   
/____/\____/_/ |_/_/  |_/_/   /___/   
                                       
EOF
echo -e "${NC}"

echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}       SCRAPI - Web Scraping Platform${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""

# Check current status
MONGO_RUNNING=false
BACKEND_RUNNING=false
FRONTEND_RUNNING=false

if lsof -Pi :27017 -sTCP:LISTEN -t >/dev/null 2>&1; then MONGO_RUNNING=true; fi
if lsof -Pi :8001 -sTCP:LISTEN -t >/dev/null 2>&1; then BACKEND_RUNNING=true; fi
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then FRONTEND_RUNNING=true; fi

echo -e "${BLUE}📊 Current Status:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$MONGO_RUNNING" = true ]; then
    echo -e "  MongoDB:    ${GREEN}✓ Running${NC} (port 27017)"
else
    echo -e "  MongoDB:    ${YELLOW}○ Stopped${NC}"
fi

if [ "$BACKEND_RUNNING" = true ]; then
    echo -e "  Backend:    ${GREEN}✓ Running${NC} (port 8001)"
else
    echo -e "  Backend:    ${YELLOW}○ Stopped${NC}"
fi

if [ "$FRONTEND_RUNNING" = true ]; then
    echo -e "  Frontend:   ${GREEN}✓ Running${NC} (port 3000)"
else
    echo -e "  Frontend:   ${YELLOW}○ Stopped${NC}"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$MONGO_RUNNING" = true ] && [ "$BACKEND_RUNNING" = true ] && [ "$FRONTEND_RUNNING" = true ]; then
    echo -e "${GREEN}✨ All services are running!${NC}"
    echo ""
    echo -e "${CYAN}🌐 Access Points:${NC}"
    echo "  Frontend:  http://localhost:3000"
    echo "  Backend:   http://localhost:8001"
    echo "  MongoDB:   mongodb://localhost:27017"
else
    echo -e "${YELLOW}⚠️  Some services are not running${NC}"
    echo ""
    echo -e "${CYAN}💡 Quick Start:${NC}"
    echo "  ./start-app.sh"
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📚 Available Commands${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}🚀 Service Management${NC}"
echo "  ./start-app.sh              - Start all services"
echo "  ./start-app.sh stop         - Stop all services"
echo "  ./start-app.sh restart      - Restart all services"
echo "  ./start-app.sh status       - Check service status"
echo "  ./start-app.sh backend      - Start backend only"
echo "  ./start-app.sh frontend     - Start frontend only"
echo ""

echo -e "${GREEN}📝 Logs & Monitoring${NC}"
echo "  ./start-app.sh logs all     - View all logs"
echo "  ./start-app.sh logs backend - View backend logs"
echo "  ./start-app.sh logs frontend- View frontend logs"
echo "  ./health-check.sh           - Run health check"
echo ""

echo -e "${GREEN}📦 Setup & Installation${NC}"
echo "  ./install-dependencies.sh   - Install all dependencies"
echo "  ./quick-start.sh            - Quick minimal startup"
echo ""

echo -e "${GREEN}📖 Documentation${NC}"
echo "  cat README_STARTUP.md       - Complete documentation"
echo "  cat DEPLOYMENT_SUMMARY.md   - Deployment summary"
echo ""

echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🎯 Quick Actions${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""

echo "Select an action:"
echo ""
echo "  1) Start all services"
echo "  2) Stop all services"
echo "  3) Check service status"
echo "  4) View health check"
echo "  5) View logs"
echo "  6) Show API endpoints"
echo "  7) Show help"
echo "  8) Exit"
echo ""
echo -ne "${CYAN}Enter your choice [1-8]: ${NC}"

read choice

case $choice in
    1)
        echo ""
        echo -e "${GREEN}Starting all services...${NC}"
        ./start-app.sh start
        ;;
    2)
        echo ""
        echo -e "${YELLOW}Stopping all services...${NC}"
        ./start-app.sh stop
        ;;
    3)
        echo ""
        ./start-app.sh status
        ;;
    4)
        echo ""
        ./health-check.sh
        ;;
    5)
        echo ""
        echo "View logs for:"
        echo "  1) All logs"
        echo "  2) Backend only"
        echo "  3) Frontend only"
        echo ""
        echo -ne "${CYAN}Choice: ${NC}"
        read log_choice
        case $log_choice in
            1) ./start-app.sh logs all ;;
            2) ./start-app.sh logs backend ;;
            3) ./start-app.sh logs frontend ;;
            *) echo "Invalid choice" ;;
        esac
        ;;
    6)
        echo ""
        echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}API Endpoints${NC}"
        echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
        echo ""
        echo "Base URL: http://localhost:8001/api"
        echo ""
        echo -e "${BLUE}Authentication:${NC}"
        echo "  POST   /api/auth/register"
        echo "  POST   /api/auth/login"
        echo "  GET    /api/auth/me"
        echo "  PUT    /api/auth/profile"
        echo ""
        echo -e "${BLUE}Actors:${NC}"
        echo "  GET    /api/actors"
        echo "  GET    /api/actors/:id"
        echo "  POST   /api/actors"
        echo ""
        echo -e "${BLUE}Runs:${NC}"
        echo "  GET    /api/runs"
        echo "  GET    /api/runs/:id"
        echo "  POST   /api/runs"
        echo ""
        ;;
    7)
        echo ""
        ./start-app.sh help
        ;;
    8)
        echo ""
        echo -e "${GREEN}Goodbye!${NC}"
        exit 0
        ;;
    *)
        echo ""
        echo -e "${YELLOW}Invalid choice${NC}"
        ;;
esac

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Thank you for using SCRAPI! 🚀${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""
