# Superpowers for GitLab Duo CLI

Complete guide for using Superpowers with [GitLab Duo CLI](https://docs.gitlab.com/user/gitlab_duo_cli/).

## Overview

Superpowers integrates with GitLab Duo CLI through the Model Context Protocol (MCP). Skills are exposed as MCP resources and prompts, making them available to the AI agent during your development workflow.

## Installation

### Quick Install (Recommended)

Install Superpowers in any project without cloning the repository.

**Unix (Linux/macOS):**
```bash
cd your-project
curl -sSL https://raw.githubusercontent.com/obra/superpowers/main/.gitlab-duo/install-universal.mjs | node
```

**Windows (PowerShell):**
```powershell
cd your-project
irm https://raw.githubusercontent.com/obra/superpowers/main/.gitlab-duo/install-universal.mjs | node
```

**What gets installed:**
- Skills in `./skills/` (editable, versionable)
- MCP server in `./.gitlab-duo/`
- GitLab Duo configured automatically
- Works on Windows, macOS, Linux

### Local Development Install

For Superpowers contributors, from the repository root:

```bash
bash .gitlab-duo/install.sh
```

### Manual Installation

See [.gitlab-duo/INSTALL.md](../.gitlab-duo/INSTALL.md) for detailed manual installation steps.

## How It Works

The integration uses an MCP server that:

1. **Loads all Superpowers skills** from the `skills/` directory
2. **Exposes them as MCP resources** that GitLab Duo can read
3. **Provides a bootstrap resource** with the `using-superpowers` skill and tool mappings
4. **Offers skills as prompts** for easy activation
5. **Detects capabilities** automatically during installation
6. **Provides tool adapters** for transparent tool name mapping

### Architecture

```
GitLab Duo CLI
    ↓ (reads MCP config)
~/.gitlab/duo/mcp.json
    ↓ (starts MCP server)
.gitlab-duo/mcp-server/src/index.js
    ↓ (loads skills + capabilities)
skills/*/SKILL.md + capabilities.json
    ↓ (exposes as)
MCP Resources & Prompts & Tools
```

## Phase 1 Improvements (2026-04-03)

### Auto-Bootstrap

The integration now makes initialization obvious and easy:

1. **Initialize prompt** - `initialize-superpowers` appears first in prompts list with 🚀 emoji
2. **Welcome resource** - Quick start guide at `superpowers://welcome`
3. **Enhanced bootstrap** - Includes capabilities summary and next steps

**Usage:**
```bash
duo
# Then ask: "What prompts are available?"
# Use: "Use initialize-superpowers prompt"
```

### Capability Detection

Automatically detects what GitLab Duo CLI supports:

1. **Detection script** - Runs during installation: `bash .gitlab-duo/detect-capabilities.sh`
2. **Capabilities resource** - View at `superpowers://capabilities`
3. **Smart fallback** - Uses `executing-plans` when subagents not available

**Check capabilities:**
```
Read superpowers://capabilities
```

**Re-detect manually:**
```bash
bash .gitlab-duo/detect-capabilities.sh
```

### Tool Adapter

Transparent tool name translation:

1. **MCP Tools** - `Read`, `Write`, `Edit`, `Bash` work directly in skills
2. **Manual mapping** - Clear instructions for other tools in bootstrap
3. **No modification needed** - Skills work as-is

**Example:**
```
# Skill says: "Use Read tool to check package.json"
# You can use: Read tool (MCP) or read_file (direct)
# Both work - the MCP tool translates automatically
```

## Phase 2 Improvements (2026-04-03)

### Post-Install Validation

Installation now validates compatibility automatically:

**During installation:**
```bash
bash .gitlab-duo/install.sh
# ...
✓ Validating installation...
✓ 14 skills loaded
✓ 7/8 tools available
✓ Installation validated

Compatibility report: .gitlab-duo/compatibility-report.md
```

**Review report:**
```bash
cat .gitlab-duo/compatibility-report.md
```

### Health Check Diagnostics

Quick system health check for troubleshooting:

**Check health:**
```
Read superpowers://diagnostics
```

**Shows:**
- System status (✅ Healthy / ⚠️ Warnings / ❌ Issues)
- Loaded skills (count and list)
- Available tools (MCP + GitLab Duo)
- Issues and recommendations
- Troubleshooting steps

### Interactive Quick Starts

Ready-to-use prompts for common workflows:

**Development workflows:**
- `quick-start-tdd` - Test-Driven Development
- `quick-start-debug` - Systematic debugging
- `quick-start-review` - Code review preparation

**GitLab workflows:**
- `quick-start-issue` - Work on GitLab issue
- `quick-start-mr` - Review merge request
- `quick-start-pipeline` - Debug failed pipeline

**Usage:**
```
# List all prompts
What prompts are available?

# Use a quick start
Use quick-start-tdd prompt with feature="user authentication"

# Or with GitLab URL
Use quick-start-issue prompt with issue_url="https://gitlab.com/group/project/-/issues/42"
```

## Phase 3 Improvements (2026-04-03)

### Universal Installation

Install Superpowers in any project without cloning the repository.

**One command (Unix):**
```bash
curl -sSL https://raw.githubusercontent.com/obra/superpowers/main/.gitlab-duo/install-universal.mjs | node
```

**One command (Windows):**
```powershell
irm https://raw.githubusercontent.com/obra/superpowers/main/.gitlab-duo/install-universal.mjs | node
```

**What it does:**
1. Downloads skills from GitHub → `./skills/`
2. Downloads MCP server → `./.gitlab-duo/mcp-server/`
3. Installs dependencies
4. Detects capabilities
5. Validates installation
6. Configures GitLab Duo
7. Updates `.gitignore`

**Result:**
- Skills in your project (editable, versionable)
- Ready to use immediately
- Works on Windows, macOS, Linux

### Project Structure

After installation:
```
your-project/
├── skills/                    # Superpowers skills (customize as needed)
│   ├── brainstorming/
│   ├── test-driven-development/
│   └── ... (14 skills)
├── .gitlab-duo/              # Infrastructure (auto-managed)
│   ├── mcp-server/
│   ├── capabilities.json
│   └── compatibility-report.md
└── .gitignore                # Updated automatically
```

### Customizing Skills

Skills are in your project - you can:
- Edit existing skills in `./skills/`
- Add new skills
- Remove unused skills
- Commit to your git repository

GitLab Duo Chat can help you edit skills in `./skills/`.

## Usage

### Starting a Session

```bash
duo
```

The MCP server starts automatically and loads all skills.

### Listing Available Skills

Ask GitLab Duo:
```
What Superpowers skills are available?
```

Or:
```
List all MCP resources from the superpowers server
```

### Using a Skill

**Method 1: Direct request**
```
Use the brainstorming skill to help me design a new authentication system
```

**Method 2: Read the resource**
```
Read the superpowers://skill/test-driven-development resource and follow it
```

**Method 3: Use as prompt**
```
Apply the systematic-debugging prompt to this issue
```

### Bootstrap Context

The bootstrap resource (`superpowers://bootstrap`) contains:
- Full `using-superpowers` skill content
- Tool mapping for GitLab Duo CLI
- Instructions for skill usage

This is automatically available but not automatically loaded. You can request it:
```
Read the superpowers://bootstrap resource
```

## Tool Mapping

GitLab Duo CLI uses different tool names than Claude Code. Here's the mapping:

| Skill Reference | GitLab Duo Equivalent |
|----------------|----------------------|
| `Skill` tool | MCP Resource read (e.g., "read superpowers://skill/brainstorming") |
| `Read` (file reading) | `read_file` |
| `Write` (file creation) | `create_file_with_contents` |
| `Edit` (file editing) | `edit_file` |
| `Bash` (run commands) | `run_command` |
| `Grep` (search file content) | `grep` |
| `Glob` (search files by name) | `find_files` |
| `TodoWrite` (task tracking) | Native task tracking or manual tracking |
| `Task` tool (dispatch subagent) | **Unknown** - needs verification |
| `WebSearch` | `gitlab_documentation_search` or web tools |
| `WebFetch` | Web fetch tools if available |

### Subagent Support

**Status: Unknown** - GitLab Duo CLI subagent support needs verification.

If subagents are **not supported**:
- Skills like `subagent-driven-development` and `dispatching-parallel-agents` will fall back to `executing-plans`
- Single-session execution with manual checkpoints

If subagents **are supported**:
- Full subagent-driven workflow available
- Parallel task execution possible

## Available Skills

### Core Workflow Skills

- **using-superpowers** - Introduction to the skills system (included in bootstrap)
- **brainstorming** - Design and spec creation before implementation
- **writing-plans** - Create detailed implementation plans
- **executing-plans** - Execute plans in batches with checkpoints

### Development Skills

- **test-driven-development** - RED-GREEN-REFACTOR TDD workflow
- **systematic-debugging** - 4-phase root cause debugging process
- **verification-before-completion** - Verify before claiming success

### Collaboration Skills

- **requesting-code-review** - Pre-review checklist
- **receiving-code-review** - Responding to feedback
- **using-git-worktrees** - Parallel development branches
- **finishing-a-development-branch** - Merge/PR decision workflow

### Advanced Skills

- **subagent-driven-development** - Fast iteration with subagents (if supported)
- **dispatching-parallel-agents** - Concurrent subagent workflows (if supported)
- **writing-skills** - Create new skills following best practices

## Configuration

### MCP Server Configuration

Location: `~/.gitlab/duo/mcp.json`

```json
{
  "mcpServers": {
    "superpowers": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/absolute/path/to/superpowers/.gitlab-duo/mcp-server/src/index.js"
      ],
      "env": {
        "SUPERPOWERS_SKILLS_DIR": "/absolute/path/to/superpowers/skills"
      }
    }
  }
}
```

### Environment Variables

- `SUPERPOWERS_SKILLS_DIR` - Path to skills directory (defaults to `../../skills` relative to MCP server)

## Troubleshooting

### MCP Server Not Loading

**Symptom:** Skills not available in GitLab Duo session

**Solutions:**

1. Check MCP configuration:
   ```bash
   cat ~/.gitlab/duo/mcp.json
   ```

2. Verify paths are absolute and correct

3. Test MCP server manually:
   ```bash
   node .gitlab-duo/mcp-server/src/index.js
   ```
   Should output: "Starting Superpowers MCP Server..." and "Loaded X skills"

4. Check GitLab Duo logs:
   ```bash
   duo --log-level debug
   ```

### Skills Not Appearing

**Symptom:** MCP server loads but skills aren't listed

**Solutions:**

1. Verify skills directory:
   ```bash
   ls -la skills/
   ```

2. Check for SKILL.md files:
   ```bash
   find skills -name "SKILL.md"
   ```

3. Check MCP server stderr output for errors

### Tool Not Found Errors

**Symptom:** Skill references a tool that doesn't exist in GitLab Duo

**Solutions:**

1. Check the tool mapping table above
2. Adapt the skill's instructions to use available tools
3. Some skills may need manual adaptation

### Path Issues After Moving Repository

**Symptom:** MCP server fails to start after moving Superpowers directory

**Solution:**

Update paths in `~/.gitlab/duo/mcp.json`:
```bash
# Re-run installation script
bash .gitlab-duo/install.sh
```

Or manually edit the config file with new absolute paths.

## Updating

To update Superpowers:

```bash
cd /path/to/superpowers
git pull
```

Skills are loaded fresh on each GitLab Duo session, so updates take effect immediately.

## Personal Skills

To add your own skills:

1. Create a skill directory in `skills/`:
   ```bash
   mkdir -p skills/my-custom-skill
   ```

2. Create `skills/my-custom-skill/SKILL.md`:
   ```markdown
   ---
   name: my-custom-skill
   description: Use when [condition] - [what it does]
   ---

   # My Custom Skill

   [Your skill content here]
   ```

3. Restart GitLab Duo - the new skill will be automatically loaded

## Differences from Other Platforms

### vs. Claude Code
- **Loading:** MCP resources instead of native `Skill` tool
- **Bootstrap:** Manual resource read instead of automatic SessionStart hook
- **Tools:** Different tool names (see mapping table)

### vs. Cursor
- Same as Claude Code differences

### vs. Codex
- **Loading:** MCP server instead of symlink discovery
- **Configuration:** JSON config instead of AGENTS.md
- **Tools:** Different tool names

### vs. OpenCode
- **Loading:** MCP server instead of plugin JavaScript
- **Bootstrap:** MCP resource instead of message transform hook
- **Tools:** Different tool names

## Known Limitations

1. **Bootstrap not automatic** - User must request bootstrap resource or skills manually
2. **Subagent support unknown** - Needs verification and testing
3. **Tool name differences** - Requires mental mapping or skill adaptation
4. **No SessionStart hook** - Can't inject context automatically at session start

## Future Improvements

Potential enhancements:

1. **Auto-bootstrap** - Investigate if GitLab Duo supports automatic context injection
2. **Subagent verification** - Test and document subagent capabilities
3. **Tool wrapper** - Create MCP tools that wrap GitLab Duo tools with Superpowers names
4. **Skill templates** - Pre-configured prompts for common workflows

## Getting Help

- **Superpowers Issues:** https://github.com/obra/superpowers/issues
- **GitLab Duo Docs:** https://docs.gitlab.com/user/gitlab_duo_cli/
- **MCP Specification:** https://modelcontextprotocol.io/

## Contributing

If you improve the GitLab Duo integration:

1. Test thoroughly with multiple skills
2. Document any platform-specific quirks
3. Consider contributing back to the main Superpowers repository

See [AGENTS.md](../AGENTS.md) for contribution guidelines.
