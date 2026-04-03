# GitLab Duo CLI - Phase 1 Critical Improvements

**Date:** 2026-04-03  
**Status:** Approved - Ready for Implementation  
**Approach:** Progressive Enhancement with TDD, YAGNI, DRY

---

## Executive Summary

Implement three critical improvements to the GitLab Duo CLI integration:

1. **Auto-Bootstrap via MCP Prompts** - Make initialization obvious and easy
2. **Subagent Support Detection** - Automatically detect and document capabilities
3. **Tool Adapter (Hybrid)** - Transparent tool name translation

**Philosophy:** Progressive Enhancement - add capabilities incrementally without breaking existing functionality.

**Methodology:** Strict TDD (RED-GREEN-REFACTOR), YAGNI (only what's needed), DRY (no duplication).

---

## Current State

### What Works
- ✅ MCP server loads and exposes skills as resources
- ✅ Bootstrap resource available at `superpowers://bootstrap`
- ✅ Skills work when manually invoked
- ✅ Installation script configures GitLab Duo CLI

### Known Limitations
- ❌ Bootstrap must be manually requested (`Read superpowers://bootstrap`)
- ❌ Subagent support unknown - unclear if `subagent-driven-development` works
- ❌ Skills reference Claude Code tool names - requires mental translation
- ❌ No capability detection - users don't know what's available

---

## Architecture Overview

### File Structure (YAGNI - only necessary files)

```
.gitlab-duo/
├── mcp-server/
│   ├── src/
│   │   ├── index.js                    # [MODIFY] Main MCP server
│   │   ├── capabilities-detector.js    # [NEW] Capability detection module
│   │   ├── tool-adapter.js             # [NEW] Tool mapping/wrapper
│   │   └── resources/
│   │       ├── bootstrap.js            # [NEW] Bootstrap generation (DRY)
│   │       ├── welcome.js              # [NEW] Welcome resource
│   │       └── capabilities.js         # [NEW] Capabilities resource
│   ├── test/
│   │   ├── capabilities-detector.test.js
│   │   ├── tool-adapter.test.js
│   │   ├── resources.test.js
│   │   └── integration.test.js
│   └── package.json                    # [MODIFY] Add vitest
├── detect-capabilities.sh              # [NEW] Interactive detection script
└── capabilities.json                   # [GENERATED] Cached capabilities
```

### Data Flow

```
GitLab Duo CLI Start
        ↓
MCP Server Loads
  - Load skills
  - Load capabilities.json (if exists)
  - Initialize tool adapter
        ↓
User: "What prompts are available?"
        ↓
Response: Prompts list
  1. 🚀 initialize-superpowers (start here!)
  2. brainstorming
  3. test-driven-development
  ...
        ↓
User: "Use initialize-superpowers"
        ↓
Agent receives:
  - Bootstrap (using-superpowers skill)
  - Tool mappings (MCP tools + manual)
  - Capabilities summary
  - Welcome message
        ↓
Agent uses skills normally
  - Skill says "Use Read" → MCP tool translates
  - Skill needs subagent → falls back to executing-plans
```

---

## Component 1: Auto-Bootstrap via MCP Prompts

### Goal
Make initialization obvious without being automatic (respects user control).

### Implementation

#### 1.1 Special Prompt: `initialize-superpowers`

**Location:** `src/index.js` (modify `ListPromptsRequestSchema` handler)

**Behavior:**
- Appears **first** in prompts list
- Eye-catching description: `"🚀 Initialize Superpowers (start here!)"`
- When invoked, returns message that:
  1. Loads bootstrap content
  2. Explains skill system
  3. Lists next steps

**Code:**
```javascript
// In ListPromptsRequestSchema handler
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  const prompts = [
    // Initialize prompt FIRST
    {
      name: 'initialize-superpowers',
      description: '🚀 Initialize Superpowers (start here!)',
      arguments: []
    },
    // Then skill prompts
    ...skills.map(skill => ({
      name: skill.name,
      description: skill.description,
      arguments: []
    }))
  ];
  
  return { prompts };
});
```

**Tests (RED first):**
```javascript
// test/resources.test.js
describe('initialize-superpowers prompt', () => {
  it('should appear first in prompts list', async () => {
    const prompts = await server.listPrompts();
    expect(prompts[0].name).toBe('initialize-superpowers');
  });

  it('should have eye-catching description', async () => {
    const prompts = await server.listPrompts();
    expect(prompts[0].description).toContain('🚀');
    expect(prompts[0].description).toContain('start here');
  });

  it('should include bootstrap content when invoked', async () => {
    const result = await server.getPrompt('initialize-superpowers');
    expect(result.messages[0].content.text).toContain('using-superpowers');
    expect(result.messages[0].content.text).toContain('Tool Mapping');
  });
});
```

#### 1.2 Welcome Resource: `superpowers://welcome`

**Location:** `src/resources/welcome.js`

**Purpose:** Quick start guide for new users.

**Content:**
```markdown
# Welcome to Superpowers! 🚀

You now have access to a complete software development workflow system.

## Quick Start (3 steps)

1. **Initialize** - You're here! ✓
2. **Try a skill** - Ask: "Use the brainstorming skill to help me design a feature"
3. **Learn more** - Read: superpowers://bootstrap

## What's Available

- 14+ development skills (brainstorming, TDD, debugging, etc.)
- Automatic workflow guidance
- Tool mapping for GitLab Duo CLI

## Available Resources

- `superpowers://bootstrap` - Full introduction and tool mappings
- `superpowers://capabilities` - Detected GitLab Duo capabilities
- `superpowers://skill/<name>` - Individual skill content

## Need Help?

- List all skills: "What MCP resources are available?"
- Read a skill: "Read superpowers://skill/test-driven-development"
- Documentation: docs/README.gitlab-duo.md

## Troubleshooting

If skills don't work as expected:
1. Check capabilities: Read superpowers://capabilities
2. Run detection: bash .gitlab-duo/detect-capabilities.sh
3. See docs: .gitlab-duo/INSTALL.md
```

**Code:**
```javascript
// src/resources/welcome.js
export function generateWelcome() {
  return `# Welcome to Superpowers! 🚀

You now have access to a complete software development workflow system.

## Quick Start (3 steps)

1. **Initialize** - You're here! ✓
2. **Try a skill** - Ask: "Use the brainstorming skill to help me design a feature"
3. **Learn more** - Read: superpowers://bootstrap

## What's Available

- 14+ development skills (brainstorming, TDD, debugging, etc.)
- Automatic workflow guidance
- Tool mapping for GitLab Duo CLI

## Available Resources

- \`superpowers://bootstrap\` - Full introduction and tool mappings
- \`superpowers://capabilities\` - Detected GitLab Duo capabilities
- \`superpowers://skill/<name>\` - Individual skill content

## Need Help?

- List all skills: "What MCP resources are available?"
- Read a skill: "Read superpowers://skill/test-driven-development"
- Documentation: docs/README.gitlab-duo.md

## Troubleshooting

If skills don't work as expected:
1. Check capabilities: Read superpowers://capabilities
2. Run detection: bash .gitlab-duo/detect-capabilities.sh
3. See docs: .gitlab-duo/INSTALL.md
`;
}
```

**Tests (RED first):**
```javascript
// test/resources.test.js
describe('welcome resource', () => {
  it('should be available in resources list', async () => {
    const resources = await server.listResources();
    const welcome = resources.find(r => r.uri === 'superpowers://welcome');
    expect(welcome).toBeDefined();
    expect(welcome.name).toContain('Welcome');
  });

  it('should contain quick start steps', async () => {
    const content = await server.readResource('superpowers://welcome');
    expect(content).toContain('Quick Start');
    expect(content).toContain('3 steps');
  });

  it('should list available resources', async () => {
    const content = await server.readResource('superpowers://welcome');
    expect(content).toContain('superpowers://bootstrap');
    expect(content).toContain('superpowers://capabilities');
  });
});
```

#### 1.3 Enhanced Bootstrap

**Location:** `src/resources/bootstrap.js` (extract from index.js - DRY)

**Changes:**
- Add "First Time Setup" section at top
- Include capabilities summary
- Link to welcome and capabilities resources

**Code:**
```javascript
// src/resources/bootstrap.js
export function generateBootstrap(usingSuperpowersSkill, capabilities) {
  const firstTimeSetup = `
## First Time Setup ✓

You're all set! Superpowers is loaded and ready.

**Capabilities detected:**
${capabilities ? capabilities.getSummary() : 'Run: bash .gitlab-duo/detect-capabilities.sh'}

**Resources available:**
- \`superpowers://welcome\` - Quick start guide
- \`superpowers://capabilities\` - Full capability report
- \`superpowers://skill/<name>\` - Individual skills

**Next:** Try "Use the brainstorming skill" or read superpowers://welcome
`;

  const toolMapping = generateToolMapping(capabilities);

  return `<EXTREMELY_IMPORTANT>
You have superpowers.

${firstTimeSetup}

**Below is the full content of your 'superpowers:using-superpowers' skill:**

${usingSuperpowersSkill.content}

${toolMapping}
</EXTREMELY_IMPORTANT>`;
}

function generateToolMapping(capabilities) {
  const subagentStatus = capabilities?.hasSubagentSupport() 
    ? 'Supported ✓' 
    : 'Not supported - use executing-plans skill';

  return `
## Tool Mapping for GitLab Duo CLI

**MCP Tools Available (use directly):**
- \`Read\` → automatically uses \`read_file\`
- \`Write\` → automatically uses \`create_file_with_contents\`
- \`Edit\` → automatically uses \`edit_file\`
- \`Bash\` → automatically uses \`run_command\`

**Example:**
When a skill says "Use Read tool to check package.json", you can:
1. Use the MCP tool: \`Read\` with path="package.json"
2. Or directly: \`read_file\` with file_path="package.json"

**Other Mappings (manual):**

| Skill Reference | GitLab Duo Equivalent |
|----------------|----------------------|
| \`Grep\` | \`grep\` |
| \`Glob\` | \`find_files\` |
| \`TodoWrite\` | Manual tracking or native GitLab Duo tasks |
| \`WebSearch\` | \`gitlab_documentation_search\` |

**Subagents:** ${subagentStatus}

**Note:** Some skills may reference tools not available in GitLab Duo. Adapt the workflow using available tools.
`;
}
```

**Tests (RED first):**
```javascript
// test/resources.test.js
describe('bootstrap generation', () => {
  it('should include first time setup section', () => {
    const bootstrap = generateBootstrap(mockSkill, mockCapabilities);
    expect(bootstrap).toContain('First Time Setup');
  });

  it('should include capabilities summary', () => {
    const caps = { getSummary: () => 'Subagents: No, Tools: 8/10' };
    const bootstrap = generateBootstrap(mockSkill, caps);
    expect(bootstrap).toContain('Subagents: No');
  });

  it('should be reusable (DRY)', () => {
    const b1 = generateBootstrap(mockSkill, mockCapabilities);
    const b2 = generateBootstrap(mockSkill, mockCapabilities);
    expect(b1).toBe(b2); // Same inputs = same output
  });

  it('should show subagent status in tool mapping', () => {
    const capsWithSubagents = { 
      hasSubagentSupport: () => true,
      getSummary: () => 'Test'
    };
    const bootstrap = generateBootstrap(mockSkill, capsWithSubagents);
    expect(bootstrap).toContain('Subagents: Supported ✓');
  });

  it('should list MCP tools', () => {
    const bootstrap = generateBootstrap(mockSkill, mockCapabilities);
    expect(bootstrap).toContain('MCP Tools Available');
    expect(bootstrap).toContain('Read');
    expect(bootstrap).toContain('Write');
  });
});
```

---

## Component 2: Subagent Support Detection

### Goal
Automatically detect if GitLab Duo CLI supports subagents and document fallback clearly.

### Implementation

#### 2.1 Detection Script

**Location:** `.gitlab-duo/detect-capabilities.sh`

**Behavior:**
- Standalone executable: `bash .gitlab-duo/detect-capabilities.sh`
- Tests capabilities interactively with GitLab Duo CLI
- Saves results to `.gitlab-duo/capabilities.json`
- Can run during installation or manually
- Supports `--non-interactive` flag for CI/testing

**Capabilities Tested:**
1. Basic tools (read_file, edit_file, run_command, grep, find_files)
2. Subagent support (attempts to create test subagent)
3. GitLab-specific tools (gitlab_documentation_search, etc.)

**Output Format (capabilities.json):**
```json
{
  "detected_at": "2026-04-03T10:30:00Z",
  "gitlab_duo_version": "8.82.0",
  "tools": {
    "read_file": true,
    "edit_file": true,
    "create_file_with_contents": true,
    "run_command": true,
    "grep": true,
    "find_files": true,
    "gitlab_documentation_search": true,
    "web_search": false
  },
  "subagents": {
    "supported": false,
    "tested_method": "task_dispatch",
    "fallback": "executing-plans",
    "notes": "No subagent API detected in GitLab Duo CLI"
  }
}
```

**Script Structure:**
```bash
#!/usr/bin/env bash
# .gitlab-duo/detect-capabilities.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_FILE="${SCRIPT_DIR}/capabilities.json"
INTERACTIVE=true

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --non-interactive)
      INTERACTIVE=false
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "Detecting GitLab Duo CLI capabilities..."
echo ""

# Get GitLab Duo version
DUO_VERSION=$(duo --version 2>&1 | head -n1 || echo "unknown")
echo "GitLab Duo CLI: $DUO_VERSION"

# Test basic tools
echo ""
echo "Testing basic tools..."
test_tool() {
  local tool_name=$1
  # Test logic here - check if tool exists
  # Return 0 if supported, 1 if not
}

# Test subagent support
echo ""
echo "Testing subagent support..."
test_subagents() {
  # Try to create a test subagent
  # Return 0 if supported, 1 if not
}

# Generate JSON
cat > "$OUTPUT_FILE" <<EOF
{
  "detected_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "gitlab_duo_version": "$DUO_VERSION",
  "tools": {
    "read_file": $(test_tool "read_file" && echo "true" || echo "false"),
    "edit_file": $(test_tool "edit_file" && echo "true" || echo "false"),
    ...
  },
  "subagents": {
    "supported": $(test_subagents && echo "true" || echo "false"),
    "tested_method": "task_dispatch",
    "fallback": "executing-plans"
  }
}
EOF

echo ""
echo "✓ Capabilities saved to: $OUTPUT_FILE"
```

**Tests (RED first):**
```bash
# test/detect-capabilities.test.sh
#!/usr/bin/env bash

test_script_creates_json() {
  rm -f .gitlab-duo/capabilities.json
  bash .gitlab-duo/detect-capabilities.sh --non-interactive
  
  if [ ! -f .gitlab-duo/capabilities.json ]; then
    echo "FAIL: JSON not created"
    return 1
  fi
  
  echo "PASS: JSON created"
  return 0
}

test_json_has_required_fields() {
  bash .gitlab-duo/detect-capabilities.sh --non-interactive
  
  # Check required fields exist
  jq -e '.detected_at' .gitlab-duo/capabilities.json || return 1
  jq -e '.tools' .gitlab-duo/capabilities.json || return 1
  jq -e '.subagents' .gitlab-duo/capabilities.json || return 1
  
  echo "PASS: JSON has required fields"
  return 0
}

test_json_is_valid() {
  bash .gitlab-duo/detect-capabilities.sh --non-interactive
  
  # Validate JSON syntax
  jq empty .gitlab-duo/capabilities.json || return 1
  
  echo "PASS: JSON is valid"
  return 0
}

# Run tests
test_script_creates_json
test_json_has_required_fields
test_json_is_valid
```

#### 2.2 Capabilities Detector Module

**Location:** `src/capabilities-detector.js`

**Purpose:** Load and query capabilities.json

**API (YAGNI - only necessary methods):**
```javascript
// src/capabilities-detector.js
import fs from 'fs/promises';
import path from 'path';

export class CapabilitiesDetector {
  constructor(capabilitiesPath = null) {
    this.capabilitiesPath = capabilitiesPath || 
      path.join(path.dirname(new URL(import.meta.url).pathname), '../../capabilities.json');
    this.capabilities = null;
  }

  async load() {
    try {
      const content = await fs.readFile(this.capabilitiesPath, 'utf-8');
      this.capabilities = JSON.parse(content);
    } catch (err) {
      // File doesn't exist or invalid JSON - use safe defaults
      this.capabilities = this.getDefaults();
    }
  }

  getDefaults() {
    return {
      detected_at: null,
      gitlab_duo_version: 'unknown',
      tools: {
        read_file: true,
        edit_file: true,
        create_file_with_contents: true,
        run_command: true,
        grep: true,
        find_files: true
      },
      subagents: {
        supported: false,
        fallback: 'executing-plans'
      }
    };
  }

  hasSubagentSupport() {
    return this.capabilities?.subagents?.supported ?? false;
  }

  hasTool(toolName) {
    return this.capabilities?.tools?.[toolName] ?? false;
  }

  getSummary() {
    const toolCount = Object.values(this.capabilities?.tools || {})
      .filter(Boolean).length;
    const totalTools = Object.keys(this.capabilities?.tools || {}).length;
    const subagents = this.hasSubagentSupport() ? 'Yes' : 'No';
    
    return `Subagents: ${subagents}, Tools: ${toolCount}/${totalTools}`;
  }

  getDetailedReport() {
    const tools = this.capabilities?.tools || {};
    const available = Object.entries(tools)
      .filter(([_, supported]) => supported)
      .map(([name]) => `✅ ${name}`);
    const unavailable = Object.entries(tools)
      .filter(([_, supported]) => !supported)
      .map(([name]) => `❌ ${name}`);

    return {
      subagents: this.hasSubagentSupport(),
      available,
      unavailable,
      detectedAt: this.capabilities?.detected_at,
      version: this.capabilities?.gitlab_duo_version
    };
  }
}
```

**Tests (RED first):**
```javascript
// test/capabilities-detector.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { CapabilitiesDetector } from '../src/capabilities-detector.js';
import fs from 'fs/promises';
import path from 'path';

describe('CapabilitiesDetector', () => {
  const testFixture = path.join(__dirname, 'fixtures', 'capabilities.json');
  
  beforeEach(async () => {
    // Create test fixture
    await fs.mkdir(path.dirname(testFixture), { recursive: true });
    await fs.writeFile(testFixture, JSON.stringify({
      detected_at: '2026-04-03T10:00:00Z',
      gitlab_duo_version: '8.82.0',
      tools: {
        read_file: true,
        edit_file: true,
        web_search: false
      },
      subagents: {
        supported: false,
        fallback: 'executing-plans'
      }
    }));
  });

  it('should load capabilities from JSON', async () => {
    const detector = new CapabilitiesDetector(testFixture);
    await detector.load();
    
    expect(detector.hasSubagentSupport()).toBe(false);
    expect(detector.hasTool('read_file')).toBe(true);
    expect(detector.hasTool('web_search')).toBe(false);
  });

  it('should return defaults if JSON missing', async () => {
    const detector = new CapabilitiesDetector('nonexistent.json');
    await detector.load();
    
    expect(detector.hasSubagentSupport()).toBe(false); // Safe default
    expect(detector.hasTool('read_file')).toBe(true); // Assume basic tools
  });

  it('should generate summary for bootstrap', async () => {
    const detector = new CapabilitiesDetector(testFixture);
    await detector.load();
    
    const summary = detector.getSummary();
    expect(summary).toContain('Subagents: No');
    expect(summary).toContain('Tools:');
  });

  it('should generate detailed report', async () => {
    const detector = new CapabilitiesDetector(testFixture);
    await detector.load();
    
    const report = detector.getDetailedReport();
    expect(report.subagents).toBe(false);
    expect(report.available).toContain('✅ read_file');
    expect(report.unavailable).toContain('❌ web_search');
  });

  it('should handle invalid JSON gracefully', async () => {
    await fs.writeFile(testFixture, 'invalid json{');
    
    const detector = new CapabilitiesDetector(testFixture);
    await detector.load();
    
    // Should fall back to defaults
    expect(detector.hasTool('read_file')).toBe(true);
  });
});
```

#### 2.3 Capabilities Resource

**Location:** `src/resources/capabilities.js`

**Purpose:** Display detected capabilities to user

**Code:**
```javascript
// src/resources/capabilities.js
export function generateCapabilities(detector) {
  const report = detector.getDetailedReport();
  const subagentStatus = report.subagents ? '✅ Supported' : '❌ Not Supported';
  const fallbackNote = !report.subagents ? `

**Skills affected:**
- \`subagent-driven-development\` → Falls back to \`executing-plans\`
- \`dispatching-parallel-agents\` → Falls back to \`executing-plans\`

**What this means:**
Instead of dispatching independent subagents for parallel work, the agent will execute tasks sequentially in the current session with manual checkpoints.
` : '';

  return `# GitLab Duo CLI Capabilities

Last detected: ${report.detectedAt || 'Never (run detect-capabilities.sh)'}
GitLab Duo version: ${report.version || 'Unknown'}

## Subagent Support

${subagentStatus}
${fallbackNote}

## Available Tools

${report.available.join('\n')}

${report.unavailable.length > 0 ? `## Unavailable Tools

${report.unavailable.join('\n')}` : ''}

## Recommendations

${!report.subagents ? '- Use `executing-plans` skill for multi-task workflows instead of `subagent-driven-development`' : '- Full subagent support available - use `subagent-driven-development` for optimal workflow'}
- All file operation skills work normally
${detector.hasTool('gitlab_documentation_search') ? '- GitLab-specific documentation search available' : ''}

## Update Capabilities

To re-detect capabilities:
\`\`\`bash
bash .gitlab-duo/detect-capabilities.sh
\`\`\`

Then restart your GitLab Duo session to load updated capabilities.
`;
}
```

**Tests (RED first):**
```javascript
// test/resources.test.js
describe('capabilities resource', () => {
  it('should show subagent status', () => {
    const detector = new CapabilitiesDetector();
    detector.capabilities = {
      subagents: { supported: false },
      tools: { read_file: true }
    };
    
    const content = generateCapabilities(detector);
    expect(content).toContain('Subagent Support');
    expect(content).toContain('Not Supported');
  });

  it('should list available tools', () => {
    const detector = new CapabilitiesDetector();
    detector.capabilities = {
      subagents: { supported: false },
      tools: { 
        read_file: true,
        edit_file: true,
        web_search: false
      }
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
      tools: {}
    };
    
    const content = generateCapabilities(detector);
    expect(content).toContain('executing-plans');
    expect(content).toContain('Skills affected');
  });

  it('should include update instructions', () => {
    const detector = new CapabilitiesDetector();
    detector.capabilities = { subagents: {}, tools: {} };
    
    const content = generateCapabilities(detector);
    expect(content).toContain('detect-capabilities.sh');
  });
});
```

---

## Component 3: Tool Adapter (Hybrid)

### Goal
Allow skills to use Claude Code tool names with transparent translation.

### Implementation

#### 3.1 MCP Tools for Common Operations

**Location:** `src/tool-adapter.js`

**Tools to Create (YAGNI - only most used):**
- `Read` → instructs to use `read_file`
- `Write` → instructs to use `create_file_with_contents`
- `Edit` → instructs to use `edit_file`
- `Bash` → instructs to use `run_command`

**Important:** MCP Tools don't execute directly - they return instructions (MCP SDK may not support direct execution).

**Code:**
```javascript
// src/tool-adapter.js

export const TOOL_MAPPINGS = {
  'Read': {
    gitlabTool: 'read_file',
    description: 'Read file contents',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to file to read'
        },
        file_path: {
          type: 'string',
          description: 'Alternative: path to file to read'
        }
      }
    },
    mapArguments: (args) => ({
      file_path: args.path || args.file_path
    })
  },
  
  'Write': {
    gitlabTool: 'create_file_with_contents',
    description: 'Create file with contents',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to file' },
        file_path: { type: 'string', description: 'Alternative: path to file' },
        content: { type: 'string', description: 'File content' },
        contents: { type: 'string', description: 'Alternative: file content' }
      },
      required: ['content']
    },
    mapArguments: (args) => ({
      file_path: args.path || args.file_path,
      contents: args.content || args.contents
    })
  },
  
  'Edit': {
    gitlabTool: 'edit_file',
    description: 'Edit file contents',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to file' },
        file_path: { type: 'string', description: 'Alternative: path to file' },
        old_str: { type: 'string', description: 'String to replace' },
        new_str: { type: 'string', description: 'Replacement string' }
      },
      required: ['old_str', 'new_str']
    },
    mapArguments: (args) => ({
      file_path: args.path || args.file_path,
      old_str: args.old_str,
      new_str: args.new_str
    })
  },
  
  'Bash': {
    gitlabTool: 'run_command',
    description: 'Run shell command',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command to run' },
        cmd: { type: 'string', description: 'Alternative: command to run' }
      },
      required: ['command']
    },
    mapArguments: (args) => ({
      command: args.command || args.cmd
    })
  }
};

export class ToolAdapter {
  listTools() {
    return Object.entries(TOOL_MAPPINGS).map(([name, config]) => ({
      name,
      description: config.description,
      inputSchema: config.inputSchema
    }));
  }

  callTool(name, args) {
    const mapping = TOOL_MAPPINGS[name];
    if (!mapping) {
      throw new Error(`Unknown tool: ${name}`);
    }
    
    const gitlabArgs = mapping.mapArguments(args);
    
    return {
      content: [{
        type: 'text',
        text: `Use ${mapping.gitlabTool} with arguments: ${JSON.stringify(gitlabArgs, null, 2)}`
      }]
    };
  }
}

export function createToolAdapter() {
  return new ToolAdapter();
}
```

**Tests (RED first):**
```javascript
// test/tool-adapter.test.js
import { describe, it, expect } from 'vitest';
import { createToolAdapter, TOOL_MAPPINGS } from '../src/tool-adapter.js';

describe('ToolAdapter', () => {
  it('should list Superpowers tool names', () => {
    const adapter = createToolAdapter();
    const tools = adapter.listTools();
    
    expect(tools.map(t => t.name)).toContain('Read');
    expect(tools.map(t => t.name)).toContain('Write');
    expect(tools.map(t => t.name)).toContain('Edit');
    expect(tools.map(t => t.name)).toContain('Bash');
  });

  it('should include descriptions', () => {
    const adapter = createToolAdapter();
    const tools = adapter.listTools();
    
    const readTool = tools.find(t => t.name === 'Read');
    expect(readTool.description).toBeTruthy();
  });

  it('should map Read to read_file', () => {
    const adapter = createToolAdapter();
    const result = adapter.callTool('Read', { path: 'test.js' });
    
    expect(result.content[0].text).toContain('read_file');
    expect(result.content[0].text).toContain('test.js');
  });

  it('should handle argument variations (DRY)', () => {
    const adapter = createToolAdapter();
    
    // Both 'path' and 'file_path' should work
    const r1 = adapter.callTool('Read', { path: 'a.js' });
    const r2 = adapter.callTool('Read', { file_path: 'a.js' });
    
    expect(r1.content[0].text).toContain('a.js');
    expect(r2.content[0].text).toContain('a.js');
  });

  it('should map Write to create_file_with_contents', () => {
    const adapter = createToolAdapter();
    const result = adapter.callTool('Write', { 
      path: 'new.js', 
      content: 'console.log("test");' 
    });
    
    expect(result.content[0].text).toContain('create_file_with_contents');
    expect(result.content[0].text).toContain('new.js');
    expect(result.content[0].text).toContain('console.log');
  });

  it('should map Edit to edit_file', () => {
    const adapter = createToolAdapter();
    const result = adapter.callTool('Edit', {
      path: 'file.js',
      old_str: 'old code',
      new_str: 'new code'
    });
    
    expect(result.content[0].text).toContain('edit_file');
    expect(result.content[0].text).toContain('old code');
    expect(result.content[0].text).toContain('new code');
  });

  it('should map Bash to run_command', () => {
    const adapter = createToolAdapter();
    const result = adapter.callTool('Bash', { command: 'npm test' });
    
    expect(result.content[0].text).toContain('run_command');
    expect(result.content[0].text).toContain('npm test');
  });

  it('should throw error for unknown tool', () => {
    const adapter = createToolAdapter();
    
    expect(() => {
      adapter.callTool('UnknownTool', {});
    }).toThrow('Unknown tool');
  });

  it('should centralize mappings (DRY)', () => {
    // All tools should be defined in TOOL_MAPPINGS
    expect(TOOL_MAPPINGS).toHaveProperty('Read');
    expect(TOOL_MAPPINGS).toHaveProperty('Write');
    expect(TOOL_MAPPINGS).toHaveProperty('Edit');
    expect(TOOL_MAPPINGS).toHaveProperty('Bash');
    
    // No hardcoded mappings elsewhere
    const adapter = createToolAdapter();
    expect(adapter.listTools().length).toBe(Object.keys(TOOL_MAPPINGS).length);
  });
});
```

#### 3.2 MCP Server Integration

**Location:** `src/index.js` (add tools handlers)

**Code:**
```javascript
// In src/index.js
import { createToolAdapter } from './tool-adapter.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// In createServer()
const toolAdapter = createToolAdapter();

// Add tools capability
server = new Server(
  { name: 'superpowers', version: '1.0.0' },
  {
    capabilities: {
      resources: {},
      prompts: {},
      tools: {}  // Add this
    }
  }
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: toolAdapter.listTools() };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return toolAdapter.callTool(name, args);
});
```

**Tests (RED first):**
```javascript
// test/integration.test.js
describe('MCP Server tool integration', () => {
  it('should expose Superpowers tools via MCP', async () => {
    const tools = await server.listTools();
    
    expect(tools.map(t => t.name)).toContain('Read');
    expect(tools.map(t => t.name)).toContain('Write');
  });

  it('should handle tool calls', async () => {
    const result = await server.callTool('Read', { path: 'test.js' });
    
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('read_file');
  });

  it('should return error for invalid tool', async () => {
    await expect(
      server.callTool('InvalidTool', {})
    ).rejects.toThrow();
  });
});
```

---

## Integration & Testing

### Test Setup

**Package.json changes:**
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@types/node": "^20.0.0"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage"
  }
}
```

### TDD Implementation Order

**Strict RED-GREEN-REFACTOR cycle for each component:**

#### Phase 1: Capabilities Detector (Foundation)
1. **RED:** Write `test/capabilities-detector.test.js`
2. **GREEN:** Implement `src/capabilities-detector.js` (minimal)
3. **REFACTOR:** Extract constants, improve error handling

#### Phase 2: Tool Adapter (Independent)
1. **RED:** Write `test/tool-adapter.test.js`
2. **GREEN:** Implement `src/tool-adapter.js` (minimal)
3. **REFACTOR:** DRY the mappings, consolidate argument handling

#### Phase 3: Resources (Uses Capabilities)
1. **RED:** Write `test/resources.test.js`
2. **GREEN:** Implement `src/resources/*.js` (minimal)
3. **REFACTOR:** Extract content generation, share templates

#### Phase 4: Integration (Ties Everything Together)
1. **RED:** Write `test/integration.test.js`
2. **GREEN:** Modify `src/index.js` to wire components
3. **REFACTOR:** Organize handlers, extract initialization logic

#### Phase 5: Detection Script (E2E Validation)
1. **RED:** Write `test/detect-capabilities.test.sh`
2. **GREEN:** Implement `detect-capabilities.sh` (minimal)
3. **REFACTOR:** Improve output, add flags, better error messages

### Test Coverage Goals

- **Unit tests:** 100% coverage of business logic
- **Integration tests:** All MCP handlers tested
- **E2E tests:** Detection script produces valid JSON

---

## Principles Applied

### TDD (Test-Driven Development)
✅ All tests written BEFORE implementation code  
✅ Strict RED-GREEN-REFACTOR cycle  
✅ No code without failing test first  
✅ Tests document expected behavior  

### YAGNI (You Aren't Gonna Need It)
✅ No logging framework (console.error sufficient)  
✅ No config system (env vars sufficient)  
✅ No session state (stateless for now)  
✅ Only 4 MCP tools (most commonly used)  
✅ No UI/dashboard (terminal sufficient)  
✅ No metrics/analytics (not needed yet)  

### DRY (Don't Repeat Yourself)
✅ Bootstrap generation extracted to function  
✅ Tool mappings centralized in TOOL_MAPPINGS  
✅ Capabilities loading reusable via class  
✅ Resource generation shares logic  
✅ Test fixtures shared across test files  

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| MCP SDK doesn't support tools | Medium | High | Fallback to text instructions (already in design) |
| GitLab Duo doesn't list prompts in order | Low | Medium | Use emoji/description to stand out |
| capabilities.json doesn't exist | High | Low | Safe defaults, clear instructions to run script |
| Subagent detection fails | Medium | Medium | Assume "not supported" as safe default |
| Tool adapter adds latency | Low | Low | Instructions are lightweight, no execution |

---

## Success Criteria

### Component 1: Auto-Bootstrap
- ✅ `initialize-superpowers` prompt appears first in list
- ✅ Prompt includes bootstrap + welcome content
- ✅ Welcome resource provides clear next steps
- ✅ Bootstrap includes capabilities summary

### Component 2: Subagent Detection
- ✅ Detection script runs successfully
- ✅ capabilities.json created with valid structure
- ✅ Capabilities resource shows accurate status
- ✅ Bootstrap adapts based on detected capabilities

### Component 3: Tool Adapter
- ✅ MCP tools listed and callable
- ✅ Tool calls return correct GitLab Duo instructions
- ✅ Bootstrap documents both MCP tools and manual mappings
- ✅ Skills work without modification

### Overall Integration
- ✅ All tests pass (unit + integration + E2E)
- ✅ Installation script updated to run detection
- ✅ Documentation updated with new features
- ✅ No breaking changes to existing functionality

---

## Next Steps After Approval

1. **Review this spec** - Confirm design is correct
2. **Create implementation plan** - Break into bite-sized tasks
3. **Execute with TDD** - RED-GREEN-REFACTOR for each task
4. **Test on real GitLab Duo CLI** - Validate with actual usage
5. **Update documentation** - Reflect new capabilities
6. **Consider upstream contribution** - If appropriate per AGENTS.md

---

## Files to Create/Modify

### New Files
- `src/capabilities-detector.js`
- `src/tool-adapter.js`
- `src/resources/bootstrap.js`
- `src/resources/welcome.js`
- `src/resources/capabilities.js`
- `test/capabilities-detector.test.js`
- `test/tool-adapter.test.js`
- `test/resources.test.js`
- `test/integration.test.js`
- `test/detect-capabilities.test.sh`
- `test/fixtures/capabilities.json`
- `detect-capabilities.sh`

### Modified Files
- `src/index.js` - Add tools handlers, integrate new resources
- `package.json` - Add vitest dev dependency
- `install.sh` - Optionally run detection during install
- `README.md` - Document new features
- `docs/README.gitlab-duo.md` - Update with capabilities info

### Generated Files
- `capabilities.json` - Created by detection script

---

**End of Design Document**
