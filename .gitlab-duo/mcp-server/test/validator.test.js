import { describe, it, expect, beforeEach } from 'vitest';
import { InstallationValidator } from '../src/diagnostics/validator.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('InstallationValidator', () => {
  let validator;
  let mockCapabilities;
  const skillsDir = path.join(__dirname, '../../../skills');

  beforeEach(() => {
    mockCapabilities = {
      capabilities: {
        detected_at: '2026-04-03T10:00:00Z',
        gitlab_duo_version: '8.82.0',
        tools: {
          read_file: true,
          edit_file: true,
          web_search: false
        }
      },
      hasSubagentSupport: () => false
    };

    validator = new InstallationValidator(mockCapabilities, skillsDir);
  });

  describe('validate', () => {
    it('should return validation result', async () => {
      const result = await validator.validate();
      
      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('recommendations');
    });

    it('should have healthy status when all checks pass', async () => {
      const result = await validator.validate();
      
      expect(['healthy', 'warnings']).toContain(result.overall);
    });
  });

  describe('checkSkillsLoaded', () => {
    it('should detect skills in directory', async () => {
      const result = await validator.checkSkillsLoaded();
      
      expect(result.status).toBe('pass');
      expect(result.count).toBeGreaterThan(0);
    });

    it('should count skills correctly', async () => {
      const result = await validator.checkSkillsLoaded();
      
      expect(result.count).toBeGreaterThanOrEqual(14);
      expect(result.message).toContain('skills found');
    });

    it('should fail gracefully if directory missing', async () => {
      const badValidator = new InstallationValidator(mockCapabilities, '/nonexistent');
      const result = await badValidator.checkSkillsLoaded();
      
      expect(result.status).toBe('fail');
      expect(result.count).toBe(0);
    });
  });

  describe('checkToolsAvailable', () => {
    it('should check tool availability', async () => {
      const result = await validator.checkToolsAvailable();
      
      expect(result.status).toBe('pass');
      expect(result.available).toBe(2);
      expect(result.total).toBe(3);
    });

    it('should pass when some tools available', async () => {
      const result = await validator.checkToolsAvailable();
      
      expect(result.status).toBe('pass');
      expect(result.message).toContain('2/3 tools available');
    });

    it('should fail when no tools available', async () => {
      mockCapabilities.capabilities.tools = {};
      
      const result = await validator.checkToolsAvailable();
      
      expect(result.status).toBe('fail');
    });
  });

  describe('checkMcpServer', () => {
    it('should pass if module loads', async () => {
      const result = await validator.checkMcpServer();
      
      expect(result.status).toBe('pass');
      expect(result.message).toContain('loads successfully');
    });
  });

  describe('checkConfiguration', () => {
    it('should pass when capabilities detected', async () => {
      const result = await validator.checkConfiguration();
      
      expect(result.status).toBe('pass');
      expect(result.message).toContain('Capabilities detected');
    });

    it('should warn when capabilities not detected', async () => {
      mockCapabilities.capabilities.detected_at = null;
      
      const result = await validator.checkConfiguration();
      
      expect(result.status).toBe('warning');
      expect(result.message).toContain('not detected');
    });
  });

  describe('collectWarnings', () => {
    it('should warn about missing tools', () => {
      const checks = {
        toolsAvailable: { available: 2, total: 3 },
        configuration: { status: 'pass' }
      };
      
      const warnings = validator.collectWarnings(checks);
      
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('1 tool(s) not available');
    });

    it('should warn about missing capabilities', () => {
      const checks = {
        toolsAvailable: { available: 3, total: 3 },
        configuration: { status: 'warning' }
      };
      
      const warnings = validator.collectWarnings(checks);
      
      expect(warnings).toContain('Capabilities not detected - run: bash .gitlab-duo/detect-capabilities.sh');
    });

    it('should return empty array when no issues', () => {
      const checks = {
        toolsAvailable: { available: 3, total: 3 },
        configuration: { status: 'pass' }
      };
      
      const warnings = validator.collectWarnings(checks);
      
      expect(warnings).toEqual([]);
    });
  });

  describe('generateRecommendations', () => {
    it('should recommend executing-plans when no subagents', () => {
      const checks = {};
      const warnings = [];
      
      const recs = validator.generateRecommendations(checks, warnings);
      
      expect(recs).toContain('Use executing-plans for multi-task workflows');
    });

    it('should confirm compatibility when no warnings', () => {
      const checks = { skillsLoaded: { count: 14 } };
      const warnings = [];
      
      const recs = validator.generateRecommendations(checks, warnings);
      
      expect(recs).toContain('Installation is fully compatible - ready to use!');
    });
  });

  describe('generateReport', () => {
    it('should generate markdown report', async () => {
      const report = await validator.generateReport();
      
      expect(report).toContain('Compatibility Report');
      expect(report).toContain('Overall Status');
      expect(report).toContain('Checks');
    });

    it('should include all check results', async () => {
      const report = await validator.generateReport();
      
      expect(report).toContain('skillsLoaded');
      expect(report).toContain('toolsAvailable');
      expect(report).toContain('mcpServer');
      expect(report).toContain('configuration');
    });

    it('should include recommendations', async () => {
      const report = await validator.generateReport();
      
      expect(report).toContain('Recommendations');
    });

    it('should include next steps', async () => {
      const report = await validator.generateReport();
      
      expect(report).toContain('Next Steps');
      expect(report).toContain('duo');
    });
  });
});
