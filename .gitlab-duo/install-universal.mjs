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
export async function updateGitignore(projectDir = '.') {
  console.log('📝 Updating .gitignore...');
  
  const gitignorePath = path.join(projectDir, '.gitignore');
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
export async function createDefaultCapabilities(projectDir = '.') {
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
    path.join(projectDir, '.gitlab-duo/capabilities.json'),
    JSON.stringify(capabilities, null, 2) + '\n'
  );
}

// Main installation flow
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
