# Superpowers for GitLab Duo CLI

Complete guide for using Superpowers with [GitLab Duo CLI](https://docs.gitlab.com/user/gitlab_duo_cli/).

## Overview

Superpowers integrates with GitLab Duo CLI through the Model Context Protocol (MCP). Skills are exposed as MCP resources and prompts, making them available to the AI agent during your development workflow.

## Installation

### Quick Install

From the Superpowers repository root:

```bash
bash .gitlab-duo/install.sh
```

### Manual Installation

See [.gitlab-duo/INSTALL.md](./.INSTALL.md) for detailed manual installation steps.

## How It Works

The integration uses an MCP server that:

1. **Loads all Superpowers skills** from the `skills/` directory
2. **Exposes them as MCP resources** that GitLab Duo can read
3. **Provides a bootstrap resource** with the `using-superpowers` skill and tool mappings
4. **Offers skills as prompts** for easy activation

### Architecture

```
GitLab Duo CLI
    ↓ (reads MCP config)
~/.gitlab/duo/mcp.json
    ↓ (starts MCP server)
.gitlab-duo/mcp-server/src/index.js
    ↓ (loads skills)
skills/*/SKILL.md
    ↓ (exposes as)
MCP Resources & Prompts
```

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
