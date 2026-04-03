export async function generateDiagnostics(healthChecker) {
  const health = await healthChecker.check();
  
  const statusEmoji = {
    'healthy': '✅',
    'warnings': '⚠️',
    'issues': '❌'
  };

  return `# Superpowers Diagnostics

Last checked: ${health.timestamp}
Status: ${statusEmoji[health.status]} ${health.status.toUpperCase()}

## System Health

${statusEmoji[health.status]} **Overall:** ${health.status}
✅ **MCP Server:** Running
✅ **Skills:** ${health.skills.total} loaded
✅ **Capabilities:** ${health.capabilities}
✅ **MCP Tools:** ${health.tools.mcp.length} available

## Skills Loaded

${health.skills.loaded.map((name, i) => `${i + 1}. ${name}`).join('\n')}

## Tools Available

**MCP Tools:**
${health.tools.mcp.map(t => `- ${t}`).join('\n')}

**GitLab Duo Tools:**
${health.tools.gitlab.map(t => `- ${t} ✅`).join('\n')}

${health.issues.length > 0 ? `## Issues

${health.issues.map(i => `⚠️ ${i}`).join('\n')}` : `## Issues

None detected ✅`}

## Recommendations

${health.recommendations.map(r => `- ${r}`).join('\n')}

## Troubleshooting

If you're having issues:

1. **Re-detect capabilities:**
   \`\`\`bash
   bash .gitlab-duo/detect-capabilities.sh
   \`\`\`

2. **Re-validate installation:**
   \`\`\`bash
   bash .gitlab-duo/install.sh
   \`\`\`

3. **Check compatibility report:**
   \`\`\`bash
   cat .gitlab-duo/compatibility-report.md
   \`\`\`

4. **View detailed capabilities:**
   \`\`\`
   Read superpowers://capabilities
   \`\`\`

## Quick Reference

- **List skills:** "What MCP resources are available?"
- **Initialize:** "Use initialize-superpowers prompt"
- **Quick starts:** "What prompts are available?" (look for 🧪 🐛 📝 emojis)
- **Documentation:** docs/README.gitlab-duo.md
`;
}
