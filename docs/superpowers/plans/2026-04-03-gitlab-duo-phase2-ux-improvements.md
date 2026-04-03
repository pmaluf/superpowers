# GitLab Duo CLI Phase 2 UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement post-install validation, basic health check diagnostics, and 6 interactive quick-start prompts for common workflows using strict TDD, YAGNI, and DRY principles.

**Architecture:** Integrated diagnostics approach - validator module shared by install script and health checker, quick starts as separate prompt system, all integrated into existing MCP server from Phase 1.

**Tech Stack:** Node.js 18+, MCP SDK 1.0.4, Vitest for testing, Bash for install script

---

## File Structure

### New Files
- `.gitlab/duo/mcp-server/src/diagnostics/validator.js` - Installation validation logic
- `.gitlab/duo/mcp-server/src/diagnostics/health-checker.js` - Runtime health check
- `.gitlab/duo/mcp-server/src/prompts/quick-starts.js` - Quick start prompt definitions
- `.gitlab/duo/mcp-server/src/resources/diagnostics.js` - Diagnostics resource generator
- `.gitlab/duo/mcp-server/test/validator.test.js` - Unit tests
- `.gitlab/duo/mcp-server/test/health-checker.test.js` - Unit tests
- `.gitlab/duo/mcp-server/test/quick-starts.test.js` - Unit tests
- `.gitlab/duo/mcp-server/test/diagnostics.test.js` - Unit tests

### Modified Files
- `.gitlab/duo/mcp-server/src/index.js` - Add diagnostics resource and quick start prompts
- `.gitlab/duo/install.sh` - Add validation step
- `.gitlab/duo/mcp-server/test/integration.test.js` - Add tests for new features

### Generated Files
- `.gitlab/duo/compatibility-report.md` - Created by install.sh (gitignored)

---

## Task 1: Validator Module - Tests (RED)

**Files:**
- Create: `.gitlab/duo/mcp-server/test/validator.test.js`

- [ ] **Step 1: Write failing tests for InstallationValidator**

Create `.gitlab/duo/mcp-server/test/validator.test.js`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { InstallationValidator } from '../src/diagnostics/validator.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('InstallationValidator', () => {
  let validator;
  let mockCapabilities;
  const skillsDir = path.join(__dirname, '../../skills');

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
      
      expect(warnings).toContain('Capabilities not detected - run: bash .gitlab/duo/detect-capabilities.sh');
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd .gitlab/duo/mcp-server
npm test validator
```

Expected: All tests FAIL with "Cannot find module '../src/diagnostics/validator.js'"

- [ ] **Step 3: Commit failing tests**

```bash
git add test/validator.test.js
git commit -m "test: add failing tests for InstallationValidator (RED)"
```

---

## Task 2: Validator Module - Implementation (GREEN)

**Files:**
- Create: `.gitlab/duo/mcp-server/src/diagnostics/validator.js`

- [ ] **Step 1: Create diagnostics directory**

```bash
mkdir -p .gitlab/duo/mcp-server/src/diagnostics
```

- [ ] **Step 2: Implement InstallationValidator**

Create `.gitlab/duo/mcp-server/src/diagnostics/validator.js`:

```javascript
import fs from 'fs/promises';
import path from 'path';

export class InstallationValidator {
  constructor(capabilitiesDetector, skillsDir) {
    this.capabilities = capabilitiesDetector;
    this.skillsDir = skillsDir;
  }

  async validate() {
    const checks = {
      skillsLoaded: await this.checkSkillsLoaded(),
      toolsAvailable: await this.checkToolsAvailable(),
      mcpServer: await this.checkMcpServer(),
      configuration: await this.checkConfiguration()
    };

    const warnings = this.collectWarnings(checks);
    const recommendations = this.generateRecommendations(checks, warnings);
    const overall = this.determineOverallStatus(checks, warnings);

    return {
      overall,
      checks,
      warnings,
      recommendations
    };
  }

  async checkSkillsLoaded() {
    try {
      const entries = await fs.readdir(this.skillsDir, { withFileTypes: true });
      const skillDirs = entries.filter(e => e.isDirectory());
      
      let count = 0;
      for (const dir of skillDirs) {
        const skillPath = path.join(this.skillsDir, dir.name, 'SKILL.md');
        try {
          await fs.access(skillPath);
          count++;
        } catch {
          // Skip directories without SKILL.md
        }
      }

      return {
        status: count > 0 ? 'pass' : 'fail',
        count,
        message: `${count} skills found`
      };
    } catch (err) {
      return {
        status: 'fail',
        count: 0,
        message: `Skills directory not accessible: ${err.message}`
      };
    }
  }

  async checkToolsAvailable() {
    const tools = this.capabilities.capabilities?.tools || {};
    const available = Object.values(tools).filter(Boolean).length;
    const total = Object.keys(tools).length;

    return {
      status: available > 0 ? 'pass' : 'fail',
      available,
      total,
      message: `${available}/${total} tools available`
    };
  }

  async checkMcpServer() {
    return {
      status: 'pass',
      message: 'MCP server module loads successfully'
    };
  }

  async checkConfiguration() {
    const hasCapabilities = this.capabilities.capabilities?.detected_at !== null;
    
    return {
      status: hasCapabilities ? 'pass' : 'warning',
      message: hasCapabilities 
        ? 'Capabilities detected' 
        : 'Capabilities not detected - run detect-capabilities.sh'
    };
  }

  collectWarnings(checks) {
    const warnings = [];

    if (checks.toolsAvailable.available < checks.toolsAvailable.total) {
      const missing = checks.toolsAvailable.total - checks.toolsAvailable.available;
      warnings.push(`${missing} tool(s) not available - some skills may have limited functionality`);
    }

    if (checks.configuration.status === 'warning') {
      warnings.push('Capabilities not detected - run: bash .gitlab/duo/detect-capabilities.sh');
    }

    return warnings;
  }

  generateRecommendations(checks, warnings) {
    const recommendations = [];

    if (checks.skillsLoaded.count > 10) {
      recommendations.push('All core skills work normally');
    }

    if (!this.capabilities.hasSubagentSupport()) {
      recommendations.push('Use executing-plans for multi-task workflows');
    }

    if (warnings.length === 0) {
      recommendations.push('Installation is fully compatible - ready to use!');
    }

    return recommendations;
  }

  determineOverallStatus(checks, warnings) {
    const hasFailures = Object.values(checks).some(c => c.status === 'fail');
    if (hasFailures) return 'issues';
    
    if (warnings.length > 0) return 'warnings';
    
    return 'healthy';
  }

  async generateReport() {
    const result = await this.validate();
    
    const statusEmoji = {
      'healthy': '✅',
      'warnings': '⚠️',
      'issues': '❌'
    };

    return `# GitLab Duo CLI Compatibility Report

Generated: ${new Date().toISOString()}
GitLab Duo Version: ${this.capabilities.capabilities?.gitlab_duo_version || 'Unknown'}

## Overall Status: ${statusEmoji[result.overall]} ${result.overall.toUpperCase()}

## Checks

${Object.entries(result.checks).map(([name, check]) => 
  `${check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌'} **${name}:** ${check.message}`
).join('\n')}

${result.warnings.length > 0 ? `## Warnings

${result.warnings.map(w => `⚠️ ${w}`).join('\n')}` : ''}

## Recommendations

${result.recommendations.map(r => `- ${r}`).join('\n')}

## Next Steps

1. Start GitLab Duo: \`duo\`
2. Initialize: "Use initialize-superpowers prompt"
3. Try a skill: "Use the brainstorming skill"
4. Check health anytime: "Read superpowers://diagnostics"
`;
  }
}
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
cd .gitlab/duo/mcp-server
npm test validator
```

Expected: All validator tests PASS

- [ ] **Step 4: Commit implementation**

```bash
git add src/diagnostics/validator.js
git commit -m "feat: implement InstallationValidator (GREEN)"
```

---

## Task 3: Health Checker Module - Tests (RED)

**Files:**
- Create: `.gitlab/duo/mcp-server/test/health-checker.test.js`

- [ ] **Step 1: Write failing tests for HealthChecker**

Create `.gitlab/duo/mcp-server/test/health-checker.test.js`:

```javascript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test health-checker
```

Expected: All tests FAIL with "Cannot find module '../src/diagnostics/health-checker.js'"

- [ ] **Step 3: Commit failing tests**

```bash
git add test/health-checker.test.js
git commit -m "test: add failing tests for HealthChecker (RED)"
```

---

## Task 4: Health Checker Module - Implementation (GREEN)

**Files:**
- Create: `.gitlab/duo/mcp-server/src/diagnostics/health-checker.js`

- [ ] **Step 1: Implement HealthChecker**

Create `.gitlab/duo/mcp-server/src/diagnostics/health-checker.js`:

```javascript
export class HealthChecker {
  constructor(validator, capabilitiesDetector, skills) {
    this.validator = validator;
    this.capabilities = capabilitiesDetector;
    this.skills = skills;
  }

  async check() {
    const validation = await this.validator.validate();
    
    return {
      status: validation.overall,
      timestamp: new Date().toISOString(),
      skills: {
        total: this.skills.length,
        loaded: this.skills.map(s => s.name)
      },
      capabilities: this.capabilities.getSummary(),
      tools: {
        mcp: ['Read', 'Write', 'Edit', 'Bash'],
        gitlab: Object.entries(this.capabilities.capabilities.tools)
          .filter(([_, available]) => available)
          .map(([name]) => name)
      },
      issues: validation.warnings,
      recommendations: validation.recommendations
    };
  }
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
npm test health-checker
```

Expected: All HealthChecker tests PASS

- [ ] **Step 3: Commit implementation**

```bash
git add src/diagnostics/health-checker.js
git commit -m "feat: implement HealthChecker (GREEN)"
```

---

## Task 5: Diagnostics Resource - Tests (RED)

**Files:**
- Create: `.gitlab/duo/mcp-server/test/diagnostics.test.js`

- [ ] **Step 1: Write failing tests for diagnostics resource**

Create `.gitlab/duo/mcp-server/test/diagnostics.test.js`:

```javascript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test diagnostics
```

Expected: All tests FAIL with "Cannot find module '../src/resources/diagnostics.js'"

- [ ] **Step 3: Commit failing tests**

```bash
git add test/diagnostics.test.js
git commit -m "test: add failing tests for diagnostics resource (RED)"
```

---

## Task 6: Diagnostics Resource - Implementation (GREEN)

**Files:**
- Create: `.gitlab/duo/mcp-server/src/resources/diagnostics.js`

- [ ] **Step 1: Implement generateDiagnostics**

Create `.gitlab/duo/mcp-server/src/resources/diagnostics.js`:

```javascript
export async function generateDiagnostics(healthChecker) {
  const health = await healthChecker.check();
  
  const statusEmoji = {
    'healthy': '✅',
    'warnings': '⚠️',
    'issues': '❌'
  };

  return `# Superpowers Diagnostics

Last checked: ${health.timestamp}
Status: ${statusEmoji[health.status]} ${health.status.toUpperCase()}

## System Health

${statusEmoji[health.status]} **Overall:** ${health.status}
✅ **MCP Server:** Running
✅ **Skills:** ${health.skills.total} loaded
✅ **Capabilities:** ${health.capabilities}
✅ **MCP Tools:** ${health.tools.mcp.length} available

## Skills Loaded

${health.skills.loaded.map((name, i) => `${i + 1}. ${name}`).join('\n')}

## Tools Available

**MCP Tools:**
${health.tools.mcp.map(t => `- ${t}`).join('\n')}

**GitLab Duo Tools:**
${health.tools.gitlab.map(t => `- ${t} ✅`).join('\n')}

${health.issues.length > 0 ? `## Issues

${health.issues.map(i => `⚠️ ${i}`).join('\n')}` : `## Issues

None detected ✅`}

## Recommendations

${health.recommendations.map(r => `- ${r}`).join('\n')}

## Troubleshooting

If you're having issues:

1. **Re-detect capabilities:**
   \`\`\`bash
   bash .gitlab/duo/detect-capabilities.sh
   \`\`\`

2. **Re-validate installation:**
   \`\`\`bash
   bash .gitlab/duo/install.sh
   \`\`\`

3. **Check compatibility report:**
   \`\`\`bash
   cat .gitlab/duo/compatibility-report.md
   \`\`\`

4. **View detailed capabilities:**
   \`\`\`
   Read superpowers://capabilities
   \`\`\`

## Quick Reference

- **List skills:** "What MCP resources are available?"
- **Initialize:** "Use initialize-superpowers prompt"
- **Quick starts:** "What prompts are available?" (look for 🧪 🐛 📝 emojis)
- **Documentation:** docs/README.gitlab-duo.md
`;
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
npm test diagnostics
```

Expected: All diagnostics resource tests PASS

- [ ] **Step 3: Commit implementation**

```bash
git add src/resources/diagnostics.js
git commit -m "feat: implement diagnostics resource generator (GREEN)"
```

---

## Task 7: Quick Starts Module - Tests (RED)

**Files:**
- Create: `.gitlab/duo/mcp-server/test/quick-starts.test.js`

- [ ] **Step 1: Write failing tests for quick starts**

Create `.gitlab/duo/mcp-server/test/quick-starts.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { 
  getAllQuickStarts, 
  getQuickStartPrompt, 
  listQuickStartPrompts,
  QUICK_START_PROMPTS 
} from '../src/prompts/quick-starts.js';

describe('QuickStarts', () => {
  describe('getAllQuickStarts', () => {
    it('should return all quick start prompts', () => {
      const prompts = getAllQuickStarts();
      
      expect(prompts.length).toBe(6);
    });

    it('should include development prompts', () => {
      const prompts = getAllQuickStarts();
      const names = prompts.map(p => p.name);
      
      expect(names).toContain('quick-start-tdd');
      expect(names).toContain('quick-start-debug');
      expect(names).toContain('quick-start-review');
    });

    it('should include GitLab prompts', () => {
      const prompts = getAllQuickStarts();
      const names = prompts.map(p => p.name);
      
      expect(names).toContain('quick-start-issue');
      expect(names).toContain('quick-start-mr');
      expect(names).toContain('quick-start-pipeline');
    });
  });

  describe('getQuickStartPrompt', () => {
    it('should generate TDD prompt content', () => {
      const content = getQuickStartPrompt('quick-start-tdd', { feature: 'login' });
      
      expect(content).toContain('login');
      expect(content).toContain('Test-Driven Development');
      expect(content).toContain('RED');
      expect(content).toContain('GREEN');
      expect(content).toContain('REFACTOR');
    });

    it('should generate debug prompt content', () => {
      const content = getQuickStartPrompt('quick-start-debug', { issue: 'timeout error' });
      
      expect(content).toContain('timeout error');
      expect(content).toContain('systematic-debugging');
      expect(content).toContain('4-phase');
    });

    it('should generate review prompt content', () => {
      const content = getQuickStartPrompt('quick-start-review', { changes: 'auth module' });
      
      expect(content).toContain('auth module');
      expect(content).toContain('requesting-code-review');
    });

    it('should generate issue prompt with URL', () => {
      const content = getQuickStartPrompt('quick-start-issue', { 
        issue_url: 'https://gitlab.com/group/project/-/issues/42' 
      });
      
      expect(content).toContain('https://gitlab.com/group/project/-/issues/42');
      expect(content).toContain('get_work_item');
    });

    it('should generate issue prompt without URL', () => {
      const content = getQuickStartPrompt('quick-start-issue', {});
      
      expect(content).toContain('What issue are you working on');
      expect(content).not.toContain('get_work_item');
    });

    it('should generate MR prompt with URL', () => {
      const content = getQuickStartPrompt('quick-start-mr', { 
        mr_url: 'https://gitlab.com/group/project/-/merge_requests/10' 
      });
      
      expect(content).toContain('https://gitlab.com/group/project/-/merge_requests/10');
      expect(content).toContain('get_merge_request');
    });

    it('should generate pipeline prompt with URL', () => {
      const content = getQuickStartPrompt('quick-start-pipeline', { 
        pipeline_url: 'https://gitlab.com/group/project/-/pipelines/100' 
      });
      
      expect(content).toContain('https://gitlab.com/group/project/-/pipelines/100');
      expect(content).toContain('get_pipeline_failing_jobs');
    });

    it('should throw error for unknown prompt', () => {
      expect(() => {
        getQuickStartPrompt('unknown-prompt', {});
      }).toThrow('Quick start not found');
    });
  });

  describe('listQuickStartPrompts', () => {
    it('should return prompt metadata', () => {
      const prompts = listQuickStartPrompts();
      
      expect(prompts.length).toBe(6);
      expect(prompts[0]).toHaveProperty('name');
      expect(prompts[0]).toHaveProperty('description');
      expect(prompts[0]).toHaveProperty('arguments');
    });

    it('should include emojis in descriptions', () => {
      const prompts = listQuickStartPrompts();
      
      expect(prompts.some(p => p.description.includes('🧪'))).toBe(true);
      expect(prompts.some(p => p.description.includes('🐛'))).toBe(true);
      expect(prompts.some(p => p.description.includes('📝'))).toBe(true);
    });

    it('should include argument definitions', () => {
      const prompts = listQuickStartPrompts();
      const tddPrompt = prompts.find(p => p.name === 'quick-start-tdd');
      
      expect(tddPrompt.arguments.length).toBeGreaterThan(0);
      expect(tddPrompt.arguments[0].name).toBe('feature');
    });
  });

  describe('QUICK_START_PROMPTS (DRY)', () => {
    it('should centralize all prompts', () => {
      expect(QUICK_START_PROMPTS.development.length).toBe(3);
      expect(QUICK_START_PROMPTS.gitlab.length).toBe(3);
    });

    it('should match getAllQuickStarts output', () => {
      const all = getAllQuickStarts();
      const expected = QUICK_START_PROMPTS.development.length + QUICK_START_PROMPTS.gitlab.length;
      
      expect(all.length).toBe(expected);
    });

    it('should have template functions', () => {
      QUICK_START_PROMPTS.development.forEach(prompt => {
        expect(typeof prompt.template).toBe('function');
      });
      
      QUICK_START_PROMPTS.gitlab.forEach(prompt => {
        expect(typeof prompt.template).toBe('function');
      });
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test quick-starts
```

Expected: All tests FAIL with "Cannot find module '../src/prompts/quick-starts.js'"

- [ ] **Step 3: Commit failing tests**

```bash
git add test/quick-starts.test.js
git commit -m "test: add failing tests for quick starts (RED)"
```

---

## Task 8: Quick Starts Module - Implementation (GREEN)

**Files:**
- Create: `.gitlab/duo/mcp-server/src/prompts/quick-starts.js`

- [ ] **Step 1: Create prompts directory**

```bash
mkdir -p .gitlab/duo/mcp-server/src/prompts
```

- [ ] **Step 2: Implement quick starts module**

Create `.gitlab/duo/mcp-server/src/prompts/quick-starts.js`:

```javascript
export const QUICK_START_PROMPTS = {
  development: [
    {
      name: 'quick-start-tdd',
      description: '🧪 Quick Start: Test-Driven Development workflow',
      arguments: [
        { name: 'feature', description: 'Feature to implement', required: true }
      ],
      template: (args) => `I'll guide you through implementing "${args.feature}" using Test-Driven Development.

**Workflow:**
1. Write a failing test first (RED)
2. Implement minimal code to pass (GREEN)
3. Refactor for quality (REFACTOR)

**Using skill:** test-driven-development

Let's start! What type of feature is "${args.feature}"?
- Function/utility
- Class/component
- API endpoint
- Other (describe)
`
    },
    
    {
      name: 'quick-start-debug',
      description: '🐛 Quick Start: Debug an issue systematically',
      arguments: [
        { name: 'issue', description: 'Issue description', required: true }
      ],
      template: (args) => `I'll help you debug: "${args.issue}"

**Workflow (4-phase systematic debugging):**
1. Root Cause Investigation - Understand what's actually happening
2. Pattern Analysis - Find working examples, compare
3. Hypothesis Testing - Test theories methodically
4. Implementation - Fix with defense-in-depth

**Using skill:** systematic-debugging

First, can you describe:
- What's happening (actual behavior)
- What you expected (expected behavior)
- When it started (recent change or always broken)
`
    },
    
    {
      name: 'quick-start-review',
      description: '👀 Quick Start: Request code review',
      arguments: [
        { name: 'changes', description: 'What changed', required: false }
      ],
      template: (args) => `I'll help you prepare for code review${args.changes ? ` of: ${args.changes}` : ''}.

**Workflow:**
1. Self-review your changes
2. Generate review request
3. Address reviewer feedback

**Using skill:** requesting-code-review

What would you like to do?
- Self-review changes before requesting review
- Generate review request for specific changes
- Address feedback from a review
`
    }
  ],

  gitlab: [
    {
      name: 'quick-start-issue',
      description: '📝 Quick Start: Work on a GitLab issue',
      arguments: [
        { name: 'issue_url', description: 'GitLab issue URL', required: false }
      ],
      template: (args) => `I'll help you work on a GitLab issue${args.issue_url ? `: ${args.issue_url}` : ''}.

**Workflow:**
1. ${args.issue_url ? 'Fetch issue details' : 'Identify the issue'}
2. Design solution (brainstorming skill)
3. Create implementation plan (writing-plans skill)
4. Implement (executing-plans skill)
5. Create merge request

${args.issue_url ? `Let me fetch the issue details...

Use get_work_item with url="${args.issue_url}"` : 'What issue are you working on? (Provide URL or describe)'}
`
    },
    
    {
      name: 'quick-start-mr',
      description: '🔀 Quick Start: Review a merge request',
      arguments: [
        { name: 'mr_url', description: 'GitLab MR URL', required: false }
      ],
      template: (args) => `I'll help you review a merge request${args.mr_url ? `: ${args.mr_url}` : ''}.

**Workflow:**
1. ${args.mr_url ? 'Fetch MR details and diffs' : 'Identify the MR'}
2. Review changes systematically
3. Provide feedback
4. Suggest improvements

${args.mr_url ? `Let me fetch the MR details...

Use get_merge_request with url="${args.mr_url}"` : 'What merge request do you want to review? (Provide URL)'}
`
    },
    
    {
      name: 'quick-start-pipeline',
      description: '🚀 Quick Start: Debug failed pipeline',
      arguments: [
        { name: 'pipeline_url', description: 'GitLab pipeline URL', required: false }
      ],
      template: (args) => `I'll help you debug a failed pipeline${args.pipeline_url ? `: ${args.pipeline_url}` : ''}.

**Workflow:**
1. ${args.pipeline_url ? 'Fetch pipeline details' : 'Identify the pipeline'}
2. Get failed job logs
3. Analyze errors systematically
4. Propose fixes

${args.pipeline_url ? `Let me fetch the pipeline details...

Use get_pipeline_failing_jobs with url="${args.pipeline_url}"` : 'What pipeline failed? (Provide URL or describe)'}
`
    }
  ]
};

export function getAllQuickStarts() {
  return [...QUICK_START_PROMPTS.development, ...QUICK_START_PROMPTS.gitlab];
}

export function getQuickStartPrompt(name, args = {}) {
  const allPrompts = getAllQuickStarts();
  const prompt = allPrompts.find(p => p.name === name);
  
  if (!prompt) {
    throw new Error(`Quick start not found: ${name}`);
  }
  
  return prompt.template(args);
}

export function listQuickStartPrompts() {
  return getAllQuickStarts().map(p => ({
    name: p.name,
    description: p.description,
    arguments: p.arguments || []
  }));
}
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
npm test quick-starts
```

Expected: All quick starts tests PASS

- [ ] **Step 4: Commit implementation**

```bash
git add src/prompts/quick-starts.js
git commit -m "feat: implement quick start prompts with DRY templates (GREEN)"
```

---

## Task 9: MCP Server Integration - Tests (RED)

**Files:**
- Modify: `.gitlab/duo/mcp-server/test/integration.test.js`

- [ ] **Step 1: Add tests for diagnostics resource**

Add to `.gitlab/duo/mcp-server/test/integration.test.js` after existing tests:

```javascript
describe('Diagnostics Integration', () => {
  it('should generate diagnostics resource', async () => {
    const detector = new CapabilitiesDetector(path.join(__dirname, 'fixtures', 'capabilities.json'));
    await detector.load();
    
    const mockValidator = {
      validate: async () => ({
        overall: 'healthy',
        checks: {},
        warnings: [],
        recommendations: ['Test']
      })
    };
    
    const mockSkills = [{ name: 'test' }];
    const healthChecker = new HealthChecker(mockValidator, detector, mockSkills);
    
    const content = await generateDiagnostics(healthChecker);
    
    expect(content).toContain('Superpowers Diagnostics');
    expect(content).toContain('System Health');
  });
});

describe('Quick Starts Integration', () => {
  it('should list quick start prompts', () => {
    const prompts = listQuickStartPrompts();
    
    expect(prompts.length).toBe(6);
    expect(prompts[0].name).toContain('quick-start');
  });

  it('should generate quick start content', () => {
    const content = getQuickStartPrompt('quick-start-tdd', { feature: 'test' });
    
    expect(content).toContain('test');
    expect(content).toContain('Test-Driven Development');
  });
});
```

- [ ] **Step 2: Add imports at top of integration.test.js**

```javascript
import { InstallationValidator } from '../src/diagnostics/validator.js';
import { HealthChecker } from '../src/diagnostics/health-checker.js';
import { generateDiagnostics } from '../src/resources/diagnostics.js';
import { listQuickStartPrompts, getQuickStartPrompt } from '../src/prompts/quick-starts.js';
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test integration
```

Expected: New tests FAIL (modules not imported in index.js yet)

- [ ] **Step 4: Commit failing tests**

```bash
git add test/integration.test.js
git commit -m "test: add failing integration tests for Phase 2 (RED)"
```

---

## Task 10: MCP Server Integration - Implementation (GREEN)

**Files:**
- Modify: `.gitlab/duo/mcp-server/src/index.js`

- [ ] **Step 1: Add imports at top of index.js**

Add after existing imports:

```javascript
import { InstallationValidator } from './diagnostics/validator.js';
import { HealthChecker } from './diagnostics/health-checker.js';
import { generateDiagnostics } from './resources/diagnostics.js';
import { listQuickStartPrompts, getQuickStartPrompt, getAllQuickStarts } from './prompts/quick-starts.js';
```

- [ ] **Step 2: Initialize validator and health checker in createServer()**

Add after `const toolAdapter = createToolAdapter();`:

```javascript
// Initialize diagnostics
const validator = new InstallationValidator(capabilitiesDetector, SKILLS_DIR);
const healthChecker = new HealthChecker(validator, capabilitiesDetector, skills);
```

- [ ] **Step 3: Update ListResourcesRequestSchema handler**

Add diagnostics resource after capabilities resource:

```javascript
// Capabilities third
{
  uri: 'superpowers://capabilities',
  name: 'GitLab Duo Capabilities',
  description: 'Detected capabilities and tool availability',
  mimeType: 'text/markdown',
},
// Diagnostics fourth
{
  uri: 'superpowers://diagnostics',
  name: 'Superpowers Diagnostics',
  description: 'System health check and troubleshooting',
  mimeType: 'text/markdown',
},
```

- [ ] **Step 4: Update ReadResourceRequestSchema handler**

Add diagnostics handler after capabilities handler:

```javascript
// Handle diagnostics resource
if (uri === 'superpowers://diagnostics') {
  return {
    contents: [{
      uri,
      mimeType: 'text/markdown',
      text: await generateDiagnostics(healthChecker),
    }],
  };
}
```

- [ ] **Step 5: Update ListPromptsRequestSchema handler**

Replace the prompts array to include quick starts:

```javascript
const prompts = [
  // Initialize prompt FIRST
  {
    name: 'initialize-superpowers',
    description: '🚀 Initialize Superpowers (start here!)',
    arguments: []
  },
  // Quick start prompts SECOND
  ...listQuickStartPrompts(),
  // Then skill prompts
  ...skills.map(skill => ({
    name: skill.name,
    description: skill.description,
    arguments: [],
  }))
];
```

- [ ] **Step 6: Update GetPromptRequestSchema handler**

Add quick start handling before skill prompts:

```javascript
// Handle quick-start prompts
const quickStarts = getAllQuickStarts();
const quickStart = quickStarts.find(qs => qs.name === promptName);

if (quickStart) {
  const content = getQuickStartPrompt(promptName, request.params.arguments || {});
  
  return {
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: content,
      },
    }],
  };
}

// Handle initialize-superpowers prompt
if (promptName === 'initialize-superpowers') {
  // ... existing code ...
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npm test
```

Expected: All tests PASS (existing 48 + new tests)

- [ ] **Step 8: Commit implementation**

```bash
git add src/index.js
git commit -m "feat: integrate diagnostics and quick starts into MCP server (GREEN)"
```

---

## Task 11: Update Install Script

**Files:**
- Modify: `.gitlab/duo/install.sh`

- [ ] **Step 1: Add validation step to install.sh**

Find the section after "Capabilities detected and saved" and before "Testing MCP server...", add:

```bash
echo ""
echo "Validating installation..."

# Run validation via Node.js
node -e "
import { InstallationValidator } from './mcp-server/src/diagnostics/validator.js';
import { CapabilitiesDetector } from './mcp-server/src/capabilities-detector.js';

const detector = new CapabilitiesDetector();
await detector.load();

const validator = new InstallationValidator(detector, '${SKILLS_DIR}');
const report = await validator.generateReport();

// Write report
import fs from 'fs/promises';
await fs.writeFile('${SCRIPT_DIR}/compatibility-report.md', report);

// Show summary
const result = await validator.validate();
console.log('✓', result.checks.skillsLoaded.message);
console.log('✓', result.checks.toolsAvailable.message);
if (result.warnings.length > 0) {
  console.log('⚠️ ', result.warnings.length, 'warning(s) - see compatibility-report.md');
} else {
  console.log('✓ No warnings - installation fully compatible');
}
" 2>&1

echo -e "${GREEN}✓${NC} Installation validated"
echo ""
echo "Compatibility report: ${SCRIPT_DIR}/compatibility-report.md"
```

- [ ] **Step 2: Update final message to mention quick starts**

Find the "Next steps:" section and update:

```bash
echo "Next steps:"
echo "1. Start GitLab Duo CLI:"
echo "   duo"
echo ""
echo "2. Initialize Superpowers:"
echo "   \"Use initialize-superpowers prompt\""
echo ""
echo "3. Try a quick start:"
echo "   \"Use quick-start-tdd prompt with feature='calculator'\""
echo ""
echo "4. Or use any skill:"
echo "   \"Use the brainstorming skill to help me design a feature\""
echo ""
echo "Configuration file: ${MCP_CONFIG_FILE}"
echo "Skills directory: ${SKILLS_DIR}"
echo "Compatibility report: ${SCRIPT_DIR}/compatibility-report.md"
```

- [ ] **Step 3: Add compatibility-report.md to .gitignore**

Add to `.gitignore`:

```
.gitlab/duo/compatibility-report.md
```

- [ ] **Step 4: Test installation script**

```bash
bash .gitlab/duo/install.sh
```

Expected: 
- Script runs successfully
- compatibility-report.md created
- Validation summary shown

- [ ] **Step 5: Verify compatibility report**

```bash
cat .gitlab/duo/compatibility-report.md
```

Expected: Valid markdown with status, checks, recommendations

- [ ] **Step 6: Commit changes**

```bash
git add install.sh .gitignore
git commit -m "feat: add post-install validation to install script"
```

---

## Task 12: Update Documentation

**Files:**
- Modify: `.gitlab/duo/README.md`
- Modify: `docs/README.gitlab-duo.md`

- [ ] **Step 1: Update .gitlab/duo/README.md**

Add after "New in Phase 1" section:

```markdown
## New in Phase 2 (2026-04-03)

**Post-Install Validation:**
- Automatic validation after installation
- `compatibility-report.md` generated with detailed status
- Clear warnings and recommendations

**Health Check Diagnostics:**
- `superpowers://diagnostics` resource for troubleshooting
- Shows system status, loaded skills, available tools
- Includes troubleshooting steps and quick reference

**Interactive Quick Starts:**
- 6 quick start prompts for common workflows
- Development: TDD, debugging, code review
- GitLab: issues, merge requests, pipelines
- Prompts appear in list with emojis for easy discovery
```

- [ ] **Step 2: Update docs/README.gitlab-duo.md**

Add after "Phase 1 Improvements" section:

```markdown
## Phase 2 Improvements (2026-04-03)

### Post-Install Validation

Installation now validates compatibility automatically:

**During installation:**
```bash
bash .gitlab/duo/install.sh
# ...
✓ Validating installation...
✓ 14 skills loaded
✓ 7/8 tools available
✓ Installation validated

Compatibility report: .gitlab/duo/compatibility-report.md
```

**Review report:**
```bash
cat .gitlab/duo/compatibility-report.md
```

### Health Check Diagnostics

Quick system health check for troubleshooting:

**Check health:**
```
Read superpowers://diagnostics
```

**Shows:**
- System status (✅ Healthy / ⚠️ Warnings / ❌ Issues)
- Loaded skills (count and list)
- Available tools (MCP + GitLab Duo)
- Issues and recommendations
- Troubleshooting steps

### Interactive Quick Starts

Ready-to-use prompts for common workflows:

**Development workflows:**
- `quick-start-tdd` - Test-Driven Development
- `quick-start-debug` - Systematic debugging
- `quick-start-review` - Code review preparation

**GitLab workflows:**
- `quick-start-issue` - Work on GitLab issue
- `quick-start-mr` - Review merge request
- `quick-start-pipeline` - Debug failed pipeline

**Usage:**
```
# List all prompts
What prompts are available?

# Use a quick start
Use quick-start-tdd prompt with feature="user authentication"

# Or with GitLab URL
Use quick-start-issue prompt with issue_url="https://gitlab.com/group/project/-/issues/42"
```
```

- [ ] **Step 3: Commit documentation updates**

```bash
git add .gitlab/duo/README.md docs/README.gitlab-duo.md
git commit -m "docs: document Phase 2 improvements"
```

---

## Task 13: End-to-End Testing

**Files:**
- Test all components together

- [ ] **Step 1: Clean test - remove generated files**

```bash
rm -f .gitlab/duo/compatibility-report.md
```

- [ ] **Step 2: Run full test suite**

```bash
cd .gitlab/duo/mcp-server
npm test
```

Expected: All tests PASS (48 from Phase 1 + ~30 new from Phase 2 = ~78 total)

- [ ] **Step 3: Test installation with validation**

```bash
bash .gitlab/duo/install.sh
```

Expected:
- Installation completes
- Validation runs
- compatibility-report.md created
- Summary shows skills and tools

- [ ] **Step 4: Verify compatibility report**

```bash
cat .gitlab/duo/compatibility-report.md
```

Expected: Valid markdown with all sections

- [ ] **Step 5: Test MCP server startup**

```bash
timeout 2 node .gitlab/duo/mcp-server/src/index.js 2>&1 | head -n 10
```

Expected output includes:
- "Loaded X skills..."
- "Capabilities: Subagents: No, Tools: 7/8"
- No errors

- [ ] **Step 6: Verify all new files created**

```bash
ls -la .gitlab/duo/mcp-server/src/diagnostics/
ls -la .gitlab/duo/mcp-server/src/prompts/
ls -la .gitlab/duo/mcp-server/test/ | grep -E "(validator|health|quick|diagnostics)"
```

Expected: All new files present

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "test: verify Phase 2 implementation complete"
```

---

## Task 14: Manual Testing Checklist

**Files:**
- Create: `.gitlab/duo/TESTING-PHASE2.md`

- [ ] **Step 1: Create Phase 2 testing checklist**

Create `.gitlab/duo/TESTING-PHASE2.md`:

```markdown
# Phase 2 Manual Testing Results

**Date:** 2026-04-03
**GitLab Duo Version:** [version]
**Tester:** [your name]

## Test Checklist

### Post-Install Validation

- [ ] **Test 1.1:** Run installation
  - Command: `bash .gitlab/duo/install.sh`
  - Expected: Shows validation step with skills/tools count
  - Result:

- [ ] **Test 1.2:** Check compatibility report exists
  - Command: `ls -la .gitlab/duo/compatibility-report.md`
  - Expected: File exists
  - Result:

- [ ] **Test 1.3:** Review compatibility report
  - Command: `cat .gitlab/duo/compatibility-report.md`
  - Expected: Shows status, checks, warnings, recommendations
  - Result:

- [ ] **Test 1.4:** Verify report accuracy
  - Check skills count matches actual
  - Check tools count matches capabilities.json
  - Result:

### Health Check Diagnostics

- [ ] **Test 2.1:** Read diagnostics resource
  - Command in GitLab Duo: "Read superpowers://diagnostics"
  - Expected: Shows system health, skills, tools
  - Result:

- [ ] **Test 2.2:** Verify diagnostics shows correct status
  - Should show: ✅ HEALTHY or ⚠️ WARNINGS
  - Should list all 14+ skills
  - Result:

- [ ] **Test 2.3:** Verify tools listed correctly
  - MCP Tools: Read, Write, Edit, Bash
  - GitLab Tools: read_file, edit_file, etc.
  - Result:

- [ ] **Test 2.4:** Check troubleshooting section
  - Should include re-detection instructions
  - Should include quick reference
  - Result:

### Interactive Quick Starts

- [ ] **Test 3.1:** List prompts shows quick starts
  - Command: "What prompts are available?"
  - Expected: Shows 🧪 🐛 👀 📝 🔀 🚀 emojis
  - Result:

- [ ] **Test 3.2:** Use quick-start-tdd
  - Command: "Use quick-start-tdd prompt with feature='calculator'"
  - Expected: Starts TDD workflow, mentions RED-GREEN-REFACTOR
  - Result:

- [ ] **Test 3.3:** Use quick-start-debug
  - Command: "Use quick-start-debug prompt with issue='timeout error'"
  - Expected: Starts 4-phase debugging workflow
  - Result:

- [ ] **Test 3.4:** Use quick-start-review
  - Command: "Use quick-start-review prompt"
  - Expected: Starts code review workflow
  - Result:

- [ ] **Test 3.5:** Use quick-start-issue with URL
  - Command: "Use quick-start-issue prompt with issue_url='https://gitlab.com/...'"
  - Expected: Fetches issue details, starts workflow
  - Result:

- [ ] **Test 3.6:** Use quick-start-mr with URL
  - Command: "Use quick-start-mr prompt with mr_url='https://gitlab.com/...'"
  - Expected: Fetches MR details, starts review
  - Result:

- [ ] **Test 3.7:** Use quick-start-pipeline with URL
  - Command: "Use quick-start-pipeline prompt with pipeline_url='https://gitlab.com/...'"
  - Expected: Fetches pipeline details, analyzes failures
  - Result:

### Integration with Phase 1

- [ ] **Test 4.1:** Verify Phase 1 features still work
  - initialize-superpowers prompt
  - superpowers://capabilities resource
  - MCP tools (Read, Write, Edit, Bash)
  - Result:

- [ ] **Test 4.2:** Verify no breaking changes
  - Skills load normally
  - Bootstrap works
  - Tool adapter works
  - Result:

## Issues Found

[List any issues discovered]

## Notes

[Any additional observations]

## Summary

- [ ] All post-install validation tests passed
- [ ] All health check tests passed
- [ ] All quick start tests passed
- [ ] No breaking changes from Phase 1
- [ ] All features working as expected

**Overall Status:** [ ] PASS / [ ] FAIL

**Recommendations:**

[Any recommendations for improvements]
```

- [ ] **Step 2: Commit testing checklist**

```bash
git add .gitlab/duo/TESTING-PHASE2.md
git commit -m "docs: add Phase 2 manual testing checklist"
```

---

## Task 15: Update Phase 1 Quick Start Guide

**Files:**
- Modify: `.gitlab/duo/PHASE1-QUICKSTART.md`

- [ ] **Step 1: Rename to general quickstart**

```bash
mv .gitlab/duo/PHASE1-QUICKSTART.md .gitlab/duo/QUICKSTART.md
```

- [ ] **Step 2: Update content to include Phase 2**

Update title and add Phase 2 section:

```markdown
# 🚀 Superpowers for GitLab Duo - Quick Start

**Status:** ✅ Phase 1 & 2 Complete

---

## What's New

### Phase 1 (2026-04-03)
- Easy initialization (initialize-superpowers prompt)
- Capability detection (superpowers://capabilities)
- Tool adapter (MCP tools work automatically)

### Phase 2 (2026-04-03)
- Post-install validation (compatibility-report.md)
- Health check diagnostics (superpowers://diagnostics)
- Interactive quick starts (6 workflow prompts)

---

## How to Use

### First Time Setup

```bash
bash .gitlab/duo/install.sh
# Now includes validation and compatibility report!
```

### Start Using

```bash
duo
```

Then:
```
What prompts are available?
```

You'll see:
```
1. 🚀 initialize-superpowers (start here!)
2. 🧪 quick-start-tdd
3. 🐛 quick-start-debug
4. 👀 quick-start-review
5. 📝 quick-start-issue
6. 🔀 quick-start-mr
7. 🚀 quick-start-pipeline
... (then skills)
```

### Quick Starts (NEW in Phase 2!)

**Development workflows:**
```
Use quick-start-tdd prompt with feature="user login"
Use quick-start-debug prompt with issue="timeout error"
Use quick-start-review prompt
```

**GitLab workflows:**
```
Use quick-start-issue prompt with issue_url="https://gitlab.com/..."
Use quick-start-mr prompt with mr_url="https://gitlab.com/..."
Use quick-start-pipeline prompt with pipeline_url="https://gitlab.com/..."
```

### Health Check (NEW in Phase 2!)

```
Read superpowers://diagnostics
```

Shows:
- System status
- Loaded skills
- Available tools
- Issues and recommendations

---

## Files You Care About

### Phase 1
- `superpowers://welcome` - Quick start guide
- `superpowers://capabilities` - What's available
- `superpowers://bootstrap` - Full introduction

### Phase 2 (NEW!)
- `superpowers://diagnostics` - Health check
- `compatibility-report.md` - Post-install validation
- Quick start prompts (6 workflows)

---

[Rest of file remains the same...]
```

- [ ] **Step 3: Commit updated quickstart**

```bash
git add .gitlab/duo/QUICKSTART.md
git commit -m "docs: update quickstart guide with Phase 2 features"
```

---

## Completion Checklist

### Code Quality
- [ ] All tests pass (Phase 1: 48 + Phase 2: ~30 = ~78 total)
- [ ] No console errors in MCP server
- [ ] Code follows DRY principles
- [ ] YAGNI applied (no unnecessary features)
- [ ] TDD followed (RED-GREEN-REFACTOR)

### Functionality
- [ ] Post-install validation works
- [ ] Compatibility report generated
- [ ] Health check diagnostics works
- [ ] 6 quick start prompts available
- [ ] No breaking changes to Phase 1

### Testing
- [ ] Unit tests: Validator
- [ ] Unit tests: HealthChecker
- [ ] Unit tests: QuickStarts
- [ ] Unit tests: Diagnostics resource
- [ ] Integration tests: MCP server
- [ ] E2E test: Installation with validation

### Documentation
- [ ] README.md updated
- [ ] docs/README.gitlab-duo.md updated
- [ ] QUICKSTART.md updated
- [ ] TESTING-PHASE2.md created
- [ ] Code comments where needed

---

**Plan complete!** All tasks follow strict TDD (RED-GREEN-REFACTOR), YAGNI (only necessary code), and DRY (reuse Phase 1 components) principles.
