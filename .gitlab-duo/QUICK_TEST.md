# Quick Test Guide - Superpowers for GitLab Duo CLI

## Installation Complete! ✅

The Superpowers MCP server has been installed and configured.

## Quick Test (5 minutes)

### 1. Start GitLab Duo

```bash
duo
```

### 2. Verify MCP Server is Loaded

Ask GitLab Duo:
```
What MCP servers are connected?
```

Expected: Should mention "superpowers" server

### 3. List Available Skills

Ask:
```
List all MCP resources from the superpowers server
```

Expected: Should show 14+ skills including:
- superpowers://bootstrap
- superpowers://skill/brainstorming
- superpowers://skill/test-driven-development
- superpowers://skill/systematic-debugging
- etc.

### 4. Read Bootstrap Resource

Ask:
```
Read the superpowers://bootstrap resource
```

Expected: Should load the using-superpowers skill content plus tool mappings

### 5. Use a Skill

Try the brainstorming skill:
```
I want to build a simple todo list app. Use the brainstorming skill to help me design it.
```

Expected: Should:
1. Acknowledge the skill
2. Start asking clarifying questions
3. Follow the brainstorming workflow

## Troubleshooting

### Skills Not Appearing

**Check MCP configuration:**
```bash
cat ~/.gitlab/duo/mcp.json | grep -A 10 superpowers
```

Should show:
```json
"superpowers": {
  "type": "stdio",
  "command": "node",
  "args": [
    "/Users/pmaluf/Github/superpowers/.gitlab-duo/mcp-server/src/index.js"
  ],
  "env": {
    "SUPERPOWERS_SKILLS_DIR": "/Users/pmaluf/Github/superpowers/skills"
  }
}
```

**Test MCP server manually:**
```bash
node .gitlab-duo/mcp-server/src/index.js
```

Should output:
```
Starting Superpowers MCP Server...
Skills directory: /Users/pmaluf/Github/superpowers/skills
Loaded 14 skills from /Users/pmaluf/Github/superpowers/skills
Superpowers MCP Server running on stdio
```

Press Ctrl+C to exit.

### GitLab Duo Not Recognizing MCP Server

**Restart GitLab Duo:**
```bash
# Exit current session (Ctrl+D or type 'exit')
# Start new session
duo
```

**Check GitLab Duo logs:**
```bash
duo --log-level debug
```

Look for messages about MCP server initialization.

## Advanced Testing

### Test Subagent Support

Ask GitLab Duo:
```
Do you support dispatching subagents or creating parallel task execution?
```

This will help determine if skills like `subagent-driven-development` will work.

### Test Tool Availability

Ask:
```
What tools do you have available for file operations, code search, and task management?
```

Compare with the tool mapping in:
`skills/using-superpowers/references/gitlab-duo-tools.md`

### Test a Complete Workflow

Try a full TDD workflow:
```
I need to add a new feature to calculate the sum of an array. Use the test-driven-development skill to guide me through implementing this with proper TDD.
```

Expected workflow:
1. Write failing test first
2. Run test (should fail)
3. Write minimal implementation
4. Run test (should pass)
5. Refactor if needed

## What to Report

If you encounter issues, please note:

1. **What you asked GitLab Duo**
2. **What response you got**
3. **What you expected**
4. **Any error messages**
5. **GitLab Duo CLI version** (`duo --version`)
6. **Node.js version** (`node --version`)

## Next Steps

Once basic testing works:

1. **Try different skills:**
   - `systematic-debugging` - for debugging issues
   - `writing-plans` - for creating implementation plans
   - `using-git-worktrees` - for parallel development

2. **Customize for your workflow:**
   - Create personal skills in `skills/`
   - Adapt existing skills for GitLab Duo specifics

3. **Share feedback:**
   - What works well?
   - What needs improvement?
   - Any GitLab Duo-specific quirks?

## Documentation

- **Full guide:** `docs/README.gitlab-duo.md`
- **Installation:** `.gitlab-duo/INSTALL.md`
- **Tool mapping:** `skills/using-superpowers/references/gitlab-duo-tools.md`

## Success Criteria

✅ MCP server loads without errors
✅ Skills are listed as MCP resources
✅ Bootstrap resource can be read
✅ At least one skill works end-to-end
✅ Tool mappings are clear

Happy coding with Superpowers! 🚀
