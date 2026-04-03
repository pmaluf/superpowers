import { describe, it, expect } from 'vitest';
import { generateDiagnostics } from '../src/resources/diagnostics.js';

describe('Diagnostics Resource', () => {
  const mockHealthChecker = {
    check: async () => ({
      status: 'healthy',
      timestamp: '2026-04-03T16:00:00Z',
      skills: {
        total: 14,
        loaded: ['brainstorming', 'test-driven-development', 'systematic-debugging']
      },
      capabilities: 'Subagents: No, Tools: 7/8',
      tools: {
        mcp: ['Read', 'Write', 'Edit', 'Bash'],
        gitlab: ['read_file', 'edit_file', 'run_command']
      },
      issues: [],
      recommendations: ['All good', 'Use executing-plans']
    })
  };

  it('should generate diagnostics content', async () => {
    const content = await generateDiagnostics(mockHealthChecker);
    
    expect(content).toContain('Superpowers Diagnostics');
    expect(content).toContain('System Health');
  });

  it('should show status with emoji', async () => {
    const content = await generateDiagnostics(mockHealthChecker);
    
    expect(content).toContain('Status: ✅ HEALTHY');
  });

  it('should show timestamp', async () => {
    const content = await generateDiagnostics(mockHealthChecker);
    
    expect(content).toContain('2026-04-03T16:00:00Z');
  });

  it('should list skills count', async () => {
    const content = await generateDiagnostics(mockHealthChecker);
    
    expect(content).toContain('14 loaded');
  });

  it('should list all loaded skills', async () => {
    const content = await generateDiagnostics(mockHealthChecker);
    
    expect(content).toContain('1. brainstorming');
    expect(content).toContain('2. test-driven-development');
    expect(content).toContain('3. systematic-debugging');
  });

  it('should list MCP tools', async () => {
    const content = await generateDiagnostics(mockHealthChecker);
    
    expect(content).toContain('MCP Tools:');
    expect(content).toContain('- Read');
    expect(content).toContain('- Write');
  });

  it('should list GitLab tools', async () => {
    const content = await generateDiagnostics(mockHealthChecker);
    
    expect(content).toContain('GitLab Duo Tools:');
    expect(content).toContain('- read_file ✅');
  });

  it('should show "None detected" when no issues', async () => {
    const content = await generateDiagnostics(mockHealthChecker);
    
    expect(content).toContain('None detected ✅');
  });

  it('should show issues when present', async () => {
    const checkerWithIssues = {
      check: async () => ({
        ...await mockHealthChecker.check(),
        status: 'warnings',
        issues: ['Test warning', 'Another issue']
      })
    };

    const content = await generateDiagnostics(checkerWithIssues);
    
    expect(content).toContain('⚠️ Test warning');
    expect(content).toContain('⚠️ Another issue');
  });

  it('should include recommendations', async () => {
    const content = await generateDiagnostics(mockHealthChecker);
    
    expect(content).toContain('Recommendations');
    expect(content).toContain('All good');
    expect(content).toContain('Use executing-plans');
  });

  it('should include troubleshooting section', async () => {
    const content = await generateDiagnostics(mockHealthChecker);
    
    expect(content).toContain('Troubleshooting');
    expect(content).toContain('detect-capabilities.sh');
  });

  it('should include quick reference', async () => {
    const content = await generateDiagnostics(mockHealthChecker);
    
    expect(content).toContain('Quick Reference');
    expect(content).toContain('List skills');
  });
});
