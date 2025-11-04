#!/bin/bash

#============================================================================
# SCRAPI - Dependency Installation Script
# Description: Install all required dependencies for the application
#============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
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

print_header "SCRAPI - DEPENDENCY INSTALLATION"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js not found. Please install Node.js v18+"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm installed: v$NPM_VERSION"
else
    print_error "npm not found"
    exit 1
fi

# Check/Install Yarn
if ! command -v yarn &> /dev/null; then
    print_info "Installing yarn..."
    npm install -g yarn
    print_success "Yarn installed"
else
    YARN_VERSION=$(yarn --version)
    print_success "Yarn installed: v$YARN_VERSION"
fi

# Install Backend Dependencies
print_header "INSTALLING BACKEND DEPENDENCIES"
cd /app/backend

if [ -d "node_modules" ]; then
    print_info "Removing existing node_modules..."
    rm -rf node_modules
fi

print_info "Installing backend packages..."
yarn install

if [ $? -eq 0 ]; then
    print_success "Backend dependencies installed successfully"
else
    print_error "Backend dependency installation failed"
    exit 1
fi

# Install Chromium for Puppeteer
print_info "Installing Chromium browser for web scraping..."
apt-get update -qq > /dev/null 2>&1
if ! command -v chromium &> /dev/null; then
    apt-get install -y chromium > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_success "Chromium installed successfully at $(which chromium)"
    else
        print_error "Chromium installation failed"
        exit 1
    fi
else
    print_success "Chromium already installed at $(which chromium)"
fi

# Install Frontend Dependencies
print_header "INSTALLING FRONTEND DEPENDENCIES"
cd /app/frontend

if [ -d "node_modules" ]; then
    print_info "Removing existing node_modules..."
    rm -rf node_modules
fi

print_info "Installing frontend packages..."
yarn install

if [ $? -eq 0 ]; then
    print_success "Frontend dependencies installed successfully"
else
    print_error "Frontend dependency installation failed"
    exit 1
fi

# Summary
print_header "INSTALLATION COMPLETE"

echo -e "${GREEN}✓ All dependencies installed successfully!${NC}\n"
echo "Backend Dependencies:"
echo "  - express, mongoose, jsonwebtoken, bcryptjs"
echo "  - puppeteer, axios, cheerio"
echo "  - dotenv, cors, uuid"
echo ""
echo "Frontend Dependencies:"
echo "  - react v19, react-router-dom v7"
echo "  - axios, lucide-react"
echo "  - @radix-ui components, tailwindcss"
echo "  - shadcn/ui components"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Setup environment variables: ./start-app.sh help"
echo "  2. Start the application: ./start-app.sh"
echo ""
