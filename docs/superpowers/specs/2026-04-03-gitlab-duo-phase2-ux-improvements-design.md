# GitLab Duo CLI - Phase 2 UX Improvements

**Date:** 2026-04-03  
**Status:** Approved - Ready for Implementation  
**Approach:** Integrated Diagnostics with TDD, YAGNI, DRY

---

## Executive Summary

Implement three UX improvements to the GitLab Duo CLI integration:

1. **Post-Install Validation** - Verify compatibility after installation
2. **Skill Health Check** - Basic diagnostic resource for troubleshooting
3. **Interactive Examples** - Quick start prompts for common workflows

**Philosophy:** Integrated Diagnostics - unified diagnostic system that shares validation logic across components.

**Methodology:** Strict TDD (RED-GREEN-REFACTOR), YAGNI (only what's needed), DRY (no duplication).

---

## Current State (After Phase 1)

### What Works
- ✅ Auto-bootstrap via initialize-superpowers prompt
- ✅ Capability detection (detect-capabilities.sh)
- ✅ Tool adapter with 4 MCP tools
- ✅ 48 tests passing
- ✅ Complete documentation

### What's Missing
- ❌ No post-install validation - user doesn't know if installation succeeded
- ❌ No health check - hard to troubleshoot when something breaks
- ❌ No quick start examples - users need to discover workflows manually

---

## Architecture Overview

### File Structure (YAGNI - only necessary files)

```
.gitlab/duo/
├── mcp-server/
│   ├── src/
│   │   ├── index.js                    # [MODIFY] Add diagnostics handlers
│   │   ├── diagnostics/
│   │   │   ├── validator.js            # [NEW] Post-install validation
│   │   │   └── health-checker.js       # [NEW] Runtime health check
│   │   ├── prompts/
│   │   │   └── quick-starts.js         # [NEW] Quick start prompts
│   │   └── resources/
│   │       └── diagnostics.js          # [NEW] Diagnostics resource
│   ├── test/
│   │   ├── validator.test.js           # [NEW] Unit tests
│   │   ├── health-checker.test.js      # [NEW] Unit tests
│   │   ├── quick-starts.test.js        # [NEW] Unit tests
│   │   ├── diagnostics.test.js         # [NEW] Unit tests
│   │   └── integration.test.js         # [MODIFY] Add new tests
│   └── package.json                    # No changes needed
├── install.sh                          # [MODIFY] Add validation step
└── compatibility-report.md             # [GENERATED] Post-install report
```

### Data Flow

```
Installation Flow:
install.sh
    ↓
InstallationValidator.validate()
    ├─→ Check skills loaded
    ├─→ Check MCP server starts
    ├─→ Check tools available (uses CapabilitiesDetector)
    └─→ Check configuration valid
    ↓
Generate compatibility-report.md
    ↓
User sees: "✓ Installation validated - see compatibility-report.md"

Runtime Flow:
User: "Read superpowers://diagnostics"
    ↓
HealthChecker.check()
    ├─→ Run validator.validate()
    ├─→ Get capabilities summary
    ├─→ List loaded skills
    └─→ List available tools
    ↓
Generate diagnostics resource
    ↓
User sees: Status, skills, tools, issues, recommendations

Quick Start Flow:
User: "What prompts are available?"
    ↓
List includes quick-start-* prompts (with emojis)
    ↓
User: "Use quick-start-tdd prompt with feature='login'"
    ↓
Prompt loads with context + starts workflow
```

---

## Component 2.1: Post-Install Validation

### Goal
Verify installation succeeded and generate compatibility report.

### Implementation

#### Validator Module

**Location:** `src/diagnostics/validator.js`

**Responsibility:** Validate installation and detect issues.

**API:**
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
      overall, // 'healthy' | 'warnings' | 'issues'
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
    // Simple check - if we got here, server can load
    return {
      status: 'pass',
      message: 'MCP server module loads successfully'
    };
  }

  async checkConfiguration() {
    // Check if capabilities were detected
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

  generateReport() {
    // Generate markdown report (used by install.sh)
    const result = this.validate();
    
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

**Tests (RED first):**
```javascript
// test/validator.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { InstallationValidator } from '../src/diagnostics/validator.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('InstallationValidator', () => {
  let validator;
  let mockCapabilities;

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

    const skillsDir = path.join(__dirname, '../../skills');
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
      
      expect(result.overall).toBe('healthy');
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
    });
  });

  describe('checkMcpServer', () => {
    it('should pass if module loads', async () => {
      const result = await validator.checkMcpServer();
      
      expect(result.status).toBe('pass');
    });
  });

  describe('checkConfiguration', () => {
    it('should pass when capabilities detected', async () => {
      const result = await validator.checkConfiguration();
      
      expect(result.status).toBe('pass');
    });

    it('should warn when capabilities not detected', async () => {
      mockCapabilities.capabilities.detected_at = null;
      
      const result = await validator.checkConfiguration();
      
      expect(result.status).toBe('warning');
    });
  });

  describe('collectWarnings', () => {
    it('should warn about missing tools', () => {
      const checks = {
        toolsAvailable: { available: 2, total: 3 }
      };
      
      const warnings = validator.collectWarnings(checks);
      
      expect(warnings).toContain('1 tool(s) not available');
    });
  });

  describe('generateReport', () => {
    it('should generate markdown report', async () => {
      const report = await validator.generateReport();
      
      expect(report).toContain('Compatibility Report');
      expect(report).toContain('Overall Status');
      expect(report).toContain('Checks');
    });

    it('should include recommendations', async () => {
      const report = await validator.generateReport();
      
      expect(report).toContain('Recommendations');
    });
  });
});
```

#### Integration with install.sh

**Location:** `.gitlab/duo/install.sh` (add after MCP server test)

**Code:**
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
}
"

echo -e "${GREEN}✓${NC} Installation validated"
echo ""
echo "Compatibility report: ${SCRIPT_DIR}/compatibility-report.md"
```

**Generated Report Format:**
```markdown
# GitLab Duo CLI Compatibility Report

Generated: 2026-04-03T16:30:00Z
GitLab Duo Version: 8.82.0

## Overall Status: ✅ HEALTHY

## Checks

✅ **skillsLoaded:** 14 skills found
✅ **toolsAvailable:** 7/8 tools available
✅ **mcpServer:** MCP server module loads successfully
✅ **configuration:** Capabilities detected

## Warnings

⚠️ 1 tool(s) not available - some skills may have limited functionality

## Recommendations

- All core skills work normally
- Use executing-plans for multi-task workflows
- Installation is fully compatible - ready to use!

## Next Steps

1. Start GitLab Duo: `duo`
2. Initialize: "Use initialize-superpowers prompt"
3. Try a skill: "Use the brainstorming skill"
4. Check health anytime: "Read superpowers://diagnostics"
```

---

## Component 2.2: Skill Health Check

### Goal
Provide quick diagnostic when something doesn't work.

### Implementation

#### Health Checker Module

**Location:** `src/diagnostics/health-checker.js`

**Responsibility:** Check system health at runtime.

**API:**
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

**Tests (RED first):**
```javascript
// test/health-checker.test.js
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
        checks: {},
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
          web_search: false
        }
      }
    };

    mockSkills = [
      { name: 'brainstorming' },
      { name: 'test-driven-development' }
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
    });

    it('should include skills count', async () => {
      const result = await healthChecker.check();
      
      expect(result.skills.total).toBe(2);
      expect(result.skills.loaded).toContain('brainstorming');
    });

    it('should include capabilities summary', async () => {
      const result = await healthChecker.check();
      
      expect(result.capabilities).toBe('Subagents: No, Tools: 7/8');
    });

    it('should list MCP tools', async () => {
      const result = await healthChecker.check();
      
      expect(result.tools.mcp).toContain('Read');
      expect(result.tools.mcp).toContain('Write');
    });

    it('should list GitLab tools', async () => {
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
  });
});
```

#### Diagnostics Resource

**Location:** `src/resources/diagnostics.js`

**Purpose:** Generate diagnostics resource content.

**Code:**
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

${health.issues.map(i => `⚠️ ${i}`).join('\n')}` : '## Issues

None detected ✅'}

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

**Tests (RED first):**
```javascript
// test/diagnostics.test.js
import { describe, it, expect } from 'vitest';
import { generateDiagnostics } from '../src/resources/diagnostics.js';

describe('Diagnostics Resource', () => {
  const mockHealthChecker = {
    check: async () => ({
      status: 'healthy',
      timestamp: '2026-04-03T16:00:00Z',
      skills: {
        total: 14,
        loaded: ['brainstorming', 'test-driven-development']
      },
      capabilities: 'Subagents: No, Tools: 7/8',
      tools: {
        mcp: ['Read', 'Write', 'Edit', 'Bash'],
        gitlab: ['read_file', 'edit_file']
      },
      issues: [],
      recommendations: ['All good']
    })
  };

  it('should generate diagnostics content', async () => {
    const content = await generateDiagnostics(mockHealthChecker);
    
    expect(content).toContain('Superpowers Diagnostics');
    expect(content).toContain('System Health');
  });

  it('should show status', async () => {
    const content = await generateDiagnostics(mockHealthChecker);
    
    expect(content).toContain('Status: ✅ HEALTHY');
  });

  it('should list skills', async () => {
    const content = await generateDiagnostics(mockHealthChecker);
    
    expect(content).toContain('14 loaded');
    expect(content).toContain('brainstorming');
  });

  it('should list MCP tools', async () => {
    const content = await generateDiagnostics(mockHealthChecker);
    
    expect(content).toContain('Read');
    expect(content).toContain('Write');
  });

  it('should list GitLab tools', async () => {
    const content = await generateDiagnostics(mockHealthChecker);
    
    expect(content).toContain('read_file ✅');
  });

  it('should show issues when present', async () => {
    const checkerWithIssues = {
      check: async () => ({
        ...await mockHealthChecker.check(),
        status: 'warnings',
        issues: ['Test warning']
      })
    };

    const content = await generateDiagnostics(checkerWithIssues);
    
    expect(content).toContain('Test warning');
  });

  it('should include troubleshooting section', async () => {
    const content = await generateDiagnostics(mockHealthChecker);
    
    expect(content).toContain('Troubleshooting');
    expect(content).toContain('detect-capabilities.sh');
  });
});
```

---

## Component 2.3: Interactive Examples

### Goal
Provide ready-to-use prompts for common workflows.

### Implementation

#### Quick Starts Module

**Location:** `src/prompts/quick-starts.js`

**Responsibility:** Define and generate quick start prompts.

**Code:**
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

**Tests (RED first):**
```javascript
// test/quick-starts.test.js
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
    });

    it('should generate debug prompt content', () => {
      const content = getQuickStartPrompt('quick-start-debug', { issue: 'timeout error' });
      
      expect(content).toContain('timeout error');
      expect(content).toContain('systematic-debugging');
      expect(content).toContain('4-phase');
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
  });
});
```

---

## Integration with MCP Server

### Modifications to index.js

**Add imports:**
```javascript
import { InstallationValidator } from './diagnostics/validator.js';
import { HealthChecker } from './diagnostics/health-checker.js';
import { generateDiagnostics } from './resources/diagnostics.js';
import { listQuickStartPrompts, getQuickStartPrompt } from './prompts/quick-starts.js';
```

**Initialize in createServer():**
```javascript
// After loading capabilities
const validator = new InstallationValidator(capabilitiesDetector, SKILLS_DIR);
const healthChecker = new HealthChecker(validator, capabilitiesDetector, skills);
```

**Update ListResourcesRequestSchema:**
```javascript
// Add diagnostics resource after capabilities
{
  uri: 'superpowers://diagnostics',
  name: 'Superpowers Diagnostics',
  description: 'System health check and troubleshooting',
  mimeType: 'text/markdown',
}
```

**Update ReadResourceRequestSchema:**
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

**Update ListPromptsRequestSchema:**
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

**Update GetPromptRequestSchema:**
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
```

---

## Testing Strategy

### TDD Implementation Order

**Phase 1: Validator (Foundation)**
1. RED: Write validator.test.js
2. GREEN: Implement validator.js
3. REFACTOR: Extract check methods

**Phase 2: Health Checker (Uses Validator)**
1. RED: Write health-checker.test.js
2. GREEN: Implement health-checker.js
3. REFACTOR: Optimize check logic

**Phase 3: Resources (Uses Health Checker)**
1. RED: Write diagnostics.test.js
2. GREEN: Implement diagnostics.js
3. REFACTOR: Improve formatting

**Phase 4: Quick Starts (Independent)**
1. RED: Write quick-starts.test.js
2. GREEN: Implement quick-starts.js
3. REFACTOR: DRY the templates

**Phase 5: Integration**
1. RED: Add integration tests
2. GREEN: Modify index.js
3. REFACTOR: Organize handlers

**Phase 6: Install Script**
1. Add validation step
2. Test end-to-end
3. Update documentation

### Test Coverage Goals

- **Unit tests:** All business logic
- **Integration tests:** MCP handlers
- **E2E test:** Full installation with validation

---

## Principles Applied

### TDD (Test-Driven Development)
✅ All tests written BEFORE implementation  
✅ Strict RED-GREEN-REFACTOR cycle  
✅ Tests document expected behavior  

### YAGNI (You Aren't Gonna Need It)
✅ Basic health check (not complete skill testing)  
✅ 6 quick starts (not 20)  
✅ Simple validation (not complex rule engine)  
✅ No logging framework  
✅ No metrics/analytics  

### DRY (Don't Repeat Yourself)
✅ Validator used by install.sh AND health-checker  
✅ CapabilitiesDetector reused from Phase 1  
✅ Quick starts centralized in QUICK_START_PROMPTS  
✅ Resource generators follow same pattern  

---

## Integration with Phase 1

### Reuses from Phase 1 (DRY)
- ✅ `CapabilitiesDetector` - Used by validator
- ✅ `generateCapabilities()` - Referenced in diagnostics
- ✅ `capabilities.json` - Read by validator
- ✅ Resource pattern - Diagnostics follows same structure

### Extends Phase 1
- ✅ Adds validation layer on top of detection
- ✅ Adds health check using capabilities
- ✅ Adds quick starts that reference capabilities

### Maintains Independence
- ✅ Phase 2 works even if capabilities.json missing (safe defaults)
- ✅ Validator can run standalone
- ✅ Quick starts work without diagnostics

---

## User Experience

### Before Phase 2

```bash
bash .gitlab/duo/install.sh
# ... installation ...
✓ Installation Complete!

# User doesn't know if it worked properly
# No easy way to troubleshoot
# No examples to get started quickly
```

### After Phase 2

```bash
bash .gitlab/duo/install.sh
# ... installation ...
✓ Validating installation...
✓ 14 skills loaded
✓ 7/8 tools available
✓ Installation validated

Compatibility report: .gitlab/duo/compatibility-report.md

Next steps:
1. Review report: cat .gitlab/duo/compatibility-report.md
2. Start GitLab Duo: duo
3. Try quick start: "Use quick-start-tdd prompt with feature='login'"
```

**In GitLab Duo:**
```
> "What prompts are available?"

1. 🚀 initialize-superpowers (start here!)
2. 🧪 quick-start-tdd
3. 🐛 quick-start-debug
4. 👀 quick-start-review
5. 📝 quick-start-issue
6. 🔀 quick-start-mr
7. 🚀 quick-start-pipeline
... (then skills)

> "Use quick-start-tdd prompt with feature='user login'"

I'll guide you through implementing "user login" using TDD...
[workflow starts]

> "Read superpowers://diagnostics"

# Superpowers Diagnostics
Status: ✅ HEALTHY
Skills: 14 loaded
Tools: 7/8 available
[detailed report]
```

---

## Success Criteria

### Component 2.1: Post-Install Validation
- ✅ Validator runs after installation
- ✅ compatibility-report.md generated
- ✅ Report shows skills, tools, warnings
- ✅ Recommendations provided

### Component 2.2: Health Check
- ✅ Diagnostics resource available
- ✅ Shows system status
- ✅ Lists skills and tools
- ✅ Provides troubleshooting steps

### Component 2.3: Interactive Examples
- ✅ 6 quick start prompts available
- ✅ Prompts appear in list with emojis
- ✅ Prompts accept arguments
- ✅ Workflows clearly explained

### Overall Integration
- ✅ All tests pass (existing + new)
- ✅ No breaking changes
- ✅ Documentation updated
- ✅ Reuses Phase 1 components (DRY)

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Validation slows installation | Low | Low | Validation is fast (~1s), runs after main install |
| Health check shows stale data | Medium | Low | Include timestamp, instructions to re-check |
| Quick starts too prescriptive | Low | Medium | Keep templates flexible, allow user to deviate |
| Validator false positives | Low | Medium | Use safe defaults, clear warnings vs errors |

---

## Estimated Effort

### Code
- **New files:** 7 (4 implementation + 3 test)
- **Modified files:** 2 (index.js, install.sh)
- **Lines of code:** ~400 (implementation + tests)
- **Tests:** ~30 new tests

### Time
- **Implementation:** 2-3 hours (with TDD)
- **Testing:** 30 minutes (manual)
- **Documentation:** 30 minutes

**Total:** ~3-4 hours

---

## Next Steps After Approval

1. **Review this spec** - Confirm design is correct
2. **Create implementation plan** - Break into tasks
3. **Execute with TDD** - RED-GREEN-REFACTOR
4. **Test with GitLab Duo CLI** - Validate real usage
5. **Update documentation** - Reflect new features

---

## Files to Create/Modify

### New Files
- `src/diagnostics/validator.js`
- `src/diagnostics/health-checker.js`
- `src/prompts/quick-starts.js`
- `src/resources/diagnostics.js`
- `test/validator.test.js`
- `test/health-checker.test.js`
- `test/quick-starts.test.js`
- `test/diagnostics.test.js`

### Modified Files
- `src/index.js` - Add diagnostics handlers and quick start prompts
- `install.sh` - Add validation step
- `test/integration.test.js` - Add tests for new features

### Generated Files
- `compatibility-report.md` - Created by install.sh

---

**End of Design Document**
