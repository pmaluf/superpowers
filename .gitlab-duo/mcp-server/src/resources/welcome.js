export function generateWelcome() {
  return `# Welcome to Superpowers! 🚀

You now have access to a complete software development workflow system.

## Quick Start (3 steps)

1. **Initialize** - You're here! ✓
2. **Try a skill** - Ask: "Use the brainstorming skill to help me design a feature"
3. **Learn more** - Read: superpowers://bootstrap

## What's Available

- 14+ development skills (brainstorming, TDD, debugging, etc.)
- Automatic workflow guidance
- Tool mapping for GitLab Duo CLI

## Available Resources

- \`superpowers://bootstrap\` - Full introduction and tool mappings
- \`superpowers://capabilities\` - Detected GitLab Duo capabilities
- \`superpowers://skill/<name>\` - Individual skill content

## Need Help?

- List all skills: "What MCP resources are available?"
- Read a skill: "Read superpowers://skill/test-driven-development"
- Documentation: docs/README.gitlab-duo.md

## Troubleshooting

If skills don't work as expected:
1. Check capabilities: Read superpowers://capabilities
2. Run detection: bash .gitlab-duo/detect-capabilities.sh
3. See docs: .gitlab-duo/INSTALL.md
`;
}
