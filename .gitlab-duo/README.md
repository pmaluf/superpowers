# Superpowers for GitLab Duo CLI

This directory contains the MCP (Model Context Protocol) server integration for GitLab Duo CLI.

## Quick Start

```bash
bash install.sh
```

This will:
1. Install MCP server dependencies
2. Configure `~/.gitlab/duo/mcp.json`
3. Make Superpowers skills available in GitLab Duo

## What's Inside

- **`mcp-server/`** - MCP server implementation
  - `src/index.js` - Main server code
  - `src/capabilities-detector.js` - Capability detection module
  - `src/tool-adapter.js` - Tool name mapping
  - `src/resources/` - Resource generators (bootstrap, welcome, capabilities)
  - `package.json` - Dependencies
- **`install.sh`** - Automated installation script
- **`detect-capabilities.sh`** - Capability detection script
- **`INSTALL.md`** - Detailed installation and usage guide

## New in Phase 1 (2026-04-03)

**Auto-Bootstrap:**
- `initialize-superpowers` prompt appears first in prompts list
- `superpowers://welcome` resource for quick start
- Enhanced bootstrap with capabilities summary

**Capability Detection:**
- `detect-capabilities.sh` script detects GitLab Duo features
- `superpowers://capabilities` resource shows what's available
- Automatic fallback to `executing-plans` when subagents not supported

**Tool Adapter:**
- MCP tools (`Read`, `Write`, `Edit`, `Bash`) for transparent mapping
- Skills work without modification
- Clear instructions for manual tool mapping

## New in Phase 2 (2026-04-03)

**Post-Install Validation:**
- Automatic validation after installation
- `compatibility-report.md` generated with detailed status
- Clear warnings and recommendations

**Health Check Diagnostics:**
- `superpowers://diagnostics` resource for troubleshooting
- Shows system status, loaded skills, available tools
- Includes troubleshooting steps and quick reference

**Interactive Quick Starts:**
- 6 quick start prompts for common workflows
- Development: TDD, debugging, code review
- GitLab: issues, merge requests, pipelines
- Prompts appear in list with emojis for easy discovery

## Documentation

- **Installation Guide:** [INSTALL.md](./INSTALL.md)
- **Full Documentation:** [../docs/README.gitlab-duo.md](../docs/README.gitlab-duo.md)
- **Tool Mapping:** [../skills/using-superpowers/references/gitlab-duo-tools.md](../skills/using-superpowers/references/gitlab-duo-tools.md)

## How It Works

```
GitLab Duo CLI
    ↓
~/.gitlab/duo/mcp.json (configuration)
    ↓
mcp-server/src/index.js (MCP server)
    ↓
../skills/*/SKILL.md (skills)
    ↓
MCP Resources & Prompts
```

The MCP server:
1. Loads all skills from `../skills/`
2. Exposes them as MCP resources (e.g., `superpowers://skill/brainstorming`)
3. Provides a bootstrap resource with tool mappings
4. Offers skills as prompts for easy activation

## Usage

After installation, start GitLab Duo:

```bash
duo
```

Then ask:
```
What Superpowers skills are available?
```

Or use a skill directly:
```
Use the brainstorming skill to help me design a feature
```

## Requirements

- Node.js 18+
- GitLab Duo CLI installed
- Superpowers repository cloned

## Troubleshooting

See [INSTALL.md](./INSTALL.md#troubleshooting) for common issues and solutions.

## Contributing

Improvements to the GitLab Duo integration are welcome! See [../AGENTS.md](../AGENTS.md) for contribution guidelines.
