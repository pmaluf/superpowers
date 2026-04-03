#!/usr/bin/env bash
# Test script for Superpowers MCP Server

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MCP_SERVER="${SCRIPT_DIR}/mcp-server/src/index.js"

echo "Testing Superpowers MCP Server..."
echo ""

# Test 1: Check if server file exists
echo "Test 1: Server file exists"
if [ -f "$MCP_SERVER" ]; then
    echo "✓ PASS: Server file found at $MCP_SERVER"
else
    echo "✗ FAIL: Server file not found"
    exit 1
fi
echo ""

# Test 2: Check if dependencies are installed
echo "Test 2: Dependencies installed"
if [ -d "$SCRIPT_DIR/mcp-server/node_modules" ]; then
    echo "✓ PASS: node_modules directory exists"
else
    echo "✗ FAIL: Dependencies not installed. Run: cd mcp-server && npm install"
    exit 1
fi
echo ""

# Test 3: Check if server starts without errors
echo "Test 3: Server starts without errors"
timeout 2 node "$MCP_SERVER" 2>&1 | head -n 10 > /tmp/mcp-test.log || true

if grep -q "Starting Superpowers MCP Server" /tmp/mcp-test.log; then
    echo "✓ PASS: Server starts successfully"
    SKILL_COUNT=$(grep "Loaded.*skills" /tmp/mcp-test.log | grep -o '[0-9]\+' | head -n1)
    if [ -n "$SKILL_COUNT" ]; then
        echo "  Found $SKILL_COUNT skills"
    fi
else
    echo "✗ FAIL: Server did not start properly"
    echo "Server output:"
    cat /tmp/mcp-test.log
    exit 1
fi
echo ""

# Test 4: Check GitLab Duo configuration
echo "Test 4: GitLab Duo configuration"
DUO_CONFIG="$HOME/.gitlab/duo/mcp.json"
if [ -f "$DUO_CONFIG" ]; then
    if grep -q "superpowers" "$DUO_CONFIG"; then
        echo "✓ PASS: Superpowers entry found in $DUO_CONFIG"
    else
        echo "⚠ WARNING: Superpowers entry not found in $DUO_CONFIG"
        echo "  Run: bash $SCRIPT_DIR/install.sh"
    fi
else
    echo "⚠ WARNING: GitLab Duo config not found at $DUO_CONFIG"
    echo "  Run: bash $SCRIPT_DIR/install.sh"
fi
echo ""

# Test 5: Check skills directory
echo "Test 5: Skills directory"
SKILLS_DIR="$SCRIPT_DIR/../skills"
if [ -d "$SKILLS_DIR" ]; then
    SKILL_COUNT=$(find "$SKILLS_DIR" -name "SKILL.md" | wc -l | tr -d ' ')
    echo "✓ PASS: Skills directory found with $SKILL_COUNT skills"
else
    echo "✗ FAIL: Skills directory not found at $SKILLS_DIR"
    exit 1
fi
echo ""

# Cleanup
rm -f /tmp/mcp-test.log

echo "================================================"
echo "All tests passed!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. If not already done, run: bash $SCRIPT_DIR/install.sh"
echo "2. Start GitLab Duo: duo"
echo "3. Test: 'What MCP resources are available?'"
echo ""
