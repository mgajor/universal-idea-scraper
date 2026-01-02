# Reddit Ops Console - Development Commands
# Usage: make <command>

.PHONY: dev dev-backend dev-frontend install install-backend install-frontend \
        build test lint format clean up down logs

# === DEVELOPMENT ===

# Start everything in dev mode
dev:
	@echo "🚀 Starting Reddit Ops Console..."
	@make -j2 dev-backend dev-frontend

# Start backend only (FastAPI + hot reload)
dev-backend:
	@echo "🔧 Starting backend on http://localhost:8000"
	cd apps/backend && python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Start frontend only (Next.js + hot reload)
dev-frontend:
	@echo "🎨 Starting frontend on http://localhost:3000"
	cd apps/frontend && npm run dev

# === INSTALLATION ===

# Install all dependencies
install: install-backend install-frontend
	@echo "✅ All dependencies installed"

# Install backend dependencies
install-backend:
	@echo "📦 Installing backend dependencies..."
	cd apps/backend && pip install -r requirements.txt

# Install frontend dependencies
install-frontend:
	@echo "📦 Installing frontend dependencies..."
	cd apps/frontend && npm install

# === DATABASE ===

# Initialize database
db-init:
	@echo "🗃️ Initializing database..."
	cd apps/backend && python -c "import asyncio; from db import init_db; asyncio.run(init_db())"

# === DOCKER ===

# Build containers
build:
	@echo "🏗️ Building containers..."
	docker-compose build

# Start containers (production)
up:
	@echo "🚀 Starting containers..."
	docker-compose up -d
	@echo "✅ Backend: http://localhost:8000"
	@echo "✅ Frontend: http://localhost:3000"

# Stop containers
down:
	@echo "🛑 Stopping containers..."
	docker-compose down

# View logs
logs:
	docker-compose logs -f

# === QUALITY ===

# Run tests
test:
	@echo "🧪 Running tests..."
	cd apps/backend && pytest tests/ -v

# Lint code
lint:
	@echo "🔍 Linting code..."
	cd apps/backend && ruff check .
	cd apps/frontend && npm run lint

# Format code
format:
	@echo "✨ Formatting code..."
	cd apps/backend && ruff format .
	cd apps/frontend && npx prettier --write .

# === SCRIPTS ===

# Run original CLI scraper
scrape:
	@echo "📡 Running scraper (use: make scrape ARGS='<subreddit> --limit 100')"
	python main.py $(ARGS)

# Export database to parquet
export:
	@echo "📤 Exporting to parquet..."
	python main.py --maintenance export-parquet

# === CLEANUP ===

# Clean build artifacts
clean:
	@echo "🧹 Cleaning..."
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .next -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name node_modules -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "✅ Cleaned"

# === HELP ===

help:
	@echo "Reddit Ops Console - Available Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev            Start both backend and frontend"
	@echo "  make dev-backend    Start backend only"
	@echo "  make dev-frontend   Start frontend only"
	@echo ""
	@echo "Installation:"
	@echo "  make install        Install all dependencies"
	@echo ""
	@echo "Docker:"
	@echo "  make up             Start containers"
	@echo "  make down           Stop containers"
	@echo "  make logs           View logs"
	@echo ""
	@echo "Scripts:"
	@echo "  make scrape ARGS='' Run CLI scraper"
	@echo ""
