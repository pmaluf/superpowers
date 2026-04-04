# GitLab Duo CLI Phase 3 Universal Installation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a universal Node.js installer that allows users to install Superpowers in any project on any OS (Linux, macOS, Windows) without cloning the repository.

**Architecture:** Single Node.js script downloads skills and MCP server from GitHub, installs to current project, configures GitLab Duo automatically.

**Tech Stack:** Node.js 18+, GitHub API, fetch API, cross-platform file operations

---

## File Structure

### New Files
- `.gitlab-duo/install-universal.mjs` - Universal installer script
- `.gitlab-duo/mcp-server/test/install-universal.test.js` - Unit tests

### Modified Files
- `.gitlab-duo/README.md` - Document new installation method
- `docs/README.gitlab-duo.md` - Update installation guide
- `.gitlab-duo/INSTALL.md` - Add universal installation section

### No Changes Needed
- All Phase 1 & 2 code (reused as-is)
- Skills (downloaded, not modified)

---

## Task 1: Universal Installer - Tests (RED)

**Files:**
- Create: `.gitlab-duo/mcp-server/test/install-universal.test.js`

- [ ] **Step 1: Write failing tests for environment detection**

Create `.gitlab-duo/mcp-server/test/install-universal.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Import functions from install-universal.mjs
// Note: We'll export functions for testing
import {
  detectEnvironment,
  downloadFile,
  downloadDirectory,
  downloadSkills,
  downloadMcpServer,
  downloadScripts,
  configureGitLabDuo,
  updateGitignore,
  createDefaultCapabilities
} from '../../install-universal.mjs';

describe('Universal Installer', () => {
  describe('detectEnvironment', () => {
    it('should detect OS', async () => {
      const env = await detectEnvironment();
      
      expect(env).toHaveProperty('os');
      expect(env).toHaveProperty('isWindows');
      expect(env).toHaveProperty('isMac');
      expect(env).toHaveProperty('isLinux');
      expect(env).toHaveProperty('nodeVersion');
    });
    
    it('should detect Node.js version', async () => {
      const env = await detectEnvironment();
      
      expect(env.nodeVersion).toMatch(/^v\d+\.\d+\.\d+$/);
    });
    
    it('should detect current OS correctly', async () => {
      const env = await detectEnvironment();
      const platform = process.platform;
      
      if (platform === 'win32') {
        expect(env.isWindows).toBe(true);
        expect(env.os).toBe('Windows');
      } else if (platform === 'darwin') {
        expect(env.isMac).toBe(true);
        expect(env.os).toBe('macOS');
      } else {
        expect(env.isLinux).toBe(true);
        expect(env.os).toBe('Linux');
      }
    });
    
    it('should check bash availability on Windows', async () => {
      const env = await detectEnvironment();
      
      if (env.isWindows) {
        expect(env).toHaveProperty('bashAvailable');
      }
    });
  });

  describe('downloadFile', () => {
    it('should download file from URL', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '# Test content'
      });
      global.fetch = mockFetch;
      
      const testFile = path.join(os.tmpdir(), 'test-download.md');
      await downloadFile('https://test.com/file.md', testFile);
      
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('# Test content');
      
      await fs.unlink(testFile);
    });
    
    it('should create parent directories', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'content'
      });
      global.fetch = mockFetch;
      
      const testFile = path.join(os.tmpdir(), 'deep', 'nested', 'file.txt');
      await downloadFile('https://test.com/file.txt', testFile);
      
      const exists = await fs.access(testFile).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      
      await fs.rm(path.join(os.tmpdir(), 'deep'), { recursive: true });
    });
    
    it('should throw on network error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      });
      global.fetch = mockFetch;
      
      await expect(downloadFile('https://test.com/missing.txt', '/tmp/test.txt'))
        .rejects.toThrow();
    });
  });

  describe('downloadDirectory', () => {
    it('should download directory recursively', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { name: 'file1.md', type: 'file', download_url: 'https://test.com/file1.md' },
            { name: 'subdir', type: 'dir' }
          ]
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '# File 1'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { name: 'file2.md', type: 'file', download_url: 'https://test.com/file2.md' }
          ]
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '# File 2'
        });
      
      global.fetch = mockFetch;
      
      const testDir = path.join(os.tmpdir(), 'test-dir-' + Date.now());
      await downloadDirectory('remote/path', testDir);
      
      const file1Exists = await fs.access(path.join(testDir, 'file1.md'))
        .then(() => true).catch(() => false);
      const file2Exists = await fs.access(path.join(testDir, 'subdir', 'file2.md'))
        .then(() => true).catch(() => false);
      
      expect(file1Exists).toBe(true);
      expect(file2Exists).toBe(true);
      
      await fs.rm(testDir, { recursive: true });
    });
  });

  describe('downloadSkills', () => {
    it('should download all skills', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { name: 'brainstorming', type: 'dir' },
            { name: 'test-driven-development', type: 'dir' }
          ]
        })
        .mockResolvedValue({
          ok: true,
          json: async () => [
            { name: 'SKILL.md', type: 'file', download_url: 'https://test.com/skill.md' }
          ],
          text: async () => '# Skill'
        });
      
      global.fetch = mockFetch;
      
      const testDir = path.join(os.tmpdir(), 'test-skills-' + Date.now());
      await downloadSkills(testDir);
      
      const brainstormingExists = await fs.access(path.join(testDir, 'brainstorming', 'SKILL.md'))
        .then(() => true).catch(() => false);
      
      expect(brainstormingExists).toBe(true);
      
      await fs.rm(testDir, { recursive: true });
    });
  });

  describe('configureGitLabDuo', () => {
    let testHome;
    let originalHomedir;
    
    beforeEach(async () => {
      testHome = path.join(os.tmpdir(), 'test-home-' + Date.now());
      await fs.mkdir(testHome, { recursive: true });
      originalHomedir = os.homedir;
      os.homedir = () => testHome;
    });
    
    afterEach(async () => {
      os.homedir = originalHomedir;
      await fs.rm(testHome, { recursive: true, force: true });
    });

    it('should create config file', async () => {
      await configureGitLabDuo();
      
      const configPath = path.join(testHome, '.gitlab', 'duo', 'mcp.json');
      const exists = await fs.access(configPath).then(() => true).catch(() => false);
      
      expect(exists).toBe(true);
    });
    
    it('should add superpowers entry', async () => {
      await configureGitLabDuo();
      
      const configPath = path.join(testHome, '.gitlab', 'duo', 'mcp.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      
      expect(config.mcpServers).toHaveProperty('superpowers');
      expect(config.mcpServers.superpowers.type).toBe('stdio');
      expect(config.mcpServers.superpowers.command).toBe('node');
    });
    
    it('should preserve existing config', async () => {
      const configPath = path.join(testHome, '.gitlab', 'duo', 'mcp.json');
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      await fs.writeFile(configPath, JSON.stringify({
        mcpServers: { other: { type: 'test' } }
      }));
      
      await configureGitLabDuo();
      
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      expect(config.mcpServers.other).toEqual({ type: 'test' });
      expect(config.mcpServers.superpowers).toBeDefined();
    });
    
    it('should backup existing config', async () => {
      const configPath = path.join(testHome, '.gitlab', 'duo', 'mcp.json');
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      await fs.writeFile(configPath, '{"test":true}');
      
      await configureGitLabDuo();
      
      const backups = await fs.readdir(path.dirname(configPath));
      const hasBackup = backups.some(f => f.startsWith('mcp.json.backup.'));
      
      expect(hasBackup).toBe(true);
    });
  });

  describe('updateGitignore', () => {
    let testDir;
    
    beforeEach(async () => {
      testDir = path.join(os.tmpdir(), 'test-gitignore-' + Date.now());
      await fs.mkdir(testDir, { recursive: true });
      process.chdir(testDir);
    });
    
    afterEach(async () => {
      process.chdir('..');
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it('should create .gitignore if missing', async () => {
      await updateGitignore();
      
      const content = await fs.readFile('./.gitignore', 'utf-8');
      expect(content).toContain('# Superpowers for GitLab Duo');
      expect(content).toContain('.gitlab-duo/capabilities.json');
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

  describe('createDefaultCapabilities', () => {
    it('should create default capabilities.json', async () => {
      await fs.mkdir('./.gitlab-duo', { recursive: true });
      await createDefaultCapabilities();
      
      const content = await fs.readFile('./.gitlab-duo/capabilities.json', 'utf-8');
      const capabilities = JSON.parse(content);
      
      expect(capabilities).toHaveProperty('detected_at');
      expect(capabilities).toHaveProperty('tools');
      expect(capabilities).toHaveProperty('subagents');
    });
    
    it('should mark as default detection method', async () => {
      await fs.mkdir('./.gitlab-duo', { recursive: true });
      await createDefaultCapabilities();
      
      const content = await fs.readFile('./.gitlab-duo/capabilities.json', 'utf-8');
      const capabilities = JSON.parse(content);
      
      expect(capabilities.subagents.tested_method).toBe('default');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd .gitlab-duo/mcp-server
npm test install-universal
```

Expected: All tests FAIL with "Cannot find module '../../install-universal.mjs'"

- [ ] **Step 3: Commit failing tests**

```bash
git add test/install-universal.test.js
git commit -m "test: add failing tests for universal installer (RED)"
```

---

## Task 2: Universal Installer - Core Functions (GREEN)

**Files:**
- Create: `.gitlab-duo/install-universal.mjs`

- [ ] **Step 1: Create installer skeleton with exports**

Create `.gitlab-duo/install-universal.mjs`:

```javascript
#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

const GITHUB_RAW = 'https://raw.githubusercontent.com/obra/superpowers/main';
const GITHUB_API = 'https://api.github.com/repos/obra/superpowers';

// Environment Detection
export async function detectEnvironment() {
  const platform = process.platform;
  const env = {
    os: platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'macOS' : 'Linux',
    isWindows: platform === 'win32',
    isMac: platform === 'darwin',
    isLinux: platform === 'linux',
    nodeVersion: process.version,
    duoInstalled: false,
    bashAvailable: false,
    bashCommand: 'bash'
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
    // Not installed
  }
  
  // Check bash availability
  if (env.isWindows) {
    // Try Git Bash
    try {
      execSync('bash --version', { stdio: 'pipe' });
      env.bashAvailable = true;
    } catch {
      // Try WSL
      try {
        execSync('wsl bash --version', { stdio: 'pipe' });
        env.bashAvailable = true;
        env.bashCommand = 'wsl bash';
      } catch {
        // No bash available
      }
    }
  } else {
    env.bashAvailable = true;
  }
  
  return env;
}

// File Download
export async function downloadFile(url, dest) {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  
  const content = await response.text();
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, content);
}

// Directory Download
export async function downloadDirectory(remotePath, localPath) {
  const url = `${GITHUB_API}/contents/${remotePath}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch directory ${remotePath}: ${response.status}`);
  }
  
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

// Skills Download
export async function downloadSkills(targetDir) {
  console.log('📦 Downloading skills from GitHub...');
  
  const response = await fetch(`${GITHUB_API}/contents/skills`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch skills list: ${response.status}`);
  }
  
  const skillsTree = await response.json();
  
  if (!Array.isArray(skillsTree)) {
    throw new Error('Invalid response from GitHub API');
  }
  
  let count = 0;
  for (const item of skillsTree) {
    if (item.type === 'dir') {
      await downloadDirectory(`skills/${item.name}`, path.join(targetDir, item.name));
      count++;
    }
  }
  
  console.log(`✓ Downloaded ${count} skills to ${targetDir}\n`);
}

// MCP Server Download
export async function downloadMcpServer(targetDir) {
  console.log('📦 Downloading MCP server from GitHub...');
  
  await downloadDirectory('.gitlab-duo/mcp-server', targetDir);
  
  console.log(`✓ Downloaded MCP server to ${targetDir}\n`);
}

// Scripts Download
export async function downloadScripts(targetDir) {
  console.log('📦 Downloading installation scripts...');
  
  await downloadFile(
    `${GITHUB_RAW}/.gitlab-duo/detect-capabilities.sh`,
    path.join(targetDir, 'detect-capabilities.sh')
  );
  
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

// GitLab Duo Configuration
export async function configureGitLabDuo() {
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

// Gitignore Update
export async function updateGitignore() {
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

// Default Capabilities (Windows fallback)
export async function createDefaultCapabilities() {
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

// Main installation flow (not exported - only for CLI usage)
async function install() {
  console.log('🚀 Superpowers Universal Installer\n');
  
  try {
    // 1. Detect environment
    const env = await detectEnvironment();
    console.log(`✓ Environment: ${env.os} (Node.js ${env.nodeVersion})`);
    if (!env.duoInstalled) {
      console.warn('⚠️  GitLab Duo CLI not found - install from https://docs.gitlab.com/user/gitlab_duo_cli/');
    }
    console.log('');
    
    // 2. Download skills
    await downloadSkills('./skills');
    
    // 3. Download MCP server
    await downloadMcpServer('./.gitlab-duo/mcp-server');
    
    // 4. Download scripts
    await downloadScripts('./.gitlab-duo');
    
    // 5. Install dependencies
    console.log('📦 Installing MCP server dependencies...');
    const cwd = process.cwd();
    process.chdir('./.gitlab-duo/mcp-server');
    execSync('npm install --production', { stdio: 'inherit' });
    process.chdir(cwd);
    console.log('✓ Dependencies installed\n');
    
    // 6. Detect capabilities
    console.log('🔍 Detecting GitLab Duo capabilities...');
    if (env.bashAvailable) {
      const scriptPath = './.gitlab-duo/detect-capabilities.sh';
      execSync(`${env.bashCommand} "${scriptPath}" --non-interactive`, { stdio: 'inherit' });
    } else {
      console.warn('⚠️  Bash not available - using default capabilities');
      await createDefaultCapabilities();
    }
    console.log('✓ Capabilities detected\n');
    
    // 7. Validate installation
    console.log('✅ Validating installation...');
    try {
      execSync('node ./.gitlab-duo/validate-installation.js', { 
        stdio: 'inherit',
        env: { ...process.env, SUPERPOWERS_SKILLS_DIR: './skills' }
      });
    } catch {
      console.warn('⚠️  Validation had warnings - see compatibility-report.md');
    }
    console.log('');
    
    // 8. Configure GitLab Duo
    await configureGitLabDuo();
    
    // 9. Update .gitignore
    await updateGitignore();
    
    // Success!
    console.log('================================================');
    console.log('✅ Installation Complete!');
    console.log('================================================\n');
    
    console.log('Next steps:');
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
    
  } catch (error) {
    console.error('\n❌ Installation failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check internet connection');
    console.error('2. Verify Node.js 18+ installed: node --version');
    console.error('3. Try again or report issue: https://github.com/obra/superpowers/issues\n');
    process.exit(1);
  }
}

// Run installer if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  install();
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
npm test install-universal
```

Expected: All tests PASS

- [ ] **Step 3: Make script executable**

```bash
chmod +x .gitlab-duo/install-universal.mjs
```

- [ ] **Step 4: Commit implementation**

```bash
git add .gitlab-duo/install-universal.mjs
git commit -m "feat: implement universal installer (GREEN)"
```

---

## Task 3: Test Installation in Clean Directory

**Files:**
- Test in temporary directory

- [ ] **Step 1: Create test directory**

```bash
mkdir -p /tmp/test-superpowers-install
cd /tmp/test-superpowers-install
```

- [ ] **Step 2: Test local installation (development)**

```bash
node ~/path/to/superpowers/.gitlab-duo/install-universal.mjs
```

Expected:
- Skills downloaded to `./skills/`
- MCP server in `./.gitlab-duo/mcp-server/`
- Dependencies installed
- Capabilities detected
- Config updated
- .gitignore updated

- [ ] **Step 3: Verify structure**

```bash
ls -la ./skills/
ls -la ./.gitlab-duo/
cat ./.gitignore
cat ~/.gitlab/duo/mcp.json | grep superpowers -A 10
```

Expected: All files in correct locations

- [ ] **Step 4: Test MCP server starts**

```bash
timeout 2 node ./.gitlab-duo/mcp-server/src/index.js 2>&1 | head -n 10
```

Expected: Server starts, loads skills from `./skills/`

- [ ] **Step 5: Cleanup test directory**

```bash
cd ~
rm -rf /tmp/test-superpowers-install
```

- [ ] **Step 6: Document test results**

Create test report in repository

---

## Task 4: Windows Testing (If Available)

**Files:**
- Test on Windows machine

- [ ] **Step 1: Test on Windows with Git Bash**

```powershell
# In PowerShell
cd C:\Users\YourName\test-project
node C:\path\to\superpowers\.gitlab-duo\install-universal.mjs
```

Expected: Installation succeeds using Git Bash

- [ ] **Step 2: Test on Windows without Git Bash**

```powershell
# Rename bash temporarily to simulate missing
cd C:\Users\YourName\test-project-2
node C:\path\to\superpowers\.gitlab-duo\install-universal.mjs
```

Expected: Installation succeeds with default capabilities

- [ ] **Step 3: Test with WSL**

```powershell
# If WSL available
cd C:\Users\YourName\test-project-3
node C:\path\to\superpowers\.gitlab-duo\install-universal.mjs
```

Expected: Installation succeeds using WSL bash

- [ ] **Step 4: Document Windows test results**

Note any Windows-specific issues

---

## Task 5: Create One-Liner Installation

**Files:**
- Update: `README.md` (repository root)
- Update: `.gitlab-duo/README.md`

- [ ] **Step 1: Test one-liner works (Unix)**

```bash
cd /tmp/test-oneliner
curl -sSL https://raw.githubusercontent.com/obra/superpowers/main/.gitlab-duo/install-universal.mjs | node
```

Expected: Installation completes

- [ ] **Step 2: Test one-liner works (Windows)**

```powershell
cd C:\temp\test-oneliner
irm https://raw.githubusercontent.com/obra/superpowers/main/.gitlab-duo/install-universal.mjs | node
```

Expected: Installation completes

- [ ] **Step 3: Add one-liner to README.md**

Add to repository root `README.md` in installation section:

```markdown
## Installation

### Quick Install (Recommended)

**Unix (Linux/macOS):**
```bash
cd your-project
curl -sSL https://raw.githubusercontent.com/obra/superpowers/main/.gitlab-duo/install-universal.mjs | node
```

**Windows (PowerShell):**
```powershell
cd your-project
irm https://raw.githubusercontent.com/obra/superpowers/main/.gitlab-duo/install-universal.mjs | node
```

### What It Does

1. Downloads skills to `./skills/`
2. Installs MCP server to `./.gitlab-duo/`
3. Configures GitLab Duo CLI
4. Validates installation

### Requirements

- Node.js 18+
- GitLab Duo CLI (optional, but recommended)
- Internet connection (for initial download)
```

- [ ] **Step 4: Commit documentation**

```bash
git add README.md .gitlab-duo/README.md
git commit -m "docs: add universal installation one-liner"
```

---

## Task 6: Update Installation Documentation

**Files:**
- Modify: `.gitlab-duo/INSTALL.md`
- Modify: `docs/README.gitlab-duo.md`

- [ ] **Step 1: Update INSTALL.md with universal installation**

Add new section at the top:

```markdown
## Quick Install (Recommended)

Install Superpowers in any project without cloning the repository.

### Unix (Linux/macOS)

```bash
cd your-project
curl -sSL https://raw.githubusercontent.com/obra/superpowers/main/.gitlab-duo/install-universal.mjs | node
```

### Windows (PowerShell)

```powershell
cd your-project
irm https://raw.githubusercontent.com/obra/superpowers/main/.gitlab-duo/install-universal.mjs | node
```

### What Gets Installed

- **Skills:** `./skills/` (14 skills, editable)
- **MCP Server:** `./.gitlab-duo/mcp-server/`
- **Scripts:** `./.gitlab-duo/detect-capabilities.sh`, `validate-installation.js`
- **Config:** `~/.gitlab/duo/mcp.json` (updated)
- **Reports:** `./.gitlab-duo/compatibility-report.md`

### Customization

After installation, you can:
- Edit skills in `./skills/` (changes are yours)
- Add new skills to `./skills/`
- Remove unused skills
- Commit skills to your project's git

---

## Manual Installation (For Development)

If you're contributing to Superpowers or want full control:

[Keep existing manual installation section]
```

- [ ] **Step 2: Update docs/README.gitlab-duo.md**

Add Phase 3 section:

```markdown
## Phase 3 Improvements (2026-04-03)

### Universal Installation

Install Superpowers in any project without cloning the repository.

**One command (Unix):**
```bash
curl -sSL https://raw.githubusercontent.com/obra/superpowers/main/.gitlab-duo/install-universal.mjs | node
```

**One command (Windows):**
```powershell
irm https://raw.githubusercontent.com/obra/superpowers/main/.gitlab-duo/install-universal.mjs | node
```

**What it does:**
1. Downloads skills from GitHub → `./skills/`
2. Downloads MCP server → `./.gitlab-duo/mcp-server/`
3. Installs dependencies
4. Detects capabilities
5. Validates installation
6. Configures GitLab Duo
7. Updates `.gitignore`

**Result:**
- Skills in your project (editable, versionable)
- Ready to use immediately
- Works on Windows, macOS, Linux

### Project Structure

After installation:
```
your-project/
├── skills/                    # Superpowers skills (customize as needed)
├── .gitlab-duo/              # Infrastructure (don't edit)
│   ├── mcp-server/
│   ├── capabilities.json
│   └── compatibility-report.md
└── .gitignore                # Updated automatically
```

### Customizing Skills

Skills are in your project - you can:
- Edit existing skills
- Add new skills
- Remove unused skills
- Commit to your git repository

GitLab Duo Chat can help you edit skills in `./skills/`.
```

- [ ] **Step 3: Commit documentation updates**

```bash
git add .gitlab-duo/INSTALL.md docs/README.gitlab-duo.md
git commit -m "docs: document Phase 3 universal installation"
```

---

## Task 7: Update QUICKSTART.md

**Files:**
- Modify: `.gitlab-duo/QUICKSTART.md`

- [ ] **Step 1: Add Phase 3 section**

Add after Phase 2 section:

```markdown
### Phase 3 (2026-04-03)
- Universal installation (works in any project)
- Cross-platform support (Windows, macOS, Linux)
- Skills in project directory (customizable)
```

- [ ] **Step 2: Update installation instructions**

Replace "First Time Setup" section:

```markdown
## How to Use

### First Time Setup

**In any project:**

```bash
# Unix (Linux/macOS)
curl -sSL https://raw.githubusercontent.com/obra/superpowers/main/.gitlab-duo/install-universal.mjs | node

# Windows (PowerShell)
irm https://raw.githubusercontent.com/obra/superpowers/main/.gitlab-duo/install-universal.mjs | node
```

**What gets installed:**
- Skills in `./skills/` (you can edit these!)
- MCP server in `./.gitlab-duo/`
- GitLab Duo configured automatically
```

- [ ] **Step 3: Commit updates**

```bash
git add .gitlab-duo/QUICKSTART.md
git commit -m "docs: update quickstart with Phase 3 installation"
```

---

## Task 8: Create Testing Checklist

**Files:**
- Create: `.gitlab-duo/TESTING-PHASE3.md`

- [ ] **Step 1: Create Phase 3 testing checklist**

Create `.gitlab-duo/TESTING-PHASE3.md`:

```markdown
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

### Functionality After Installation

- [ ] **Test 3.1:** Start GitLab Duo
  - Command: `duo`
  - Expected: MCP server starts, loads skills from ./skills/
  - Result:

- [ ] **Test 3.2:** List resources
  - Command: "What MCP resources are available?"
  - Expected: Shows skills from ./skills/
  - Result:

- [ ] **Test 3.3:** Use a skill
  - Command: "Use the brainstorming skill"
  - Expected: Skill loads and works normally
  - Result:

- [ ] **Test 3.4:** Check diagnostics
  - Command: "Read superpowers://diagnostics"
  - Expected: Shows 14 skills loaded from ./skills/
  - Result:

### Customization

- [ ] **Test 4.1:** Edit a skill
  - Edit `./skills/brainstorming/SKILL.md`
  - Restart GitLab Duo
  - Expected: Changes reflected
  - Result:

- [ ] **Test 4.2:** Add a new skill
  - Create `./skills/my-skill/SKILL.md`
  - Restart GitLab Duo
  - Expected: New skill appears in resources
  - Result:

- [ ] **Test 4.3:** Remove a skill
  - Delete `./skills/some-skill/`
  - Restart GitLab Duo
  - Expected: Skill no longer appears
  - Result:

### Integration with Phase 1 & 2

- [ ] **Test 5.1:** All Phase 1 features work
  - initialize-superpowers prompt
  - superpowers://capabilities
  - MCP tools
  - Result:

- [ ] **Test 5.2:** All Phase 2 features work
  - Post-install validation
  - superpowers://diagnostics
  - Quick start prompts
  - Result:

## Issues Found

[List any issues]

## Notes

[Observations]

## Summary

- [ ] Universal installation works on all OS
- [ ] Skills installed to ./skills/
- [ ] MCP server works correctly
- [ ] Customization works
- [ ] No breaking changes

**Overall Status:** [ ] PASS / [ ] FAIL
```

- [ ] **Step 2: Commit testing checklist**

```bash
git add .gitlab-duo/TESTING-PHASE3.md
git commit -m "docs: add Phase 3 manual testing checklist"
```

---

## Task 9: End-to-End Verification

**Files:**
- Run complete test suite

- [ ] **Step 1: Run all automated tests**

```bash
cd .gitlab-duo/mcp-server
npm test
```

Expected: All 109 tests PASS (no new tests in Phase 3, reuses existing)

- [ ] **Step 2: Test local install.sh still works**

```bash
cd ~/superpowers
bash .gitlab-duo/install.sh
```

Expected: Local installation still works (for development)

- [ ] **Step 3: Test universal installer locally**

```bash
cd /tmp/test-universal
node ~/superpowers/.gitlab-duo/install-universal.mjs
```

Expected: Universal installation works

- [ ] **Step 4: Verify no breaking changes**

```bash
# Start GitLab Duo
duo

# Test commands:
# - "What prompts are available?"
# - "Use initialize-superpowers prompt"
# - "Read superpowers://diagnostics"
```

Expected: All features from Phase 1 & 2 work

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "test: verify Phase 3 implementation complete"
```

---

## Completion Checklist

### Code Quality
- [ ] All tests pass (109 tests)
- [ ] No console errors
- [ ] Code follows DRY principles
- [ ] YAGNI applied (no NPM package yet)
- [ ] TDD followed (tests first)

### Functionality
- [ ] Universal installer works
- [ ] Downloads from GitHub
- [ ] Installs to correct locations
- [ ] Configures GitLab Duo
- [ ] Works on Windows, macOS, Linux
- [ ] Handles errors gracefully

### Testing
- [ ] Unit tests: Environment detection
- [ ] Unit tests: Download functions
- [ ] Unit tests: Configuration
- [ ] Unit tests: Gitignore update
- [ ] E2E test: Full installation
- [ ] Windows test: With/without bash

### Documentation
- [ ] README.md updated with one-liner
- [ ] INSTALL.md updated
- [ ] docs/README.gitlab-duo.md updated
- [ ] QUICKSTART.md updated
- [ ] TESTING-PHASE3.md created

---

**Plan complete!** All tasks follow TDD (tests exported functions), YAGNI (no NPM package yet), and DRY (reuse Phase 1 & 2 components).
