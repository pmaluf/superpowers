import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Import functions from install-universal.mjs
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
    let testDir;
    
    beforeEach(async () => {
      testDir = path.join(os.tmpdir(), 'test-download-' + Date.now());
      await fs.mkdir(testDir, { recursive: true });
    });
    
    afterEach(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it('should download file from URL', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '# Test content'
      });
      global.fetch = mockFetch;
      
      const testFile = path.join(testDir, 'test.md');
      await downloadFile('https://test.com/file.md', testFile);
      
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('# Test content');
    });
    
    it('should create parent directories', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'content'
      });
      global.fetch = mockFetch;
      
      const testFile = path.join(testDir, 'deep', 'nested', 'file.txt');
      await downloadFile('https://test.com/file.txt', testFile);
      
      const exists = await fs.access(testFile).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
    
    it('should throw on network error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      });
      global.fetch = mockFetch;
      
      await expect(downloadFile('https://test.com/missing.txt', path.join(testDir, 'test.txt')))
        .rejects.toThrow();
    });
  });

  describe('downloadDirectory', () => {
    let testDir;
    
    beforeEach(async () => {
      testDir = path.join(os.tmpdir(), 'test-dir-' + Date.now());
      await fs.mkdir(testDir, { recursive: true });
    });
    
    afterEach(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

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
      
      await downloadDirectory('remote/path', testDir);
      
      const file1Exists = await fs.access(path.join(testDir, 'file1.md'))
        .then(() => true).catch(() => false);
      const file2Exists = await fs.access(path.join(testDir, 'subdir', 'file2.md'))
        .then(() => true).catch(() => false);
      
      expect(file1Exists).toBe(true);
      expect(file2Exists).toBe(true);
    });
  });

  describe('downloadSkills', () => {
    let testDir;
    
    beforeEach(async () => {
      testDir = path.join(os.tmpdir(), 'test-skills-' + Date.now());
      await fs.mkdir(testDir, { recursive: true });
    });
    
    afterEach(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

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
      
      await downloadSkills(testDir);
      
      const brainstormingExists = await fs.access(path.join(testDir, 'brainstorming', 'SKILL.md'))
        .then(() => true).catch(() => false);
      
      expect(brainstormingExists).toBe(true);
    });
  });

  describe('configureGitLabDuo', () => {
    let testHome;
    let originalHomedir;
    let originalCwd;
    
    beforeEach(async () => {
      testHome = path.join(os.tmpdir(), 'test-home-' + Date.now());
      await fs.mkdir(testHome, { recursive: true });
      originalHomedir = os.homedir;
      originalCwd = process.cwd();
      
      // Create test project directory
      const testProject = path.join(testHome, 'project');
      await fs.mkdir(testProject, { recursive: true });
      process.chdir(testProject);
      
      // Mock homedir
      os.homedir = () => testHome;
    });
    
    afterEach(async () => {
      process.chdir(originalCwd);
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
  });

  describe('updateGitignore', () => {
    let testDir;
    let originalCwd;
    
    beforeEach(async () => {
      testDir = path.join(os.tmpdir(), 'test-gitignore-' + Date.now());
      await fs.mkdir(testDir, { recursive: true });
      originalCwd = process.cwd();
      process.chdir(testDir);
    });
    
    afterEach(async () => {
      process.chdir(originalCwd);
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
    let testDir;
    let originalCwd;
    
    beforeEach(async () => {
      testDir = path.join(os.tmpdir(), 'test-caps-' + Date.now());
      await fs.mkdir(testDir, { recursive: true });
      originalCwd = process.cwd();
      process.chdir(testDir);
    });
    
    afterEach(async () => {
      process.chdir(originalCwd);
      await fs.rm(testDir, { recursive: true, force: true });
    });

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
