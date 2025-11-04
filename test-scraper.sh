#!/bin/bash

#============================================================================
# SCRAPI - Scraper Testing Script
# Description: Test Google Maps scraper functionality
#============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  SCRAPI - Google Maps Scraper Test${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Check if backend is running
if ! lsof -Pi :8001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}✗ Backend is not running on port 8001${NC}"
    echo -e "${YELLOW}  Start backend with: ./start-app.sh backend${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Backend is running${NC}"

# Check if Chromium is installed
if ! command -v chromium &> /dev/null; then
    echo -e "${RED}✗ Chromium is not installed${NC}"
    echo -e "${YELLOW}  Install with: apt-get install -y chromium${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Chromium is installed at $(which chromium)${NC}"

# Test Puppeteer with Chromium
echo ""
echo -e "${BLUE}Testing Puppeteer with Chromium...${NC}"

cd /app/backend

node << 'EOF'
const puppeteer = require('puppeteer');

async function testPuppeteer() {
  try {
    console.log('  → Launching browser...');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ],
      executablePath: '/usr/bin/chromium'
    });
    
    console.log('  → Opening page...');
    const page = await browser.newPage();
    await page.goto('https://www.google.com', { timeout: 10000 });
    
    const title = await page.title();
    console.log('  → Page title:', title);
    
    await browser.close();
    console.log('\x1b[32m✓ Puppeteer test passed!\x1b[0m');
    return true;
  } catch (error) {
    console.error('\x1b[31m✗ Puppeteer test failed:', error.message, '\x1b[0m');
    return false;
  }
}

testPuppeteer().then(success => {
  process.exit(success ? 0 : 1);
});
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo -e "${BLUE}The Google Maps scraper is ready to use.${NC}"
    echo ""
else
    echo -e "${RED}✗ Tests failed${NC}"
    exit 1
fi
