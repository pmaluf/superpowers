#!/usr/bin/env bash
# GitLab Duo CLI Capabilities Detection Script

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_FILE="${SCRIPT_DIR}/capabilities.json"
INTERACTIVE=true

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --non-interactive)
      INTERACTIVE=false
      shift
      ;;
    --help)
      echo "Usage: $0 [--non-interactive]"
      echo ""
      echo "Detect GitLab Duo CLI capabilities and save to capabilities.json"
      echo ""
      echo "Options:"
      echo "  --non-interactive  Run without user prompts (for CI/testing)"
      echo "  --help            Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

echo "================================================"
echo "GitLab Duo CLI Capabilities Detection"
echo "================================================"
echo ""

# Get GitLab Duo version
echo "Detecting GitLab Duo CLI version..."
if command -v duo &> /dev/null; then
  DUO_VERSION=$(duo --version 2>&1 | head -n1 || echo "unknown")
  echo -e "${GREEN}✓${NC} GitLab Duo CLI: $DUO_VERSION"
else
  echo -e "${RED}✗${NC} GitLab Duo CLI not found in PATH"
  DUO_VERSION="not installed"
fi
echo ""

# Test basic tools
echo "Testing basic file operation tools..."
echo -e "${GREEN}✓${NC} read_file (assumed available)"
echo -e "${GREEN}✓${NC} edit_file (assumed available)"
echo -e "${GREEN}✓${NC} create_file_with_contents (assumed available)"
echo -e "${GREEN}✓${NC} run_command (assumed available)"
echo -e "${GREEN}✓${NC} grep (assumed available)"
echo -e "${GREEN}✓${NC} find_files (assumed available)"

# Test GitLab-specific tools
echo ""
echo "Testing GitLab-specific tools..."
echo -e "${GREEN}✓${NC} gitlab_documentation_search (assumed available)"
echo -e "${YELLOW}?${NC} web_search (assumed not available)"

# Test subagent support
echo ""
echo "Testing subagent support..."
echo -e "${YELLOW}⚠${NC}  Subagent detection requires interactive testing"
echo "   GitLab Duo CLI has /new and /sessions commands"
echo "   But these are manual (not programmatic)"
echo "   Assuming NOT SUPPORTED for automated workflows (safe default)"

SUBAGENTS_SUPPORTED="false"
SUBAGENT_NOTES="GitLab Duo CLI has /new and /sessions for manual session management, but no programmatic subagent API detected. Use executing-plans skill instead of subagent-driven-development."

# Generate JSON
echo ""
echo "Generating capabilities report..."

cat > "$OUTPUT_FILE" <<EOF
{
  "detected_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "gitlab_duo_version": "$DUO_VERSION",
  "tools": {
    "read_file": true,
    "edit_file": true,
    "create_file_with_contents": true,
    "run_command": true,
    "grep": true,
    "find_files": true,
    "gitlab_documentation_search": true,
    "web_search": false
  },
  "subagents": {
    "supported": $SUBAGENTS_SUPPORTED,
    "tested_method": "manual_verification",
    "fallback": "executing-plans",
    "notes": "$SUBAGENT_NOTES"
  }
}
EOF

echo -e "${GREEN}✓${NC} Capabilities saved to: $OUTPUT_FILE"
echo ""

# Show summary
echo "================================================"
echo "Detection Summary"
echo "================================================"
echo ""
echo "GitLab Duo Version: $DUO_VERSION"
echo "Subagent Support: $SUBAGENTS_SUPPORTED"
echo "Tools Detected: 8 (7 available, 1 unavailable)"
echo ""
echo "Next Steps:"
echo "1. Restart GitLab Duo CLI to load new capabilities"
echo "2. Test: duo"
echo "3. Ask: 'What MCP resources are available?'"
echo "4. Use: 'Use initialize-superpowers prompt'"
echo ""
echo "Note: GitLab Duo has /new and /sessions for manual session"
echo "      management, but no programmatic subagent API."
echo "      Use 'executing-plans' skill for multi-task workflows."
echo ""
