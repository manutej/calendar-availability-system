#!/bin/bash
set -e

# Calendar Availability System - Automated Setup Script
# This script automates the setup process as much as possible

echo "========================================="
echo "Calendar Availability System - Setup"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo -n "Checking Node.js version... "
if ! command -v node &> /dev/null; then
    echo -e "${RED}FAILED${NC}"
    echo "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}FAILED${NC}"
    echo "Node.js version must be 18 or higher. Current: $(node -v)"
    exit 1
fi
echo -e "${GREEN}OK${NC} ($(node -v))"

# Check PostgreSQL
echo -n "Checking PostgreSQL... "
if ! command -v psql &> /dev/null; then
    echo -e "${RED}FAILED${NC}"
    echo "PostgreSQL is not installed. Please install PostgreSQL 14+ first."
    exit 1
fi
echo -e "${GREEN}OK${NC}"

# Check if .env exists
if [ -f .env ]; then
    echo -e "${YELLOW}WARNING:${NC} .env file already exists. Skipping creation."
else
    echo -n "Creating .env file from template... "
    cp .env.example .env
    echo -e "${GREEN}OK${NC}"
    echo -e "${YELLOW}IMPORTANT:${NC} Please edit .env file with your actual credentials!"
fi

# Install npm dependencies
echo "Installing npm dependencies..."
npm install
echo -e "${GREEN}Dependencies installed${NC}"

# Build TypeScript
echo "Building TypeScript..."
npm run build
echo -e "${GREEN}Build successful${NC}"

# Database setup
echo ""
echo "========================================="
echo "Database Setup"
echo "========================================="
echo ""
echo "Please enter PostgreSQL credentials for setup:"
read -p "Database name [calendar_availability]: " DB_NAME
DB_NAME=${DB_NAME:-calendar_availability}

read -p "Database user [calendar_user]: " DB_USER
DB_USER=${DB_USER:-calendar_user}

read -sp "Database password: " DB_PASSWORD
echo ""

read -p "PostgreSQL admin user [postgres]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-postgres}

# Create database and user
echo -n "Creating database and user... "
psql -U "$ADMIN_USER" postgres << SQL 2>/dev/null || true
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
SQL
echo -e "${GREEN}OK${NC}"

# Initialize schema
echo -n "Initializing database schema... "
if [ -f .specify/scripts/init-schema.sql ]; then
    PGPASSWORD=$DB_PASSWORD psql -U "$DB_USER" -d "$DB_NAME" -f .specify/scripts/init-schema.sql > /dev/null 2>&1
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "Schema file not found: .specify/scripts/init-schema.sql"
    exit 1
fi

# Update .env with database credentials
echo -n "Updating .env with database credentials... "
sed -i.bak "s|DB_NAME=.*|DB_NAME=$DB_NAME|" .env
sed -i.bak "s|DB_USER=.*|DB_USER=$DB_USER|" .env
sed -i.bak "s|DB_PASSWORD=.*|DB_PASSWORD=$DB_PASSWORD|" .env
sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME|" .env
rm .env.bak 2>/dev/null || true
echo -e "${GREEN}OK${NC}"

# Generate session secret
echo -n "Generating session secret... "
SESSION_SECRET=$(openssl rand -base64 32)
sed -i.bak "s|SESSION_SECRET=.*|SESSION_SECRET=$SESSION_SECRET|" .env
rm .env.bak 2>/dev/null || true
echo -e "${GREEN}OK${NC}"

# MCP Servers setup
echo ""
echo "========================================="
echo "MCP Servers Setup"
echo "========================================="
echo ""

mkdir -p mcp-servers
cd mcp-servers

# Gmail MCP Server
if [ ! -d "gmail-mcp-server" ]; then
    echo "Cloning Gmail MCP Server..."
    git clone https://github.com/devdattatalele/gmail-mcp-server.git
    cd gmail-mcp-server
    npm install
    npm run build
    cd ..
    echo -e "${GREEN}Gmail MCP Server installed${NC}"
else
    echo -e "${YELLOW}Gmail MCP Server already exists, skipping${NC}"
fi

# Calendar MCP Server
if [ ! -d "mcp-google-calendar" ]; then
    echo "Cloning Google Calendar MCP Server..."
    git clone https://github.com/guinacio/mcp-google-calendar.git
    cd mcp-google-calendar
    npm install
    npm run build
    cd ..
    echo -e "${GREEN}Calendar MCP Server installed${NC}"
else
    echo -e "${YELLOW}Calendar MCP Server already exists, skipping${NC}"
fi

cd ..

# Update MCP paths in .env
GMAIL_PATH=$(pwd)/mcp-servers/gmail-mcp-server/build/index.js
CALENDAR_PATH=$(pwd)/mcp-servers/mcp-google-calendar/build/index.js

sed -i.bak "s|GMAIL_MCP_SERVER_PATH=.*|GMAIL_MCP_SERVER_PATH=$GMAIL_PATH|" .env
sed -i.bak "s|CALENDAR_MCP_SERVER_PATH=.*|CALENDAR_MCP_SERVER_PATH=$CALENDAR_PATH|" .env
rm .env.bak 2>/dev/null || true

# Run tests
echo ""
echo "========================================="
echo "Running Tests"
echo "========================================="
echo ""
npm test

echo ""
echo "========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Set up Google Cloud OAuth credentials:"
echo "   - Visit: https://console.cloud.google.com/"
echo "   - Create project and enable Gmail + Calendar APIs"
echo "   - Create OAuth2 credentials"
echo "   - Update .env with GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
echo ""
echo "2. Start the server:"
echo "   npm run dev"
echo ""
echo "3. Visit http://localhost:3000/health to verify"
echo ""
echo "For detailed instructions, see SETUP.md"
echo ""
