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
