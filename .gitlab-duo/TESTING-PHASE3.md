# Phase 3 Manual Testing Results

**Date:** 2026-04-03
**Tester:** [your name]

## Test Checklist

### Universal Installation - Unix

- [ ] **Test 1.1:** Install in clean directory (macOS/Linux)
  - Command: `curl -sSL https://raw.githubusercontent.com/.../install-universal.mjs | node`
  - Expected: Installation completes successfully
  - Result:

- [ ] **Test 1.2:** Verify skills downloaded
  - Command: `ls -la ./skills/`
  - Expected: 14 skill directories
  - Result:

- [ ] **Test 1.3:** Verify MCP server downloaded
  - Command: `ls -la ./.gitlab-duo/mcp-server/`
  - Expected: src/, test/, package.json, node_modules/
  - Result:

- [ ] **Test 1.4:** Verify scripts downloaded
  - Command: `ls -la ./.gitlab-duo/`
  - Expected: detect-capabilities.sh, validate-installation.js
  - Result:

- [ ] **Test 1.5:** Verify .gitignore updated
  - Command: `cat ./.gitignore`
  - Expected: Contains "# Superpowers for GitLab Duo"
  - Result:

- [ ] **Test 1.6:** Verify GitLab Duo configured
  - Command: `cat ~/.gitlab/duo/mcp.json | grep superpowers -A 10`
  - Expected: Superpowers entry with correct paths
  - Result:

- [ ] **Test 1.7:** Verify compatibility report generated
  - Command: `cat ./.gitlab-duo/compatibility-report.md`
  - Expected: Shows status, checks, recommendations
  - Result:

### Universal Installation - Windows

- [ ] **Test 2.1:** Install on Windows with Git Bash
  - Command: `irm https://raw.githubusercontent.com/.../install-universal.mjs | node`
  - Expected: Installation completes, uses Git Bash for detection
  - Result:

- [ ] **Test 2.2:** Install on Windows without Git Bash
  - Expected: Installation completes, uses default capabilities
  - Result:

- [ ] **Test 2.3:** Install on Windows with WSL
  - Expected: Installation completes, uses WSL bash
  - Result:

### Local Installer Testing

- [ ] **Test 3.1:** Test install-local.mjs
  - Command: `node /path/to/superpowers/.gitlab-duo/install-local.mjs`
  - Expected: Copies files from local repository
  - Result:

- [ ] **Test 3.2:** Verify local install structure
  - Expected: Same structure as universal install
  - Result:

### Functionality After Installation

- [ ] **Test 4.1:** Start GitLab Duo
  - Command: `duo`
  - Expected: MCP server starts, loads skills from ./skills/
  - Result:

- [ ] **Test 4.2:** List resources
  - Command: "What MCP resources are available?"
  - Expected: Shows skills from ./skills/
  - Result:

- [ ] **Test 4.3:** Use a skill
  - Command: "Use the brainstorming skill"
  - Expected: Skill loads and works normally
  - Result:

- [ ] **Test 4.4:** Check diagnostics
  - Command: "Read superpowers://diagnostics"
  - Expected: Shows 14 skills loaded from ./skills/
  - Result:

- [ ] **Test 4.5:** Use quick start
  - Command: "Use quick-start-tdd prompt with feature='test'"
  - Expected: Workflow starts correctly
  - Result:

### Customization

- [ ] **Test 5.1:** Edit a skill
  - Edit `./skills/brainstorming/SKILL.md`
  - Restart GitLab Duo
  - Expected: Changes reflected
  - Result:

- [ ] **Test 5.2:** Add a new skill
  - Create `./skills/my-skill/SKILL.md`
  - Restart GitLab Duo
  - Expected: New skill appears in resources
  - Result:

- [ ] **Test 5.3:** Remove a skill
  - Delete `./skills/some-skill/`
  - Restart GitLab Duo
  - Expected: Skill no longer appears
  - Result:

- [ ] **Test 5.4:** GitLab Duo Chat can edit skills
  - Ask: "Edit ./skills/brainstorming/SKILL.md to add a note"
  - Expected: GitLab Duo can edit (not blocked)
  - Result:

### Integration with Phase 1 & 2

- [ ] **Test 6.1:** All Phase 1 features work
  - initialize-superpowers prompt
  - superpowers://capabilities
  - MCP tools
  - Result:

- [ ] **Test 6.2:** All Phase 2 features work
  - Post-install validation
  - superpowers://diagnostics
  - Quick start prompts
  - Result:

### Multiple Projects

- [ ] **Test 7.1:** Install in project A
  - Expected: Works correctly
  - Result:

- [ ] **Test 7.2:** Install in project B
  - Expected: Works correctly, doesn't break project A
  - Result:

- [ ] **Test 7.3:** Switch between projects
  - Start duo in project A, then project B
  - Expected: Each loads its own skills
  - Result:

## Issues Found

[List any issues]

## Notes

**Local installer tested:** ✅ Works perfectly
- Skills copied to ./skills/
- MCP server works
- All 126 automated tests pass

**Remote installer:** ⚠️ Needs repository push
- Skills download works (tested)
- MCP server download will work after push
- One-liner ready for use

## Summary

- [ ] Universal installation works on all OS
- [ ] Skills installed to ./skills/
- [ ] MCP server works correctly
- [ ] Customization works
- [ ] No breaking changes
- [ ] All 126 tests pass

**Overall Status:** [ ] PASS / [ ] FAIL
