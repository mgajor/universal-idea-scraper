#!/bin/bash
# Health Check Watchdog for Reddit Ops Console Backend
# Monitors backend health and auto-restarts if unresponsive

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/apps/backend"
CHECK_INTERVAL=30  # Check every 30 seconds
TIMEOUT=5          # 5 second timeout for health check
MAX_FAILURES=3     # Restart after 3 consecutive failures

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

failure_count=0

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

check_health() {
    if curl -s -m $TIMEOUT http://localhost:8000/health > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

restart_backend() {
    log "${YELLOW}Restarting backend...${NC}"
    
    # Kill existing backend
    pkill -9 -f "uvicorn main:app" 2>/dev/null || true
    sleep 2
    
    # Find Python
    if [ -f "$SCRIPT_DIR/.venv/bin/python" ]; then
        PYTHON="$SCRIPT_DIR/.venv/bin/python"
    else
        PYTHON="python3"
    fi
    
    # Start backend
    cd "$BACKEND_DIR"
    export DATABASE_URL="postgresql+asyncpg://postgres:postgres123@localhost:5432/reddit_ops"
    $PYTHON -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload &
    
    sleep 5
    
    if check_health; then
        log "${GREEN}✓ Backend restarted successfully${NC}"
        return 0
    else
        log "${RED}✗ Backend failed to restart${NC}"
        return 1
    fi
}

log "${GREEN}Starting Health Check Watchdog${NC}"
log "Checking every ${CHECK_INTERVAL}s, timeout ${TIMEOUT}s, max failures: ${MAX_FAILURES}"

while true; do
    if check_health; then
        if [ $failure_count -gt 0 ]; then
            log "${GREEN}✓ Backend recovered (was failing)${NC}"
        fi
        failure_count=0
    else
        failure_count=$((failure_count + 1))
        log "${RED}✗ Health check failed (${failure_count}/${MAX_FAILURES})${NC}"
        
        if [ $failure_count -ge $MAX_FAILURES ]; then
            log "${YELLOW}Max failures reached, triggering restart...${NC}"
            restart_backend
            failure_count=0
        fi
    fi
    
    sleep $CHECK_INTERVAL
done
