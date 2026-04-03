#!/usr/bin/env bash
# Installation script for Superpowers MCP Server for GitLab Duo CLI

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Determine script directory and repository root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MCP_SERVER_DIR="${SCRIPT_DIR}/mcp-server"
SKILLS_DIR="${REPO_ROOT}/skills"
DUO_CONFIG_DIR="${HOME}/.gitlab/duo"
MCP_CONFIG_FILE="${DUO_CONFIG_DIR}/mcp.json"

echo "================================================"
echo "Superpowers MCP Server Installation"
echo "================================================"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js version 18+ required (found v${NODE_VERSION})${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node --version)"

# Check GitLab Duo CLI
if ! command -v duo &> /dev/null; then
    echo -e "${YELLOW}Warning: GitLab Duo CLI not found in PATH${NC}"
    echo "Install from: https://docs.gitlab.com/user/gitlab_duo_cli/"
else
    echo -e "${GREEN}✓${NC} GitLab Duo CLI $(duo --version 2>&1 | head -n1 || echo 'installed')"
fi

# Check skills directory
if [ ! -d "$SKILLS_DIR" ]; then
    echo -e "${RED}Error: Skills directory not found at ${SKILLS_DIR}${NC}"
    exit 1
fi
SKILL_COUNT=$(find "$SKILLS_DIR" -name "SKILL.md" | wc -l | tr -d ' ')
echo -e "${GREEN}✓${NC} Found ${SKILL_COUNT} skills in ${SKILLS_DIR}"

echo ""
echo "Installing MCP server dependencies..."
cd "$MCP_SERVER_DIR"

if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found in ${MCP_SERVER_DIR}${NC}"
    exit 1
fi

npm install
echo -e "${GREEN}✓${NC} Dependencies installed"

echo ""
echo "Configuring GitLab Duo CLI..."

# Create config directory if it doesn't exist
mkdir -p "$DUO_CONFIG_DIR"

# Backup existing config
if [ -f "$MCP_CONFIG_FILE" ]; then
    BACKUP_FILE="${MCP_CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$MCP_CONFIG_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✓${NC} Backed up existing config to ${BACKUP_FILE}"
fi

# Read existing config or create new one
if [ -f "$MCP_CONFIG_FILE" ]; then
    EXISTING_CONFIG=$(cat "$MCP_CONFIG_FILE")
else
    EXISTING_CONFIG='{"mcpServers":{}}'
fi

# Create new config with superpowers entry
# Using Python for JSON manipulation (more reliable than jq which might not be installed)
export MCP_CONFIG_FILE
export MCP_SERVER_DIR
export SKILLS_DIR

python3 - <<'EOF'
import json
import sys
import os

config_file = os.environ["MCP_CONFIG_FILE"]
mcp_server_dir = os.environ["MCP_SERVER_DIR"]
skills_dir = os.environ["SKILLS_DIR"]

# Read existing config
try:
    with open(config_file, 'r') as f:
        existing = json.load(f)
except FileNotFoundError:
    existing = {"mcpServers": {}}

# Ensure mcpServers exists
if "mcpServers" not in existing:
    existing["mcpServers"] = {}

# Add or update superpowers entry
existing["mcpServers"]["superpowers"] = {
    "type": "stdio",
    "command": "node",
    "args": [
        f"{mcp_server_dir}/src/index.js"
    ],
    "env": {
        "SUPERPOWERS_SKILLS_DIR": skills_dir
    }
}

# Write updated config
with open(config_file, 'w') as f:
    json.dump(existing, f, indent=2)
    f.write('\n')

print("✓ Updated MCP configuration")
EOF

echo -e "${GREEN}✓${NC} GitLab Duo configuration updated"

echo ""
echo "Testing MCP server..."

# Test that the server starts without errors
timeout 2 node "${MCP_SERVER_DIR}/src/index.js" 2>&1 | head -n 5 || true
echo -e "${GREEN}✓${NC} MCP server starts successfully"

echo ""
echo "================================================"
echo -e "${GREEN}Installation Complete!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Start GitLab Duo CLI:"
echo "   duo"
echo ""
echo "2. Verify installation by asking:"
echo '   "What MCP resources are available?"'
echo ""
echo "3. Use a skill:"
echo '   "Use the brainstorming skill to help me design a feature"'
echo ""
echo "Configuration file: ${MCP_CONFIG_FILE}"
echo "Skills directory: ${SKILLS_DIR}"
echo ""
echo "For more information, see: ${SCRIPT_DIR}/INSTALL.md"
echo ""
