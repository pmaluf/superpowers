# 🚀 Superpowers for GitLab Duo - Quick Start

**Status:** ✅ Phase 1, 2 & 3 Complete

---

## What's New

### Phase 1 (2026-04-03)
- Easy initialization (initialize-superpowers prompt)
- Capability detection (superpowers://capabilities)
- Tool adapter (MCP tools work automatically)

### Phase 2 (2026-04-03)
- Post-install validation (compatibility-report.md)
- Health check diagnostics (superpowers://diagnostics)
- Interactive quick starts (6 workflow prompts)

### Phase 3 (2026-04-03)
- Universal installation (works in any project)
- Cross-platform support (Windows, macOS, Linux)
- Skills in project directory (customizable)

---

## How to Use

### First Time Setup

**In any project (recommended):**

```bash
# Unix (Linux/macOS)
curl -sSL https://raw.githubusercontent.com/obra/superpowers/main/.gitlab-duo/install-universal.mjs | node

# Windows (PowerShell)
irm https://raw.githubusercontent.com/obra/superpowers/main/.gitlab-duo/install-universal.mjs | node
```

**For local development:**

```bash
# From Superpowers repository
bash .gitlab-duo/install.sh
```

### Start Using

```bash
duo
```

Then:
```
What prompts are available?
```

You'll see:
```
1. 🚀 initialize-superpowers (start here!)
2. 🧪 quick-start-tdd
3. 🐛 quick-start-debug
4. 👀 quick-start-review
5. 📝 quick-start-issue
6. 🔀 quick-start-mr
7. 🚀 quick-start-pipeline
... (then skills)
```

Use it:
```
Use initialize-superpowers prompt
```

### Quick Starts (NEW in Phase 2!)

**Development workflows:**
```
Use quick-start-tdd prompt with feature="user login"
Use quick-start-debug prompt with issue="timeout error"
Use quick-start-review prompt
```

**GitLab workflows:**
```
Use quick-start-issue prompt with issue_url="https://gitlab.com/..."
Use quick-start-mr prompt with mr_url="https://gitlab.com/..."
Use quick-start-pipeline prompt with pipeline_url="https://gitlab.com/..."
```

### Health Check (NEW in Phase 2!)

```
Read superpowers://diagnostics
```

Shows:
- System status
- Loaded skills
- Available tools
- Issues and recommendations

### Check Capabilities

```
Read superpowers://capabilities
```

Shows:
- Subagent support: ❌ Not Supported (use `executing-plans`)
- Available tools: ✅ read_file, edit_file, etc.
- Recommendations for your workflow

### Use Skills Normally

```
Use the brainstorming skill to help me design a feature
```

Skills now:
- ✅ Use MCP tools automatically
- ✅ Know about GitLab Duo capabilities
- ✅ Provide clear fallback guidance

---

## Files You Care About

### Phase 1
- `superpowers://welcome` - Quick start guide
- `superpowers://capabilities` - What's available
- `superpowers://bootstrap` - Full introduction

### Phase 2 (NEW!)
- `superpowers://diagnostics` - Health check
- `compatibility-report.md` - Post-install validation
- Quick start prompts (6 workflows)

---

## Testing Checklists

**Phase 1:** `.gitlab-duo/TESTING.md`  
**Phase 2:** `.gitlab-duo/TESTING-PHASE2.md`

**Quick Tests:**
1. ✅ Initialize prompt appears first
2. ✅ Capabilities resource works
3. ✅ Diagnostics resource works (NEW!)
4. ✅ Quick starts available (NEW!)
5. ✅ MCP tools work
6. ✅ Skills work normally

---

## What Changed

### Before Phase 1
```
duo
> "Read superpowers://bootstrap"  # Had to know this
> [Skills reference Claude Code tools]  # Mental translation needed
> [No idea if subagents work]  # Unclear
```

### After Phase 1 & 2
```
duo
> "What prompts are available?"
  🚀 initialize-superpowers (start here!)  # Obvious!
  🧪 quick-start-tdd                       # NEW!
  🐛 quick-start-debug                     # NEW!
  ... (6 quick starts total)
> "Use initialize-superpowers prompt"
  # Gets everything automatically
> "Read superpowers://capabilities"
  # Clear info: Subagents: No, Tools: 7/8
> "Read superpowers://diagnostics"         # NEW!
  # Health check: Status, skills, tools
> Skills use Read/Write/Edit/Bash
  # MCP tools translate automatically
> "Use quick-start-tdd prompt with feature='login'"  # NEW!
  # Guided TDD workflow starts immediately
```

---

## Files You Care About

### Phase 1
- `superpowers://welcome` - Quick start guide
- `superpowers://capabilities` - What's available
- `superpowers://bootstrap` - Full introduction
- `.gitlab-duo/TESTING.md` - Phase 1 testing checklist

### Phase 2 (NEW!)
- `superpowers://diagnostics` - Health check
- `compatibility-report.md` - Post-install validation
- `.gitlab-duo/TESTING-PHASE2.md` - Phase 2 testing checklist
- Quick start prompts (6 workflows)

### Reference
- `docs/README.gitlab-duo.md` - Complete documentation
- `.gitlab-duo/INSTALL.md` - Installation guide
- `docs/superpowers/specs/2026-04-03-gitlab-duo-phase1-implementation-summary.md` - Phase 1 summary
- `docs/superpowers/specs/2026-04-03-gitlab-duo-phase2-ux-improvements-design.md` - Phase 2 design

---

## Quick Reference

### Commands
```bash
# Re-detect capabilities
bash .gitlab-duo/detect-capabilities.sh

# Run tests
cd .gitlab-duo/mcp-server && npm test

# Check what's detected
cat .gitlab-duo/capabilities.json
```

### In GitLab Duo
```
# List everything
What MCP resources are available?

# Initialize
Use initialize-superpowers prompt

# Check capabilities
Read superpowers://capabilities

# Use a skill
Use the [skill-name] skill
```

---

## Troubleshooting

### Skills Not Loading
```bash
# Check MCP config
cat ~/.gitlab/duo/mcp.json | grep superpowers

# Test server
node .gitlab-duo/mcp-server/src/index.js
# Should show: "Capabilities: Subagents: No, Tools: 7/8"
```

### Capabilities Wrong
```bash
# Re-detect
bash .gitlab-duo/detect-capabilities.sh

# Restart GitLab Duo
duo
```

### Tests Failing
```bash
cd .gitlab-duo/mcp-server
npm test
# Should show: 48 tests passing
```

---

## Success! 🎉

Phase 1 improvements are complete and ready to use.

**Next:** Run manual tests in `.gitlab-duo/TESTING.md` to verify everything works in real GitLab Duo CLI sessions.

**Questions?** See `docs/README.gitlab-duo.md` for complete documentation.
