# GitLab Duo CLI - Phase 3 Universal Installation

**Date:** 2026-04-03  
**Status:** Approved - Ready for Implementation  
**Approach:** Node.js universal installer with TDD, YAGNI, DRY

---

## Executive Summary

Create a universal installation system that allows users to install Superpowers in any project on any OS (Linux, macOS, Windows) without cloning the repository.

**Primary Method:** `npx` with Node.js script (cross-platform)  
**Secondary Method:** `curl`/`irm` download (one-liner)  
**Target Structure:** Skills in `./skills/`, infrastructure in `./.gitlab-duo/`

**Methodology:** Strict TDD (RED-GREEN-REFACTOR), YAGNI (no NPM package yet), DRY (reuse existing scripts).

---

## Current State (After Phase 2)

### What Works
- ✅ MCP server with diagnostics and quick starts
- ✅ 109 tests passing
- ✅ Installation works when run from Superpowers repository
- ✅ Capability detection and validation

### What's Missing
- ❌ Can't install in new project without cloning repository
- ❌ No cross-platform installation support
- ❌ No way to get skills into user's project
- ❌ Windows users can't install easily

---

## Architecture Overview

### Installation Flow

```
User in new project:
cd ~/my-project
npx @superpowers/installer init
    ↓
install-universal.mjs executes:
    ↓
1. Detect environment (OS, Node.js, GitLab Duo)
    ↓
2. Download skills from GitHub → ./skills/
    ↓
3. Download MCP server from GitHub → ./.gitlab-duo/mcp-server/
    ↓
4. Install dependencies → npm install
    ↓
5. Detect capabilities → detect-capabilities.sh
    ↓
6. Validate installation → validate-installation.js
    ↓
7. Configure GitLab Duo → ~/.gitlab/duo/mcp.json
    ↓
8. Generate report → compatibility-report.md
    ↓
Success! User can start using Superpowers
```

### Project Structure (After Installation)

```
~/my-project/                         # User's project
├── skills/                           # Skills (editable, versionable)
│   ├── brainstorming/
│   │   └── SKILL.md
│   ├── test-driven-development/
│   │   └── SKILL.md
│   └── ... (14 skills total)
├── .gitlab-duo/                      # Superpowers infrastructure
│   ├── mcp-server/                   # MCP server
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── capabilities-detector.js
│   │   │   ├── tool-adapter.js
│   │   │   ├── diagnostics/
│   │   │   ├── prompts/
│   │   │   └── resources/
│   │   ├── test/
│   │   ├── package.json
│   │   └── node_modules/
│   ├── detect-capabilities.sh        # Capability detection
│   ├── capabilities.json             # Generated
│   └── compatibility-report.md       # Generated
├── .gitignore                        # Updated to ignore generated files
└── README.md                         # User's project README
```

### Superpowers Repository Structure

```
~/superpowers/                        # Development repository
├── skills/                           # Skills source
├── .gitlab-duo/
│   ├── mcp-server/                   # MCP server source
│   ├── install-universal.mjs         # [NEW] Universal installer
│   ├── install.sh                    # [KEEP] Local development
│   └── detect-capabilities.sh
└── docs/
```

---

## Component 3.1: Universal Installer Script

### Goal
Single Node.js script that installs Superpowers in any project on any OS.

### Implementation

**Location:** `.gitlab-duo/install-universal.mjs`

**Features:**
- Cross-platform (Windows, macOS, Linux)
- Downloads from GitHub (no clone needed)
- Installs to current directory
- Configures GitLab Duo automatically
- Validates installation
- Generates compatibility report

**API:**
```javascript
#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

const GITHUB_RAW = 'https://raw.githubusercontent.com/obra/superpowers/main';
const GITHUB_API = 'https://api.github.com/repos/obra/superpowers';

async function main() {
  console.log('🚀 Superpowers Universal Installer\n');
  
  try {
    // 1. Detect environment
    const env = await detectEnvironment();
    console.log(`✓ Environment: ${env.os} (Node.js ${env.nodeVersion})\n`);
    
    // 2. Download skills
    await downloadSkills('./skills');
    
    // 3. Download MCP server
    await downloadMcpServer('./.gitlab-duo/mcp-server');
    
    // 4. Download scripts
    await downloadScripts('./.gitlab-duo');
    
    // 5. Install dependencies
    await installDependencies('./.gitlab-duo/mcp-server');
    
    // 6. Detect capabilities
    await detectCapabilities(env);
    
    // 7. Validate installation
    await validateInstallation();
    
    // 8. Configure GitLab Duo
    await configureGitLabDuo();
    
    // 9. Update .gitignore
    await updateGitignore();
    
    console.log('\n✅ Installation complete!\n');
    showNextSteps();
    
  } catch (error) {
    console.error('\n❌ Installation failed:', error.message);
    process.exit(1);
  }
}

main();
```

**Core Functions:**

```javascript
async function detectEnvironment() {
  const platform = process.platform;
  const env = {
    os: platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'macOS' : 'Linux',
    isWindows: platform === 'win32',
    isMac: platform === 'darwin',
    isLinux: platform === 'linux',
    nodeVersion: process.version,
    duoInstalled: false,
    bashAvailable: false
  };
  
  // Check Node.js version
  const nodeMajor = parseInt(env.nodeVersion.slice(1).split('.')[0]);
  if (nodeMajor < 18) {
    throw new Error(`Node.js 18+ required (found ${env.nodeVersion})`);
  }
  
  // Check GitLab Duo CLI
  try {
    execSync('duo --version', { stdio: 'pipe' });
    env.duoInstalled = true;
  } catch {
    console.warn('⚠️  GitLab Duo CLI not found - install from https://docs.gitlab.com/user/gitlab_duo_cli/');
  }
  
  // Check bash availability (for capability detection)
  if (env.isWindows) {
    try {
      execSync('bash --version', { stdio: 'pipe' });
      env.bashAvailable = true;
    } catch {
      try {
        execSync('wsl bash --version', { stdio: 'pipe' });
        env.bashAvailable = true;
        env.bashCommand = 'wsl bash';
      } catch {
        console.warn('⚠️  Bash not found - will use default capabilities');
      }
    }
  } else {
    env.bashAvailable = true;
  }
  
  return env;
}

async function downloadSkills(targetDir) {
  console.log('📦 Downloading skills from GitHub...');
  
  // Get list of skills
  const response = await fetch(`${GITHUB_API}/contents/skills`);
  const skillsTree = await response.json();
  
  if (!Array.isArray(skillsTree)) {
    throw new Error('Failed to fetch skills list from GitHub');
  }
  
  // Download each skill directory
  let count = 0;
  for (const item of skillsTree) {
    if (item.type === 'dir') {
      await downloadDirectory(`skills/${item.name}`, path.join(targetDir, item.name));
      count++;
    }
  }
  
  console.log(`✓ Downloaded ${count} skills to ${targetDir}\n`);
}

async function downloadDirectory(remotePath, localPath) {
  const response = await fetch(`${GITHUB_API}/contents/${remotePath}`);
  const tree = await response.json();
  
  await fs.mkdir(localPath, { recursive: true });
  
  for (const item of tree) {
    if (item.type === 'file') {
      await downloadFile(item.download_url, path.join(localPath, item.name));
    } else if (item.type === 'dir') {
      await downloadDirectory(`${remotePath}/${item.name}`, path.join(localPath, item.name));
    }
  }
}

async function downloadFile(url, dest) {
  const response = await fetch(url);
  const content = await response.text();
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, content);
}

async function downloadMcpServer(targetDir) {
  console.log('📦 Downloading MCP server from GitHub...');
  
  // Download entire .gitlab-duo/mcp-server directory
  await downloadDirectory('.gitlab-duo/mcp-server', targetDir);
  
  console.log(`✓ Downloaded MCP server to ${targetDir}\n`);
}

async function downloadScripts(targetDir) {
  console.log('📦 Downloading installation scripts...');
  
  // Download detect-capabilities.sh
  await downloadFile(
    `${GITHUB_RAW}/.gitlab-duo/detect-capabilities.sh`,
    path.join(targetDir, 'detect-capabilities.sh')
  );
  
  // Download validate-installation.js
  await downloadFile(
    `${GITHUB_RAW}/.gitlab-duo/validate-installation.js`,
    path.join(targetDir, 'validate-installation.js')
  );
  
  // Make scripts executable (Unix only)
  if (process.platform !== 'win32') {
    await fs.chmod(path.join(targetDir, 'detect-capabilities.sh'), 0o755);
  }
  
  console.log(`✓ Downloaded scripts to ${targetDir}\n`);
}

async function installDependencies(mcpServerDir) {
  console.log('📦 Installing MCP server dependencies...');
  
  const cwd = process.cwd();
  process.chdir(mcpServerDir);
  
  try {
    execSync('npm install --production', { stdio: 'inherit' });
    console.log('✓ Dependencies installed\n');
  } finally {
    process.chdir(cwd);
  }
}

async function detectCapabilities(env) {
  console.log('🔍 Detecting GitLab Duo capabilities...');
  
  const scriptPath = './.gitlab-duo/detect-capabilities.sh';
  
  if (env.bashAvailable) {
    const bashCmd = env.bashCommand || 'bash';
    execSync(`${bashCmd} "${scriptPath}" --non-interactive`, { stdio: 'inherit' });
  } else {
    console.warn('⚠️  Bash not available - using default capabilities');
    await createDefaultCapabilities();
  }
  
  console.log('✓ Capabilities detected\n');
}

async function createDefaultCapabilities() {
  const capabilities = {
    detected_at: new Date().toISOString(),
    gitlab_duo_version: 'unknown',
    tools: {
      read_file: true,
      edit_file: true,
      create_file_with_contents: true,
      run_command: true,
      grep: true,
      find_files: true,
      gitlab_documentation_search: true,
      web_search: false
    },
    subagents: {
      supported: false,
      tested_method: 'default',
      fallback: 'executing-plans',
      notes: 'Default capabilities (detection script not available on this system)'
    }
  };
  
  await fs.writeFile(
    './.gitlab-duo/capabilities.json',
    JSON.stringify(capabilities, null, 2) + '\n'
  );
}

async function validateInstallation() {
  console.log('✅ Validating installation...');
  
  const scriptPath = './.gitlab-duo/validate-installation.js';
  
  try {
    execSync(`node "${scriptPath}"`, { 
      stdio: 'inherit',
      env: { ...process.env, SUPERPOWERS_SKILLS_DIR: './skills' }
    });
    console.log('✓ Installation validated\n');
  } catch (error) {
    console.warn('⚠️  Validation had warnings - see compatibility-report.md\n');
  }
}

async function configureGitLabDuo() {
  console.log('⚙️  Configuring GitLab Duo CLI...');
  
  const homeDir = os.homedir();
  const configDir = path.join(homeDir, '.gitlab', 'duo');
  const configFile = path.join(configDir, 'mcp.json');
  
  // Create config directory
  await fs.mkdir(configDir, { recursive: true });
  
  // Backup existing config
  try {
    await fs.access(configFile);
    const backup = `${configFile}.backup.${Date.now()}`;
    await fs.copyFile(configFile, backup);
    console.log(`✓ Backed up existing config to ${path.basename(backup)}`);
  } catch {
    // No existing config
  }
  
  // Read existing config
  let config = { mcpServers: {} };
  try {
    const existing = await fs.readFile(configFile, 'utf-8');
    config = JSON.parse(existing);
  } catch {
    // File doesn't exist, use default
  }
  
  if (!config.mcpServers) {
    config.mcpServers = {};
  }
  
  // Add superpowers entry
  const projectRoot = process.cwd();
  config.mcpServers.superpowers = {
    type: 'stdio',
    command: 'node',
    args: [path.join(projectRoot, '.gitlab-duo/mcp-server/src/index.js')],
    env: {
      SUPERPOWERS_SKILLS_DIR: path.join(projectRoot, 'skills')
    }
  };
  
  // Write config
  await fs.writeFile(configFile, JSON.stringify(config, null, 2) + '\n');
  
  console.log(`✓ Configured: ${configFile}\n`);
}

async function updateGitignore() {
  console.log('📝 Updating .gitignore...');
  
  const gitignorePath = './.gitignore';
  const ignoreEntries = [
    '',
    '# Superpowers for GitLab Duo',
    '.gitlab-duo/capabilities.json',
    '.gitlab-duo/compatibility-report.md',
    '.gitlab-duo/mcp-server/node_modules/'
  ];
  
  let content = '';
  try {
    content = await fs.readFile(gitignorePath, 'utf-8');
  } catch {
    // File doesn't exist
  }
  
  // Check if already has Superpowers entries
  if (content.includes('# Superpowers for GitLab Duo')) {
    console.log('✓ .gitignore already configured\n');
    return;
  }
  
  // Append entries
  const newContent = content + (content.endsWith('\n') ? '' : '\n') + ignoreEntries.join('\n') + '\n';
  await fs.writeFile(gitignorePath, newContent);
  
  console.log('✓ Updated .gitignore\n');
}

function showNextSteps() {
  console.log('================================================');
  console.log('Next Steps:');
  console.log('================================================\n');
  console.log('1. Start GitLab Duo CLI:');
  console.log('   duo\n');
  console.log('2. Initialize Superpowers:');
  console.log('   "Use initialize-superpowers prompt"\n');
  console.log('3. Try a quick start:');
  console.log('   "Use quick-start-tdd prompt with feature=\'calculator\'"\n');
  console.log('4. Check health:');
  console.log('   "Read superpowers://diagnostics"\n');
  console.log('Files created:');
  console.log('  - ./skills/ (14 skills)');
  console.log('  - ./.gitlab-duo/mcp-server/');
  console.log('  - ./.gitlab-duo/compatibility-report.md\n');
  console.log('Configuration: ~/.gitlab/duo/mcp.json\n');
}
```

---

## Installation Methods

### Method 1: NPX (Recommended - Future)

**When published to NPM:**
```bash
cd ~/my-project
npx @superpowers/installer init
```

**For now (YAGNI - not published yet):**
Skip NPM package, use Method 2.

### Method 2: Direct Download (Current)

**Unix (Linux/macOS):**
```bash
cd ~/my-project
curl -sSL https://raw.githubusercontent.com/obra/superpowers/main/.gitlab-duo/install-universal.mjs | node
```

**Windows (PowerShell):**
```powershell
cd ~/my-project
irm https://raw.githubusercontent.com/obra/superpowers/main/.gitlab-duo/install-universal.mjs | node
```

**What it does:**
1. Downloads install-universal.mjs to memory
2. Pipes to Node.js for execution
3. Script downloads everything else

### Method 3: Local Development (Existing)

**For Superpowers contributors:**
```bash
cd ~/superpowers
bash .gitlab-duo/install.sh
```

**Uses local files** (no download needed)

---

## Windows Support

### Bash Detection on Windows

```javascript
async function detectBashOnWindows() {
  if (process.platform !== 'win32') return { available: true, command: 'bash' };
  
  // Try Git Bash
  try {
    execSync('bash --version', { stdio: 'pipe' });
    return { available: true, command: 'bash' };
  } catch {}
  
  // Try WSL
  try {
    execSync('wsl bash --version', { stdio: 'pipe' });
    return { available: true, command: 'wsl bash' };
  } catch {}
  
  return { available: false, command: null };
}
```

### Fallback for Windows without Bash

When bash not available:
- Use `createDefaultCapabilities()` instead of running detect-capabilities.sh
- Still functional, just can't auto-detect GitLab Duo version
- User can manually run detection later if they install Git Bash/WSL

---

## Testing Strategy

### Unit Tests (TDD)

**Test File:** `test/install-universal.test.js`

```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

describe('Universal Installer', () => {
  let testDir;
  
  beforeEach(async () => {
    testDir = path.join(process.cwd(), 'test-install-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });
    process.chdir(testDir);
  });
  
  afterEach(async () => {
    process.chdir('..');
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('detectEnvironment', () => {
    it('should detect OS', async () => {
      const env = await detectEnvironment();
      
      expect(env).toHaveProperty('os');
      expect(env).toHaveProperty('isWindows');
      expect(env).toHaveProperty('nodeVersion');
    });
    
    it('should detect Node.js version', async () => {
      const env = await detectEnvironment();
      
      expect(env.nodeVersion).toMatch(/^v\d+\.\d+\.\d+$/);
    });
    
    it('should throw if Node.js < 18', async () => {
      // Mock process.version
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', { value: 'v16.0.0' });
      
      await expect(detectEnvironment()).rejects.toThrow('Node.js 18+ required');
      
      Object.defineProperty(process, 'version', { value: originalVersion });
    });
  });

  describe('downloadSkills', () => {
    it('should download skills from GitHub', async () => {
      // Mock fetch
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          json: async () => [
            { name: 'brainstorming', type: 'dir' },
            { name: 'test-driven-development', type: 'dir' }
          ]
        })
        .mockResolvedValue({
          json: async () => [
            { name: 'SKILL.md', type: 'file', download_url: 'https://test.com/skill.md' }
          ],
          text: async () => '# Test Skill'
        });
      
      await downloadSkills('./skills');
      
      // Verify directories created
      const brainstorming = await fs.access('./skills/brainstorming/SKILL.md')
        .then(() => true)
        .catch(() => false);
      
      expect(brainstorming).toBe(true);
    });
    
    it('should handle download errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(downloadSkills('./skills')).rejects.toThrow();
    });
  });

  describe('downloadMcpServer', () => {
    it('should download MCP server', async () => {
      global.fetch = vi.fn()
        .mockResolvedValue({
          json: async () => [
            { name: 'src', type: 'dir' },
            { name: 'package.json', type: 'file', download_url: 'https://test.com/pkg.json' }
          ],
          text: async () => '{"name":"test"}'
        });
      
      await downloadMcpServer('./.gitlab-duo/mcp-server');
      
      const pkgExists = await fs.access('./.gitlab-duo/mcp-server/package.json')
        .then(() => true)
        .catch(() => false);
      
      expect(pkgExists).toBe(true);
    });
  });

  describe('configureGitLabDuo', () => {
    it('should create config file', async () => {
      // Mock home directory
      const mockHome = path.join(testDir, 'home');
      await fs.mkdir(mockHome, { recursive: true });
      
      // Override os.homedir
      const originalHomedir = os.homedir;
      os.homedir = () => mockHome;
      
      await configureGitLabDuo();
      
      const configPath = path.join(mockHome, '.gitlab', 'duo', 'mcp.json');
      const configExists = await fs.access(configPath)
        .then(() => true)
        .catch(() => false);
      
      expect(configExists).toBe(true);
      
      os.homedir = originalHomedir;
    });
    
    it('should add superpowers entry to config', async () => {
      const mockHome = path.join(testDir, 'home');
      await fs.mkdir(mockHome, { recursive: true });
      
      const originalHomedir = os.homedir;
      os.homedir = () => mockHome;
      
      await configureGitLabDuo();
      
      const configPath = path.join(mockHome, '.gitlab', 'duo', 'mcp.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      
      expect(config.mcpServers).toHaveProperty('superpowers');
      expect(config.mcpServers.superpowers.type).toBe('stdio');
      
      os.homedir = originalHomedir;
    });
  });

  describe('updateGitignore', () => {
    it('should create .gitignore if missing', async () => {
      await updateGitignore();
      
      const content = await fs.readFile('./.gitignore', 'utf-8');
      expect(content).toContain('# Superpowers for GitLab Duo');
    });
    
    it('should append to existing .gitignore', async () => {
      await fs.writeFile('./.gitignore', 'node_modules/\n');
      
      await updateGitignore();
      
      const content = await fs.readFile('./.gitignore', 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('# Superpowers for GitLab Duo');
    });
    
    it('should not duplicate entries', async () => {
      await updateGitignore();
      await updateGitignore(); // Run twice
      
      const content = await fs.readFile('./.gitignore', 'utf-8');
      const matches = content.match(/# Superpowers for GitLab Duo/g);
      expect(matches.length).toBe(1);
    });
  });
});
```

---

## Integration with Existing Scripts

### Reuse from Phase 1 & 2 (DRY)

**Reused:**
- ✅ `detect-capabilities.sh` - Downloaded and executed
- ✅ `validate-installation.js` - Downloaded and executed
- ✅ MCP server (entire directory) - Downloaded
- ✅ Capabilities detector, health checker, validator - All included in MCP server

**New:**
- `install-universal.mjs` - Universal installer
- Download logic for GitHub

---

## User Experience

### Before Phase 3

```bash
# User needs to clone repository
git clone https://github.com/obra/superpowers ~/superpowers
cd ~/superpowers
bash .gitlab-duo/install.sh

# Works, but:
# - Requires git clone
# - Skills in ~/superpowers, not in user's project
# - Can't customize per project
```

### After Phase 3

```bash
# User in any project
cd ~/my-project

# One command
curl -sSL https://raw.githubusercontent.com/obra/superpowers/main/.gitlab-duo/install-universal.mjs | node

# Or (when published to NPM)
npx @superpowers/installer init

# Result:
# ✓ Skills in ./skills/ (editable, versionable)
# ✓ MCP server in ./.gitlab-duo/
# ✓ GitLab Duo configured
# ✓ Ready to use
```

---

## Success Criteria

### Installation
- ✅ Works on Linux, macOS, Windows
- ✅ Downloads skills to `./skills/`
- ✅ Downloads MCP server to `./.gitlab-duo/mcp-server/`
- ✅ Installs dependencies
- ✅ Detects capabilities (or uses defaults on Windows without bash)
- ✅ Validates installation
- ✅ Configures `~/.gitlab/duo/mcp.json`
- ✅ Updates `.gitignore`

### User Experience
- ✅ One command to install
- ✅ No repository clone needed
- ✅ Skills in project (customizable)
- ✅ Works offline after first install
- ✅ Clear error messages

### Quality
- ✅ All tests pass (existing + new)
- ✅ TDD followed
- ✅ No breaking changes
- ✅ Documentation updated

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| GitHub API rate limits | Medium | High | Cache responses, use raw.githubusercontent.com for files |
| Network failures during download | Medium | High | Retry logic, clear error messages |
| Windows bash not available | High | Low | Use default capabilities, still functional |
| Existing .gitignore conflicts | Low | Low | Append only, check for duplicates |
| Large download size | Low | Medium | Download only necessary files, show progress |

---

## Estimated Effort

### Code
- **New files:** 2 (install-universal.mjs + test)
- **Modified files:** 1 (documentation)
- **Lines of code:** ~500 (installer + tests)
- **Tests:** ~25 new tests

### Time
- **Implementation:** 2-3 hours (with TDD)
- **Testing:** 1 hour (test on Windows, macOS, Linux)
- **Documentation:** 30 minutes

**Total:** ~4 hours

---

## Principles Applied

### TDD
✅ All download functions tested with mocks  
✅ Environment detection tested  
✅ Configuration tested  
✅ Integration tested  

### YAGNI
✅ No NPM package yet (direct download sufficient)  
✅ No progress bars (console.log sufficient)  
✅ No update mechanism (re-run installer)  
✅ No version management (always latest from main)  

### DRY
✅ Reuses detect-capabilities.sh  
✅ Reuses validate-installation.js  
✅ Reuses entire MCP server from Phase 1 & 2  
✅ Single download function for all files  

---

## Next Steps After Approval

1. **Review this spec** - Confirm design is correct
2. **Create implementation plan** - Break into TDD tasks
3. **Execute with TDD** - RED-GREEN-REFACTOR
4. **Test on multiple OS** - Windows, macOS, Linux
5. **Update documentation** - Installation guide

---

**End of Design Document**
