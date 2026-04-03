# GitLab Duo CLI Tool Mapping

Skills use Claude Code tool names. When you encounter these in a skill, use your platform equivalent:

| Skill references | GitLab Duo CLI equivalent |
|-----------------|--------------------------|
| `Read` (file reading) | `read_file` |
| `Write` (file creation) | `create_file_with_contents` |
| `Edit` (file editing) | `edit_file` |
| `Bash` (run commands) | `run_command` |
| `Grep` (search file content) | `grep` |
| `Glob` (search files by name) | `find_files` |
| `Skill` tool (invoke a skill) | MCP Resource read (e.g., "read superpowers://skill/brainstorming") |
| `TodoWrite` (task tracking) | Native task tracking or manual tracking |
| `Task` tool (dispatch subagent) | **Unknown** - verify if GitLab Duo supports subagents |
| `WebSearch` | `gitlab_documentation_search` or available web search tools |
| `WebFetch` | Web fetch tools if available |
| `EnterPlanMode` / `ExitPlanMode` | No equivalent - stay in main session |

## Subagent Support

**Status: Needs Verification**

GitLab Duo CLI's subagent support is currently unknown. To verify:

1. Start a GitLab Duo session
2. Ask: "Do you support dispatching subagents or parallel task execution?"
3. Try: "Create a subagent to test this feature"

**If subagents are NOT supported:**
- Skills like `subagent-driven-development` and `dispatching-parallel-agents` will fall back to `executing-plans`
- Use single-session execution with manual checkpoints
- The agent will work through tasks sequentially in the same session

**If subagents ARE supported:**
- Document the tool/command used to dispatch subagents
- Update this mapping with the correct syntax
- Full subagent-driven workflow becomes available

## MCP-Specific Tools

GitLab Duo CLI uses MCP (Model Context Protocol) for extensions:

| Tool | Purpose |
|------|---------|
| List MCP resources | See available Superpowers skills |
| Read MCP resource | Load a specific skill (e.g., `superpowers://skill/brainstorming`) |
| Get MCP prompt | Activate a skill as a prompt template |

## GitLab-Specific Tools

GitLab Duo CLI may have specialized tools for GitLab integration:

| Tool | Purpose |
|------|---------|
| `gitlab_documentation_search` | Search GitLab documentation |
| GitLab API tools | Interact with GitLab issues, MRs, pipelines |
| Repository tools | GitLab-specific repository operations |

**Note:** Exact tool names may vary. Use GitLab Duo's help or tool listing to discover available tools.

## Tool Discovery

To see all available tools in GitLab Duo CLI:

```
What tools do you have available?
```

Or:

```
List all your capabilities and tools
```

## Adapting Skills

When a skill references a tool you don't have:

1. **Check the mapping above** for the equivalent
2. **Ask GitLab Duo** if unsure: "What's the equivalent of the Claude Code 'Skill' tool?"
3. **Adapt the workflow** using available tools
4. **Document differences** for future reference

## Example Adaptations

### Using a Skill (Claude Code vs GitLab Duo)

**Claude Code:**
```
Use the Skill tool to load superpowers:brainstorming
```

**GitLab Duo:**
```
Read the MCP resource superpowers://skill/brainstorming and follow its instructions
```

### File Operations

**Claude Code:**
```
Use the Edit tool to update src/app.js
```

**GitLab Duo:**
```
Use edit_file to update src/app.js
```

### Task Tracking

**Claude Code:**
```
Use TodoWrite to create a task: "Implement authentication"
```

**GitLab Duo:**
```
Create a task: "Implement authentication" (using native task tracking)
```

Or manually track in a file:
```
Add to TODO.md: "- [ ] Implement authentication"
```

## Platform Differences

### Bootstrap Loading

**Claude Code:** Automatic via SessionStart hook

**GitLab Duo:** Manual - request the bootstrap resource:
```
Read the superpowers://bootstrap resource
```

### Skill Discovery

**Claude Code:** Native skill system with auto-discovery

**GitLab Duo:** MCP resources - list with:
```
What MCP resources are available from the superpowers server?
```

### Subagent Dispatch

**Claude Code:** `Task` tool with agent types

**GitLab Duo:** **Unknown** - needs verification

## Reporting Issues

If you find tool incompatibilities or discover GitLab Duo-specific tools:

1. Document the tool name and behavior
2. Test with multiple skills
3. Consider contributing to the Superpowers repository

See [docs/README.gitlab-duo.md](../../docs/README.gitlab-duo.md) for more information.
