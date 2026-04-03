export function generateCapabilities(detector) {
  const report = detector.getDetailedReport();
  const subagentStatus = report.subagents ? '✅ Supported' : '❌ Not Supported';
  const fallbackNote = !report.subagents ? `

**Skills affected:**
- \`subagent-driven-development\` → Falls back to \`executing-plans\`
- \`dispatching-parallel-agents\` → Falls back to \`executing-plans\`

**What this means:**
Instead of dispatching independent subagents for parallel work, the agent will execute tasks sequentially in the current session with manual checkpoints.
` : '';

  return `# GitLab Duo CLI Capabilities

Last detected: ${report.detectedAt || 'Never (run detect-capabilities.sh)'}
GitLab Duo version: ${report.version || 'Unknown'}

## Subagent Support

${subagentStatus}
${fallbackNote}

## Available Tools

${report.available.join('\n')}

${report.unavailable.length > 0 ? `## Unavailable Tools

${report.unavailable.join('\n')}` : ''}

## Recommendations

${!report.subagents ? '- Use \`executing-plans\` skill for multi-task workflows instead of \`subagent-driven-development\`' : '- Full subagent support available - use \`subagent-driven-development\` for optimal workflow'}
- All file operation skills work normally
${detector.hasTool('gitlab_documentation_search') ? '- GitLab-specific documentation search available' : ''}

## Update Capabilities

To re-detect capabilities:
\`\`\`bash
bash .gitlab-duo/detect-capabilities.sh
\`\`\`

Then restart your GitLab Duo session to load updated capabilities.
`;
}
