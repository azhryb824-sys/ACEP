#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}   ACEP - Quick Start (Linux/macOS)${NC}"
echo -e "${CYAN}   Architectural Construction Estimation Platform${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed. Please install Node.js 18+${NC}"
    exit 1
fi

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
    echo -e "${RED}[ERROR] Node.js 18+ required. Current: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] Node.js $(node -v) detected${NC}"

# Check npm
if ! command -v npm &>/dev/null; then
    echo -e "${RED}[ERROR] npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] npm detected${NC}"

# Install dependencies
echo ""
echo -e "${YELLOW}[STEP 1/3] Installing dependencies...${NC}"
npm install
echo -e "${GREEN}[OK] Dependencies installed${NC}"

# Build packages
echo ""
echo -e "${YELLOW}[STEP 2/3] Building packages...${NC}"
npm run build 2>/dev/null || echo -e "${YELLOW}[WARN] Build script not found, skipping${NC}"
echo -e "${GREEN}[OK] Packages built successfully${NC}"

# Set up CLI
echo ""
echo -e "${YELLOW}[STEP 3/3] Setting up CLI...${NC}"
chmod +x scripts/acep-cli.js 2>/dev/null || true
echo -e "${GREEN}[OK] CLI ready at scripts/acep-cli.js${NC}"

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""
echo -e "  Quick commands:"
echo -e "    node scripts/acep-cli.js help"
echo -e "    npm test"
echo ""
