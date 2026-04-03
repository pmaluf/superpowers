import { describe, it, expect, beforeEach } from 'vitest';
import { HealthChecker } from '../src/diagnostics/health-checker.js';

describe('HealthChecker', () => {
  let healthChecker;
  let mockValidator;
  let mockCapabilities;
  let mockSkills;

  beforeEach(() => {
    mockValidator = {
      validate: async () => ({
        overall: 'healthy',
        checks: {
          skillsLoaded: { status: 'pass', count: 14 },
          toolsAvailable: { status: 'pass', available: 7, total: 8 }
        },
        warnings: [],
        recommendations: ['All good']
      })
    };

    mockCapabilities = {
      getSummary: () => 'Subagents: No, Tools: 7/8',
      capabilities: {
        tools: {
          read_file: true,
          edit_file: true,
          create_file_with_contents: true,
          run_command: true,
          grep: true,
          find_files: true,
          gitlab_documentation_search: true,
          web_search: false
        }
      }
    };

    mockSkills = [
      { name: 'brainstorming' },
      { name: 'test-driven-development' },
      { name: 'systematic-debugging' }
    ];

    healthChecker = new HealthChecker(mockValidator, mockCapabilities, mockSkills);
  });

  describe('check', () => {
    it('should return health check result', async () => {
      const result = await healthChecker.check();
      
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('skills');
      expect(result).toHaveProperty('capabilities');
      expect(result).toHaveProperty('tools');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('recommendations');
    });

    it('should include timestamp', async () => {
      const result = await healthChecker.check();
      
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should include skills count', async () => {
      const result = await healthChecker.check();
      
      expect(result.skills.total).toBe(3);
      expect(result.skills.loaded).toContain('brainstorming');
      expect(result.skills.loaded).toContain('test-driven-development');
    });

    it('should include capabilities summary', async () => {
      const result = await healthChecker.check();
      
      expect(result.capabilities).toBe('Subagents: No, Tools: 7/8');
    });

    it('should list MCP tools', async () => {
      const result = await healthChecker.check();
      
      expect(result.tools.mcp).toEqual(['Read', 'Write', 'Edit', 'Bash']);
    });

    it('should list available GitLab tools', async () => {
      const result = await healthChecker.check();
      
      expect(result.tools.gitlab).toContain('read_file');
      expect(result.tools.gitlab).toContain('edit_file');
      expect(result.tools.gitlab).not.toContain('web_search');
    });

    it('should include validation issues', async () => {
      mockValidator.validate = async () => ({
        overall: 'warnings',
        checks: {},
        warnings: ['Test warning'],
        recommendations: []
      });

      const result = await healthChecker.check();
      
      expect(result.issues).toContain('Test warning');
    });

    it('should include validation recommendations', async () => {
      const result = await healthChecker.check();
      
      expect(result.recommendations).toContain('All good');
    });

    it('should reflect validation status', async () => {
      mockValidator.validate = async () => ({
        overall: 'warnings',
        checks: {},
        warnings: ['Issue'],
        recommendations: []
      });

      const result = await healthChecker.check();
      
      expect(result.status).toBe('warnings');
    });
  });
});
