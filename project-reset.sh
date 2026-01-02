#!/bin/bash
# project-reset.sh - Kill all project processes
# Run this if everything is stuck!

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "🧨 Nuking all project processes..."

# Kill Node (Frontend)
PID_FRONT=$(lsof -ti :3000)
if [ ! -z "$PID_FRONT" ]; then
    echo -e "${RED}Killing Frontend (PID $PID_FRONT)...${NC}"
    kill -9 $PID_FRONT
else
    echo -e "${GREEN}Frontend port 3000 is clean.${NC}"
fi

# Kill Python/Uvicorn (Backend)
PID_BACK=$(lsof -ti :8000)
if [ ! -z "$PID_BACK" ]; then
    echo -e "${RED}Killing Backend (PID $PID_BACK)...${NC}"
    kill -9 $PID_BACK
else
    echo -e "${GREEN}Backend port 8000 is clean.${NC}"
fi

echo -e "${GREEN}✅ All clean. You can now start fresh.${NC}"
echo "------------------------------------------------"
echo "To start properly:"
echo "1. Terminal 1: cd apps/backend && ./dev.sh"
echo "2. Terminal 2: cd apps/frontend && ./dev.sh"
