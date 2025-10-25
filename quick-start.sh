#!/bin/bash

# Quick Start Script for MessageReader Docker Deployment
# Usage: chmod +x quick-start.sh && ./quick-start.sh

set -e

echo "======================================"
echo "MessageReader - Quick Start"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

if ! command -v nginx &> /dev/null; then
    echo -e "${RED}❌ Nginx is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites installed${NC}"
echo ""

# Check environment file
echo "📝 Checking environment file..."
if [ ! -f ".env.production" ]; then
    if [ ! -f "/var/messagereader/env/.env.production" ]; then
        echo -e "${YELLOW}⚠ Creating .env.production from example${NC}"
        cp .env.production.example .env.production
        echo -e "${RED}❌ Please edit .env.production with your actual values${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Environment file exists${NC}"
echo ""

# Load environment variables
if [ -f "/var/messagereader/env/.env.production" ]; then
    export $(cat /var/messagereader/env/.env.production | grep -v '^#' | xargs)
fi

# Build images
echo "🔨 Building Docker images..."
if sudo docker-compose build; then
    echo -e "${GREEN}✓ Images built successfully${NC}"
else
    echo -e "${RED}❌ Failed to build images${NC}"
    exit 1
fi
echo ""

# Start containers
echo "🚀 Starting containers..."
if sudo docker-compose up -d; then
    echo -e "${GREEN}✓ Containers started${NC}"
else
    echo -e "${RED}❌ Failed to start containers${NC}"
    exit 1
fi
echo ""

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check status
echo "📊 Container status:"
sudo docker-compose ps
echo ""

# Test endpoints
echo "🧪 Testing endpoints..."

if curl -s http://localhost:4000/api/health > /dev/null; then
    echo -e "${GREEN}✓ Backend API responding${NC}"
else
    echo -e "${YELLOW}⚠ Backend API not ready yet${NC}"
fi

if curl -s http://localhost:3001/ > /dev/null; then
    echo -e "${GREEN}✓ Frontend responding${NC}"
else
    echo -e "${YELLOW}⚠ Frontend not ready yet${NC}"
fi

echo ""
echo "======================================"
echo -e "${GREEN}✓ Deployment complete!${NC}"
echo "======================================"
echo ""
echo "📍 Access your app at:"
echo "   Frontend: https://cloudjeans-admin.ddns.net/"
echo "   Backend:  https://cloudjeans-admin.ddns.net/api/"
echo ""
echo "📋 Useful commands:"
echo "   - View logs:              docker-compose logs -f"
echo "   - View backend logs:      docker-compose logs -f backend"
echo "   - View frontend logs:     docker-compose logs -f frontend"
echo "   - Stop containers:        docker-compose down"
echo "   - Restart:                docker-compose restart"
echo "   - Container status:       docker-compose ps"
echo ""
