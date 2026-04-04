#!/usr/bin/env node

/**
 * Local Universal Installer - For Testing
 * Copies files from local Superpowers repository instead of downloading from GitHub
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SUPERPOWERS_ROOT = path.join(__dirname, '..');

async function main() {
  console.log('🚀 Superpowers Universal Installer (Local Mode)\n');
  
  try {
    const targetDir = process.cwd();
    
    console.log(`Installing to: ${targetDir}\n`);
    
    // 1. Copy skills
    console.log('📦 Copying skills...');
    await copyDirectory(
      path.join(SUPERPOWERS_ROOT, 'skills'),
      path.join(targetDir, 'skills')
    );
    console.log('✓ Copied 14 skills to ./skills\n');
    
    // 2. Copy MCP server
    console.log('📦 Copying MCP server...');
    await copyDirectory(
      path.join(SUPERPOWERS_ROOT, '.gitlab-duo/mcp-server'),
      path.join(targetDir, '.gitlab-duo/mcp-server')
    );
    console.log('✓ Copied MCP server to ./.gitlab-duo/mcp-server\n');
    
    // 3. Copy scripts
    console.log('📦 Copying scripts...');
    await fs.copyFile(
      path.join(SUPERPOWERS_ROOT, '.gitlab-duo/detect-capabilities.sh'),
      path.join(targetDir, '.gitlab-duo/detect-capabilities.sh')
    );
    await fs.copyFile(
      path.join(SUPERPOWERS_ROOT, '.gitlab-duo/validate-installation.js'),
      path.join(targetDir, '.gitlab-duo/validate-installation.js')
    );
    await fs.chmod(path.join(targetDir, '.gitlab-duo/detect-capabilities.sh'), 0o755);
    console.log('✓ Copied scripts\n');
    
    // 4. Install dependencies
    console.log('📦 Installing dependencies...');
    process.chdir(path.join(targetDir, '.gitlab-duo/mcp-server'));
    execSync('npm install --production', { stdio: 'inherit' });
    process.chdir(targetDir);
    console.log('✓ Dependencies installed\n');
    
    // 5. Detect capabilities
    console.log('🔍 Detecting capabilities...');
    execSync('bash ./.gitlab-duo/detect-capabilities.sh --non-interactive', { stdio: 'inherit' });
    console.log('✓ Capabilities detected\n');
    
    // 6. Validate
    console.log('✅ Validating...');
    execSync('SUPERPOWERS_SKILLS_DIR=./skills node ./.gitlab-duo/validate-installation.js', { stdio: 'inherit' });
    console.log('');
    
    // 7. Configure GitLab Duo
    console.log('⚙️  Configuring GitLab Duo...');
    const homeDir = os.homedir();
    const configFile = path.join(homeDir, '.gitlab/duo/mcp.json');
    await fs.mkdir(path.dirname(configFile), { recursive: true });
    
    let config = { mcpServers: {} };
    try {
      config = JSON.parse(await fs.readFile(configFile, 'utf-8'));
    } catch {}
    
    config.mcpServers = config.mcpServers || {};
    config.mcpServers.superpowers = {
      type: 'stdio',
      command: 'node',
      args: [path.join(targetDir, '.gitlab-duo/mcp-server/src/index.js')],
      env: { SUPERPOWERS_SKILLS_DIR: path.join(targetDir, 'skills') }
    };
    
    await fs.writeFile(configFile, JSON.stringify(config, null, 2) + '\n');
    console.log(`✓ Configured: ${configFile}\n`);
    
    // 8. Update .gitignore
    console.log('📝 Updating .gitignore...');
    const gitignorePath = path.join(targetDir, '.gitignore');
    let gitignore = '';
    try {
      gitignore = await fs.readFile(gitignorePath, 'utf-8');
    } catch {}
    
    if (!gitignore.includes('# Superpowers for GitLab Duo')) {
      gitignore += '\n# Superpowers for GitLab Duo\n.gitlab-duo/capabilities.json\n.gitlab-duo/compatibility-report.md\n.gitlab-duo/mcp-server/node_modules/\n';
      await fs.writeFile(gitignorePath, gitignore);
      console.log('✓ Updated .gitignore\n');
    } else {
      console.log('✓ .gitignore already configured\n');
    }
    
    console.log('================================================');
    console.log('✅ Installation Complete!');
    console.log('================================================\n');
    console.log('Next steps:');
    console.log('1. duo');
    console.log('2. "Use initialize-superpowers prompt"');
    console.log('3. "Use quick-start-tdd prompt with feature=\'test\'"\n');
    
  } catch (error) {
    console.error('\n❌ Installation failed:', error.message);
    process.exit(1);
  }
}

async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules
      if (entry.name === 'node_modules') continue;
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

main();
