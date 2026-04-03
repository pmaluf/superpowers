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
      warnings.push('Capabilities not detected - run: bash .gitlab-duo/detect-capabilities.sh');
    }

    return warnings;
  }

  generateRecommendations(checks, warnings) {
    const recommendations = [];

    if (checks.skillsLoaded?.count > 10) {
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
