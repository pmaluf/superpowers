# Installing Superpowers for GitLab Duo CLI

Enable Superpowers skills in GitLab Duo CLI via MCP (Model Context Protocol).

## Prerequisites

- GitLab Duo CLI installed (`duo --version` should work)
- Node.js 18+ installed
- Git

## Quick Installation

Run this command from the Superpowers repository root:

```bash
bash .gitlab-duo/install.sh
```

This will:
1. Install MCP server dependencies
2. Update your `~/.gitlab/duo/mcp.json` configuration
3. Verify the installation

## Manual Installation

### 1. Install MCP Server Dependencies

```bash
cd .gitlab-duo/mcp-server
npm install
```

### 2. Update GitLab Duo Configuration

Add the Superpowers MCP server to your `~/.gitlab/duo/mcp.json`:

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

**Important:** Replace `/absolute/path/to/superpowers` with the actual path to your Superpowers installation.

### 3. Verify Installation

Start a new GitLab Duo session:

```bash
duo
```

Then ask:
```
What MCP resources are available?
```

You should see Superpowers skills listed.

## Usage

### Accessing Skills

Skills are available as MCP resources. To use a skill:

1. **List available skills:**
   ```
   List all available Superpowers skills
   ```

2. **Use a specific skill:**
   ```
   Use the brainstorming skill to help me design a new feature
   ```

3. **Read bootstrap context:**
   The bootstrap resource (`superpowers://bootstrap`) is automatically available and contains the `using-superpowers` skill content plus tool mappings.

### Available Skills

- **brainstorming** - Design and spec creation before implementation
- **test-driven-development** - RED-GREEN-REFACTOR TDD workflow
- **systematic-debugging** - 4-phase root cause debugging process
- **writing-plans** - Create detailed implementation plans
- **executing-plans** - Execute plans in batches with checkpoints
- **subagent-driven-development** - Fast iteration with subagents (if supported)
- **requesting-code-review** - Pre-review checklist
- **receiving-code-review** - Responding to feedback
- **using-git-worktrees** - Parallel development branches
- **finishing-a-development-branch** - Merge/PR decision workflow
- **verification-before-completion** - Verify before claiming success
- **dispatching-parallel-agents** - Concurrent subagent workflows (if supported)
- **writing-skills** - Create new skills

## Tool Mapping

GitLab Duo CLI uses different tool names than Claude Code. The MCP server automatically provides a mapping guide in the bootstrap resource.

| Superpowers Skill Reference | GitLab Duo Equivalent |
|----------------------------|----------------------|
| `Skill` tool | MCP Resource read |
| `Read` | `read_file` |
| `Write` | `create_file_with_contents` |
| `Edit` | `edit_file` |
| `Bash` | `run_command` |
| `Grep` | `grep` |
| `Glob` | `find_files` |

## Troubleshooting

### MCP Server Not Loading

1. **Check the configuration:**
   ```bash
   cat ~/.gitlab/duo/mcp.json
   ```
   Verify the `superpowers` entry exists and paths are correct.

2. **Test the MCP server directly:**
   ```bash
   node .gitlab-duo/mcp-server/src/index.js
   ```
   Should start without errors (will wait for stdio input).

3. **Check GitLab Duo logs:**
   Start Duo with debug logging:
   ```bash
   duo --log-level debug
   ```

### Skills Not Appearing

1. **Verify skills directory:**
   ```bash
   ls -la skills/
   ```
   Should show skill directories with SKILL.md files.

2. **Check MCP server logs:**
   The server logs to stderr. Look for "Loaded X skills" message.

### Path Issues

If you move the Superpowers repository, update the paths in `~/.gitlab/duo/mcp.json`:
- `args[0]` - path to `index.js`
- `env.SUPERPOWERS_SKILLS_DIR` - path to `skills/` directory

## Updating

To update Superpowers:

```bash
cd /path/to/superpowers
git pull
```

The MCP server will automatically load the updated skills on next Duo session.

## Uninstalling

1. Remove the `superpowers` entry from `~/.gitlab/duo/mcp.json`
2. Optionally delete the Superpowers repository

## Getting Help

- Report issues: https://github.com/obra/superpowers/issues
- Main documentation: https://github.com/obra/superpowers
- GitLab Duo docs: https://docs.gitlab.com/user/gitlab_duo_cli/
