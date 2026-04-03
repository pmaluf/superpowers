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
