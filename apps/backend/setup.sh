#!/bin/bash
# Backend Setup Script
# Run this from the apps/backend directory

set -e

echo "=== Reddit Scraper v2 - Backend Setup ==="
echo ""

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1)
echo "Python version: $PYTHON_VERSION"

# Create virtual environment if not exists
if [ ! -d ".venv" ]; then
    echo ""
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo ""
echo "Activating virtual environment..."
source .venv/bin/activate

# Install dependencies
echo ""
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    echo ""
    echo "WARNING: .env file not found!"
    echo "Please create .env with your configuration (DATABASE_URL, APIFY_API_TOKEN, etc.)"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To start the backend:"
echo "  source .venv/bin/activate"
echo "  uvicorn main:app --reload"
echo ""
