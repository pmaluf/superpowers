import { describe, it, expect } from 'vitest';
import { generateWelcome } from '../src/resources/welcome.js';
import { generateBootstrap } from '../src/resources/bootstrap.js';
import { generateCapabilities } from '../src/resources/capabilities.js';
import { CapabilitiesDetector } from '../src/capabilities-detector.js';

describe('Welcome Resource', () => {
  it('should generate welcome content', () => {
    const content = generateWelcome();
    
    expect(content).toContain('Welcome to Superpowers');
    expect(content).toContain('🚀');
  });

  it('should include quick start steps', () => {
    const content = generateWelcome();
    
    expect(content).toContain('Quick Start');
    expect(content).toContain('3 steps');
  });

  it('should list available resources', () => {
    const content = generateWelcome();
    
    expect(content).toContain('superpowers://bootstrap');
    expect(content).toContain('superpowers://capabilities');
    expect(content).toContain('superpowers://skill/');
  });

  it('should include troubleshooting section', () => {
    const content = generateWelcome();
    
    expect(content).toContain('Troubleshooting');
    expect(content).toContain('detect-capabilities.sh');
  });
});

describe('Bootstrap Resource', () => {
  const mockSkill = {
    name: 'using-superpowers',
    content: 'Mock skill content'
  };

  it('should include first time setup section', () => {
    const mockCapabilities = {
      getSummary: () => 'Subagents: No, Tools: 7/8',
      hasSubagentSupport: () => false
    };
    
    const content = generateBootstrap(mockSkill, mockCapabilities);
    
    expect(content).toContain('First Time Setup');
    expect(content).toContain('✓');
  });

  it('should include capabilities summary', () => {
    const mockCapabilities = {
      getSummary: () => 'Subagents: No, Tools: 7/8',
      hasSubagentSupport: () => false
    };
    
    const content = generateBootstrap(mockSkill, mockCapabilities);
    
    expect(content).toContain('Subagents: No');
    expect(content).toContain('Tools: 7/8');
  });

  it('should include skill content', () => {
    const mockCapabilities = {
      getSummary: () => 'Test',
      hasSubagentSupport: () => false
    };
    
    const content = generateBootstrap(mockSkill, mockCapabilities);
    
    expect(content).toContain('Mock skill content');
  });

  it('should list MCP tools', () => {
    const mockCapabilities = {
      getSummary: () => 'Test',
      hasSubagentSupport: () => false
    };
    
    const content = generateBootstrap(mockSkill, mockCapabilities);
    
    expect(content).toContain('MCP Tools Available');
    expect(content).toContain('Read');
    expect(content).toContain('Write');
    expect(content).toContain('Edit');
    expect(content).toContain('Bash');
  });

  it('should show subagent status in tool mapping', () => {
    const capsWithSubagents = {
      getSummary: () => 'Test',
      hasSubagentSupport: () => true
    };
    
    const content = generateBootstrap(mockSkill, capsWithSubagents);
    
    expect(content).toContain('**Subagents:** Supported ✓');
  });

  it('should show fallback when no subagents', () => {
    const capsNoSubagents = {
      getSummary: () => 'Test',
      hasSubagentSupport: () => false
    };
    
    const content = generateBootstrap(mockSkill, capsNoSubagents);
    
    expect(content).toContain('executing-plans');
  });

  it('should be reusable (DRY)', () => {
    const mockCapabilities = {
      getSummary: () => 'Test',
      hasSubagentSupport: () => false
    };
    
    const c1 = generateBootstrap(mockSkill, mockCapabilities);
    const c2 = generateBootstrap(mockSkill, mockCapabilities);
    
    expect(c1).toBe(c2);
  });
});

describe('Capabilities Resource', () => {
  it('should show subagent status', () => {
    const detector = new CapabilitiesDetector();
    detector.capabilities = {
      subagents: { supported: false },
      tools: { read_file: true },
      detected_at: '2026-04-03T10:00:00Z',
      gitlab_duo_version: '8.82.0'
    };
    
    const content = generateCapabilities(detector);
    
    expect(content).toContain('Subagent Support');
    expect(content).toContain('❌ Not Supported');
  });

  it('should list available tools', () => {
    const detector = new CapabilitiesDetector();
    detector.capabilities = {
      subagents: { supported: false },
      tools: { 
        read_file: true,
        edit_file: true,
        web_search: false
      },
      detected_at: '2026-04-03T10:00:00Z',
      gitlab_duo_version: '8.82.0'
    };
    
    const content = generateCapabilities(detector);
    
    expect(content).toContain('✅ read_file');
    expect(content).toContain('✅ edit_file');
    expect(content).toContain('❌ web_search');
  });

  it('should show fallback instructions when no subagents', () => {
    const detector = new CapabilitiesDetector();
    detector.capabilities = {
      subagents: { supported: false },
      tools: {},
      detected_at: '2026-04-03T10:00:00Z',
      gitlab_duo_version: '8.82.0'
    };
    
    const content = generateCapabilities(detector);
    
    expect(content).toContain('executing-plans');
    expect(content).toContain('Skills affected');
    expect(content).toContain('subagent-driven-development');
  });

  it('should include metadata', () => {
    const detector = new CapabilitiesDetector();
    detector.capabilities = {
      subagents: { supported: false },
      tools: {},
      detected_at: '2026-04-03T10:00:00Z',
      gitlab_duo_version: '8.82.0'
    };
    
    const content = generateCapabilities(detector);
    
    expect(content).toContain('2026-04-03T10:00:00Z');
    expect(content).toContain('8.82.0');
  });

  it('should include update instructions', () => {
    const detector = new CapabilitiesDetector();
    detector.capabilities = {
      subagents: {},
      tools: {},
      detected_at: null,
      gitlab_duo_version: 'unknown'
    };
    
    const content = generateCapabilities(detector);
    
    expect(content).toContain('detect-capabilities.sh');
    expect(content).toContain('Update Capabilities');
  });
});
