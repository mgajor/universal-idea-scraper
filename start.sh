#!/bin/bash
# ==============================================================
# Reddit Ops Console - Startup Script
# ==============================================================
# This script starts both the backend and frontend servers.
# Run from the project root directory.
#
# Usage:
#   ./start.sh           # Start both servers
#   ./start.sh backend   # Start backend only
#   ./start.sh frontend  # Start frontend only
#   ./start.sh stop      # Stop all servers
# ==============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/apps/backend"
FRONTEND_DIR="$PROJECT_ROOT/apps/frontend"

print_header() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║           🚀 Reddit Ops Console Startup                   ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_postgres() {
    echo -e "${YELLOW}Checking PostgreSQL connection...${NC}"
    if command -v docker &> /dev/null; then
        if docker ps | grep -q "reddit-ops-db"; then
            echo -e "${GREEN}✅ PostgreSQL container running${NC}"
            return 0
        fi
    fi
    
    # Try connecting to localhost
    if nc -z localhost 5432 2>/dev/null; then
        echo -e "${GREEN}✅ PostgreSQL available on localhost:5432${NC}"
        return 0
    fi
    
    echo -e "${RED}❌ PostgreSQL not found. Start with:${NC}"
    echo "   docker run -d --name reddit-ops-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres123 -e POSTGRES_DB=reddit_ops -p 5432:5432 postgres:14"
    return 1
}

start_backend() {
    echo -e "\n${YELLOW}Starting Backend...${NC}"
    
    cd "$BACKEND_DIR"
    
    # Check if venv exists
    if [ ! -d ".venv" ]; then
        echo -e "${YELLOW}Creating virtual environment...${NC}"
        python3 -m venv .venv
        source .venv/bin/activate
        pip install -r requirements.txt
    else
        source .venv/bin/activate
    fi
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        echo -e "${RED}❌ .env file not found in apps/backend/${NC}"
        echo "   Copy .env.example to apps/backend/.env and configure"
        exit 1
    fi
    
    echo -e "${GREEN}Starting backend on http://localhost:8000${NC}"
    .venv/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
    
    # Wait for backend to start
    sleep 3
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is healthy${NC}"
    else
        echo -e "${YELLOW}⏳ Backend still starting...${NC}"
    fi
}

start_frontend() {
    echo -e "\n${YELLOW}Starting Frontend...${NC}"
    
    cd "$FRONTEND_DIR"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing frontend dependencies...${NC}"
        npm install
    fi
    
    echo -e "${GREEN}Starting frontend on http://localhost:3000${NC}"
    npm run dev &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"
}

stop_servers() {
    echo -e "${YELLOW}Stopping servers...${NC}"
    
    # Kill backend
    lsof -ti :8000 | xargs kill -9 2>/dev/null || true
    
    # Kill frontend
    lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    
    # Kill any uvicorn/python processes
    pkill -f "uvicorn main:app" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    
    echo -e "${GREEN}✅ Servers stopped${NC}"
}

# Main
print_header

case "${1:-all}" in
    backend)
        check_postgres && start_backend
        wait
        ;;
    frontend)
        start_frontend
        wait
        ;;
    stop)
        stop_servers
        ;;
    all|*)
        check_postgres
        start_backend
        start_frontend
        
        echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║  🎉 Application Started!                                   ║${NC}"
        echo -e "${GREEN}║                                                            ║${NC}"
        echo -e "${GREEN}║  Backend:   http://localhost:8000                          ║${NC}"
        echo -e "${GREEN}║  Frontend:  http://localhost:3000                          ║${NC}"
        echo -e "${GREEN}║  API Docs:  http://localhost:8000/docs                     ║${NC}"
        echo -e "${GREEN}║                                                            ║${NC}"
        echo -e "${GREEN}║  Press Ctrl+C to stop all servers                          ║${NC}"
        echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
        
        # Wait for processes
        wait
        ;;
esac
