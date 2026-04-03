export function generateBootstrap(usingSuperpowersSkill, capabilities) {
  const firstTimeSetup = `
## First Time Setup ✓

You're all set! Superpowers is loaded and ready.

**Capabilities detected:**
${capabilities ? capabilities.getSummary() : 'Run: bash .gitlab-duo/detect-capabilities.sh'}

**Resources available:**
- \`superpowers://welcome\` - Quick start guide
- \`superpowers://capabilities\` - Full capability report
- \`superpowers://skill/<name>\` - Individual skills

**Next:** Try "Use the brainstorming skill" or read superpowers://welcome
`;

  const toolMapping = generateToolMapping(capabilities);

  return `<EXTREMELY_IMPORTANT>
You have superpowers.

${firstTimeSetup}

**Below is the full content of your 'superpowers:using-superpowers' skill:**

${usingSuperpowersSkill.content}

${toolMapping}
</EXTREMELY_IMPORTANT>`;
}

function generateToolMapping(capabilities) {
  const subagentStatus = capabilities?.hasSubagentSupport() 
    ? 'Supported ✓' 
    : 'Not supported - use executing-plans skill';

  return `
## Tool Mapping for GitLab Duo CLI

**MCP Tools Available (use directly):**
- \`Read\` → automatically uses \`read_file\`
- \`Write\` → automatically uses \`create_file_with_contents\`
- \`Edit\` → automatically uses \`edit_file\`
- \`Bash\` → automatically uses \`run_command\`

**Example:**
When a skill says "Use Read tool to check package.json", you can:
1. Use the MCP tool: \`Read\` with path="package.json"
2. Or directly: \`read_file\` with file_path="package.json"

**Other Mappings (manual):**

| Skill Reference | GitLab Duo Equivalent |
|----------------|----------------------|
| \`Grep\` | \`grep\` |
| \`Glob\` | \`find_files\` |
| \`TodoWrite\` | Manual tracking or native GitLab Duo tasks |
| \`WebSearch\` | \`gitlab_documentation_search\` |

**Subagents:** ${subagentStatus}

**Note:** Some skills may reference tools not available in GitLab Duo. Adapt the workflow using available tools.
`;
}
