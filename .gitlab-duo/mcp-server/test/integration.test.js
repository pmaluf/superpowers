import { describe, it, expect } from 'vitest';
import { CapabilitiesDetector } from '../src/capabilities-detector.js';
import { createToolAdapter } from '../src/tool-adapter.js';
import { generateWelcome } from '../src/resources/welcome.js';
import { generateBootstrap } from '../src/resources/bootstrap.js';
import { generateCapabilities } from '../src/resources/capabilities.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('MCP Server Integration', () => {
  describe('Resources', () => {
    it('should generate welcome resource', () => {
      const content = generateWelcome();
      
      expect(content).toContain('Welcome to Superpowers');
      expect(content).toContain('🚀');
    });

    it('should generate capabilities resource', async () => {
      const detector = new CapabilitiesDetector(path.join(__dirname, 'fixtures', 'capabilities.json'));
      await detector.load();
      
      const content = generateCapabilities(detector);
      
      expect(content).toContain('GitLab Duo CLI Capabilities');
      expect(content).toContain('Subagent Support');
    });

    it('should generate enhanced bootstrap', async () => {
      const detector = new CapabilitiesDetector(path.join(__dirname, 'fixtures', 'capabilities.json'));
      await detector.load();
      
      const mockSkill = {
        name: 'using-superpowers',
        content: 'Test content'
      };
      
      const content = generateBootstrap(mockSkill, detector);
      
      expect(content).toContain('First Time Setup');
      expect(content).toContain('MCP Tools Available');
      expect(content).toContain('Test content');
    });
  });

  describe('Prompts', () => {
    it('should create initialize-superpowers prompt content', async () => {
      const detector = new CapabilitiesDetector(path.join(__dirname, 'fixtures', 'capabilities.json'));
      await detector.load();
      
      const mockSkill = {
        name: 'using-superpowers',
        content: 'Test content'
      };
      
      const bootstrapContent = generateBootstrap(mockSkill, detector);
      const welcomeContent = generateWelcome();
      const fullContent = `${bootstrapContent}\n\n---\n\n${welcomeContent}`;
      
      expect(fullContent).toContain('using-superpowers');
      expect(fullContent).toContain('Tool Mapping');
      expect(fullContent).toContain('Welcome to Superpowers');
    });
  });

  describe('Tools', () => {
    it('should list Superpowers tools', () => {
      const toolAdapter = createToolAdapter();
      const tools = toolAdapter.listTools();
      
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('Read');
      expect(toolNames).toContain('Write');
      expect(toolNames).toContain('Edit');
      expect(toolNames).toContain('Bash');
    });

    it('should call Read tool', () => {
      const toolAdapter = createToolAdapter();
      const result = toolAdapter.callTool('Read', { path: 'test.js' });
      
      expect(result.content[0].text).toContain('read_file');
      expect(result.content[0].text).toContain('test.js');
    });
  });
});
