#!/bin/bash
# frontend/dev.sh - Robust frontend starter

PORT=3000

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔍 Checking for existing processes on port $PORT...${NC}"

# Find PID using lsof
PID=$(lsof -ti :$PORT)

if [ ! -z "$PID" ]; then
    echo -e "${RED}⚠️  Found process $PID on port $PORT. Killing it...${NC}"
    kill -9 $PID
    sleep 1
    
    # Verify it's gone
    PID_CHECK=$(lsof -ti :$PORT)
    if [ ! -z "$PID_CHECK" ]; then
        echo -e "${RED}❌ Failed to kill process $PID. Please check permissions.${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ Process killed successfully.${NC}"
    fi
else
    echo -e "${GREEN}✅ Port $PORT is free.${NC}"
fi

echo -e "${GREEN}🚀 Starting Next.js frontend...${NC}"
echo -e "${YELLOW}ℹ️  Press Ctrl+C to stop (Do NOT use Ctrl+Z)${NC}"

# Execute npm run dev
npm run dev
