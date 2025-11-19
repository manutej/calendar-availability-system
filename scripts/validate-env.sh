#!/bin/bash

# Environment Validation Script
# Checks all prerequisites and configuration before running the app

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0
SUCCESS=0

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Environment Validation${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Function to check command exists
check_command() {
    local cmd=$1
    local name=$2
    local min_version=$3
    
    if command -v $cmd &> /dev/null; then
        local version=$($cmd --version 2>&1 | head -n 1)
        echo -e "${GREEN}✓${NC} $name found: $version"
        ((SUCCESS++))
        return 0
    else
        echo -e "${RED}✗${NC} $name not found"
        ((ERRORS++))
        return 1
    fi
}

# Check Node.js
echo "Checking System Prerequisites..."
echo "-----------------------------------"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        echo -e "${GREEN}✓${NC} Node.js $(node -v)"
        ((SUCCESS++))
    else
        echo -e "${RED}✗${NC} Node.js version must be 18+. Current: $(node -v)"
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗${NC} Node.js not found"
    ((ERRORS++))
fi

# Check npm
check_command npm "npm"

# Check PostgreSQL
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version | awk '{print $3}' | cut -d'.' -f1)
    if [ "$PSQL_VERSION" -ge 14 ]; then
        echo -e "${GREEN}✓${NC} PostgreSQL $(psql --version | awk '{print $3}')"
        ((SUCCESS++))
    else
        echo -e "${YELLOW}⚠${NC} PostgreSQL version recommended: 14+. Current: $(psql --version | awk '{print $3}')"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}✗${NC} PostgreSQL not found"
    ((ERRORS++))
fi

# Check Git
check_command git "Git"

echo ""

# Check .env file
echo "Checking Configuration Files..."
echo "-----------------------------------"

if [ -f .env ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
    ((SUCCESS++))
    
    # Check required environment variables
    required_vars=(
        "DATABASE_URL"
        "DB_NAME"
        "DB_USER"
        "DB_PASSWORD"
        "GOOGLE_CLIENT_ID"
        "GOOGLE_CLIENT_SECRET"
        "GMAIL_MCP_SERVER_PATH"
        "CALENDAR_MCP_SERVER_PATH"
    )
    
    for var in "${required_vars[@]}"; do
        if grep -q "^$var=" .env && [ -n "$(grep "^$var=" .env | cut -d'=' -f2)" ]; then
            value=$(grep "^$var=" .env | cut -d'=' -f2)
            # Check if it's not a placeholder
            if [[ "$value" =~ ^(your_|/absolute/path) ]]; then
                echo -e "${YELLOW}⚠${NC} $var is set but looks like a placeholder"
                ((WARNINGS++))
            else
                echo -e "${GREEN}✓${NC} $var is configured"
                ((SUCCESS++))
            fi
        else
            echo -e "${RED}✗${NC} $var is missing or empty"
            ((ERRORS++))
        fi
    done
else
    echo -e "${RED}✗${NC} .env file not found"
    echo -e "   ${YELLOW}Run: cp .env.example .env${NC}"
    ((ERRORS++))
fi

echo ""

# Check node_modules
echo "Checking Dependencies..."
echo "-----------------------------------"

if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules directory exists"
    ((SUCCESS++))
else
    echo -e "${RED}✗${NC} node_modules not found"
    echo -e "   ${YELLOW}Run: npm install${NC}"
    ((ERRORS++))
fi

# Check package-lock.json
if [ -f "package-lock.json" ]; then
    echo -e "${GREEN}✓${NC} package-lock.json exists"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠${NC} package-lock.json not found"
    ((WARNINGS++))
fi

echo ""

# Check database connection
echo "Checking Database..."
echo "-----------------------------------"

if [ -f .env ]; then
    source .env
    
    if [ -n "$DB_NAME" ] && [ -n "$DB_USER" ]; then
        if PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -c "SELECT 1" &> /dev/null; then
            echo -e "${GREEN}✓${NC} Database connection successful"
            ((SUCCESS++))
            
            # Check tables exist
            TABLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
            
            if [ "$TABLE_COUNT" -ge 10 ]; then
                echo -e "${GREEN}✓${NC} Database schema initialized ($TABLE_COUNT tables)"
                ((SUCCESS++))
            elif [ "$TABLE_COUNT" -gt 0 ]; then
                echo -e "${YELLOW}⚠${NC} Some tables exist ($TABLE_COUNT) but expected 10"
                echo -e "   ${YELLOW}Run: psql -U $DB_USER -d $DB_NAME -f .specify/scripts/init-schema.sql${NC}"
                ((WARNINGS++))
            else
                echo -e "${RED}✗${NC} Database schema not initialized"
                echo -e "   ${YELLOW}Run: psql -U $DB_USER -d $DB_NAME -f .specify/scripts/init-schema.sql${NC}"
                ((ERRORS++))
            fi
        else
            echo -e "${RED}✗${NC} Cannot connect to database"
            echo -e "   ${YELLOW}Check: Database credentials in .env${NC}"
            echo -e "   ${YELLOW}Check: PostgreSQL is running${NC}"
            ((ERRORS++))
        fi
    else
        echo -e "${YELLOW}⚠${NC} Database credentials not configured"
        ((WARNINGS++))
    fi
fi

echo ""

# Check MCP servers
echo "Checking MCP Servers..."
echo "-----------------------------------"

if [ -f .env ]; then
    source .env
    
    if [ -n "$GMAIL_MCP_SERVER_PATH" ]; then
        if [ -f "$GMAIL_MCP_SERVER_PATH" ]; then
            echo -e "${GREEN}✓${NC} Gmail MCP Server found"
            ((SUCCESS++))
        else
            echo -e "${RED}✗${NC} Gmail MCP Server not found at: $GMAIL_MCP_SERVER_PATH"
            ((ERRORS++))
        fi
    else
        echo -e "${YELLOW}⚠${NC} GMAIL_MCP_SERVER_PATH not configured"
        ((WARNINGS++))
    fi
    
    if [ -n "$CALENDAR_MCP_SERVER_PATH" ]; then
        if [ -f "$CALENDAR_MCP_SERVER_PATH" ]; then
            echo -e "${GREEN}✓${NC} Calendar MCP Server found"
            ((SUCCESS++))
        else
            echo -e "${RED}✗${NC} Calendar MCP Server not found at: $CALENDAR_MCP_SERVER_PATH"
            ((ERRORS++))
        fi
    else
        echo -e "${YELLOW}⚠${NC} CALENDAR_MCP_SERVER_PATH not configured"
        ((WARNINGS++))
    fi
    
    # Check if paths are absolute
    if [[ "$GMAIL_MCP_SERVER_PATH" == ./* ]] || [[ "$GMAIL_MCP_SERVER_PATH" == ../* ]]; then
        echo -e "${YELLOW}⚠${NC} Gmail MCP path is relative, use absolute path"
        ((WARNINGS++))
    fi
    
    if [[ "$CALENDAR_MCP_SERVER_PATH" == ./* ]] || [[ "$CALENDAR_MCP_SERVER_PATH" == ../* ]]; then
        echo -e "${YELLOW}⚠${NC} Calendar MCP path is relative, use absolute path"
        ((WARNINGS++))
    fi
fi

echo ""

# Check build
echo "Checking Build..."
echo "-----------------------------------"

if [ -d "dist" ]; then
    echo -e "${GREEN}✓${NC} dist directory exists"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠${NC} dist directory not found"
    echo -e "   ${YELLOW}Run: npm run build${NC}"
    ((WARNINGS++))
fi

if [ -f "tsconfig.json" ]; then
    echo -e "${GREEN}✓${NC} tsconfig.json exists"
    ((SUCCESS++))
else
    echo -e "${RED}✗${NC} tsconfig.json not found"
    ((ERRORS++))
fi

echo ""

# Summary
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Validation Summary${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "${GREEN}✓ Success: $SUCCESS${NC}"
echo -e "${YELLOW}⚠ Warnings: $WARNINGS${NC}"
echo -e "${RED}✗ Errors: $ERRORS${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! System is ready.${NC}"
    echo -e ""
    echo -e "You can now run:"
    echo -e "  ${BLUE}npm run dev${NC}    - Start development server"
    echo -e "  ${BLUE}npm test${NC}       - Run tests"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Some warnings found, but system should work.${NC}"
    echo -e ""
    echo -e "You can now run:"
    echo -e "  ${BLUE}npm run dev${NC}    - Start development server"
    echo -e "  ${BLUE}npm test${NC}       - Run tests"
    exit 0
else
    echo -e "${RED}❌ Critical errors found. Please fix them before running.${NC}"
    echo -e ""
    echo -e "For help, see:"
    echo -e "  ${BLUE}SETUP.md${NC}       - Complete setup guide"
    echo -e "  ${BLUE}QUICK-START.md${NC} - Quick troubleshooting"
    exit 1
fi
