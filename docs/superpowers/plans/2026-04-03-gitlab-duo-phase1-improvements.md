# GitLab Duo CLI Phase 1 Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement auto-bootstrap, subagent detection, and tool adapter for GitLab Duo CLI integration using strict TDD (RED-GREEN-REFACTOR), YAGNI, and DRY principles.

**Architecture:** Progressive enhancement approach - add three independent components (capabilities detector, tool adapter, enhanced resources) that integrate into existing MCP server without breaking current functionality.

**Tech Stack:** Node.js 18+, MCP SDK 1.0.4, Vitest for testing, Bash for detection script

---

## File Structure

### New Files
- `.gitlab-duo/mcp-server/src/capabilities-detector.js` - Load and query capabilities
- `.gitlab-duo/mcp-server/src/tool-adapter.js` - Map Superpowers tools to GitLab Duo
- `.gitlab-duo/mcp-server/src/resources/bootstrap.js` - Generate bootstrap content (DRY)
- `.gitlab-duo/mcp-server/src/resources/welcome.js` - Generate welcome resource
- `.gitlab-duo/mcp-server/src/resources/capabilities.js` - Generate capabilities report
- `.gitlab-duo/mcp-server/test/capabilities-detector.test.js` - Unit tests
- `.gitlab-duo/mcp-server/test/tool-adapter.test.js` - Unit tests
- `.gitlab-duo/mcp-server/test/resources.test.js` - Unit tests
- `.gitlab-duo/mcp-server/test/integration.test.js` - Integration tests
- `.gitlab-duo/mcp-server/test/fixtures/capabilities.json` - Test fixture
- `.gitlab-duo/detect-capabilities.sh` - Interactive capability detection

### Modified Files
- `.gitlab-duo/mcp-server/package.json` - Add vitest dev dependency
- `.gitlab-duo/mcp-server/src/index.js` - Integrate new components

### Generated Files
- `.gitlab-duo/capabilities.json` - Created by detection script (gitignored)

---

## Task 1: Setup Test Infrastructure

**Files:**
- Modify: `.gitlab-duo/mcp-server/package.json`
- Create: `.gitlab-duo/mcp-server/test/fixtures/capabilities.json`

- [ ] **Step 1: Add vitest to package.json**

```json
{
  "name": "superpowers-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for Superpowers skills in GitLab Duo CLI",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage"
  },
  "keywords": [
    "mcp",
    "gitlab-duo",
    "superpowers",
    "skills"
  ],
  "author": "Superpowers Contributors",
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@types/node": "^20.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd .gitlab-duo/mcp-server
npm install
```

Expected: vitest and @types/node installed in node_modules

- [ ] **Step 3: Create test fixtures directory**

```bash
mkdir -p test/fixtures
```

- [ ] **Step 4: Create test fixture for capabilities**

Create `.gitlab-duo/mcp-server/test/fixtures/capabilities.json`:

```json
{
  "detected_at": "2026-04-03T10:00:00Z",
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
    "notes": "No subagent API detected"
  }
}
```

- [ ] **Step 5: Verify test infrastructure works**

```bash
npm test
```

Expected: "No test files found" (we haven't written tests yet)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json test/fixtures/
git commit -m "test: add vitest infrastructure and test fixtures"
```

---

## Task 2: Capabilities Detector - Tests (RED)

**Files:**
- Create: `.gitlab-duo/mcp-server/test/capabilities-detector.test.js`

- [ ] **Step 1: Write failing tests for CapabilitiesDetector**

Create `.gitlab-duo/mcp-server/test/capabilities-detector.test.js`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { CapabilitiesDetector } from '../src/capabilities-detector.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('CapabilitiesDetector', () => {
  const testFixture = path.join(__dirname, 'fixtures', 'capabilities.json');
  
  describe('load', () => {
    it('should load capabilities from JSON file', async () => {
      const detector = new CapabilitiesDetector(testFixture);
      await detector.load();
      
      expect(detector.capabilities).toBeDefined();
      expect(detector.capabilities.gitlab_duo_version).toBe('8.82.0');
    });

    it('should return defaults if JSON file missing', async () => {
      const detector = new CapabilitiesDetector('nonexistent.json');
      await detector.load();
      
      expect(detector.capabilities).toBeDefined();
      expect(detector.capabilities.subagents.supported).toBe(false);
    });

    it('should handle invalid JSON gracefully', async () => {
      const invalidPath = path.join(__dirname, 'fixtures', 'invalid.json');
      await fs.writeFile(invalidPath, 'invalid json{');
      
      const detector = new CapabilitiesDetector(invalidPath);
      await detector.load();
      
      expect(detector.capabilities).toBeDefined();
      expect(detector.hasTool('read_file')).toBe(true);
      
      await fs.unlink(invalidPath);
    });
  });

  describe('hasSubagentSupport', () => {
    it('should return false when subagents not supported', async () => {
      const detector = new CapabilitiesDetector(testFixture);
      await detector.load();
      
      expect(detector.hasSubagentSupport()).toBe(false);
    });

    it('should return true when subagents supported', async () => {
      const detector = new CapabilitiesDetector();
      detector.capabilities = {
        subagents: { supported: true }
      };
      
      expect(detector.hasSubagentSupport()).toBe(true);
    });

    it('should return false as safe default', async () => {
      const detector = new CapabilitiesDetector();
      detector.capabilities = {};
      
      expect(detector.hasSubagentSupport()).toBe(false);
    });
  });

  describe('hasTool', () => {
    it('should return true for available tools', async () => {
      const detector = new CapabilitiesDetector(testFixture);
      await detector.load();
      
      expect(detector.hasTool('read_file')).toBe(true);
      expect(detector.hasTool('edit_file')).toBe(true);
    });

    it('should return false for unavailable tools', async () => {
      const detector = new CapabilitiesDetector(testFixture);
      await detector.load();
      
      expect(detector.hasTool('web_search')).toBe(false);
    });

    it('should return false for unknown tools', async () => {
      const detector = new CapabilitiesDetector(testFixture);
      await detector.load();
      
      expect(detector.hasTool('unknown_tool')).toBe(false);
    });
  });

  describe('getSummary', () => {
    it('should generate summary string', async () => {
      const detector = new CapabilitiesDetector(testFixture);
      await detector.load();
      
      const summary = detector.getSummary();
      expect(summary).toContain('Subagents: No');
      expect(summary).toContain('Tools:');
    });

    it('should count tools correctly', async () => {
      const detector = new CapabilitiesDetector(testFixture);
      await detector.load();
      
      const summary = detector.getSummary();
      expect(summary).toContain('7/8'); // 7 available out of 8 total
    });
  });

  describe('getDetailedReport', () => {
    it('should list available and unavailable tools', async () => {
      const detector = new CapabilitiesDetector(testFixture);
      await detector.load();
      
      const report = detector.getDetailedReport();
      expect(report.available).toContain('✅ read_file');
      expect(report.unavailable).toContain('❌ web_search');
    });

    it('should include metadata', async () => {
      const detector = new CapabilitiesDetector(testFixture);
      await detector.load();
      
      const report = detector.getDetailedReport();
      expect(report.subagents).toBe(false);
      expect(report.detectedAt).toBe('2026-04-03T10:00:00Z');
      expect(report.version).toBe('8.82.0');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: All tests FAIL with "Cannot find module '../src/capabilities-detector.js'"

- [ ] **Step 3: Commit failing tests**

```bash
git add test/capabilities-detector.test.js
git commit -m "test: add failing tests for CapabilitiesDetector (RED)"
```

---

## Task 3: Capabilities Detector - Implementation (GREEN)

**Files:**
- Create: `.gitlab-duo/mcp-server/src/capabilities-detector.js`

- [ ] **Step 1: Implement CapabilitiesDetector class**

Create `.gitlab-duo/mcp-server/src/capabilities-detector.js`:

```javascript
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CapabilitiesDetector {
  constructor(capabilitiesPath = null) {
    this.capabilitiesPath = capabilitiesPath || 
      path.join(__dirname, '../../capabilities.json');
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
        find_files: true,
        gitlab_documentation_search: false,
        web_search: false
      },
      subagents: {
        supported: false,
        tested_method: null,
        fallback: 'executing-plans',
        notes: 'Capabilities not detected - run detect-capabilities.sh'
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
    const tools = this.capabilities?.tools || {};
    const toolCount = Object.values(tools).filter(Boolean).length;
    const totalTools = Object.keys(tools).length;
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

- [ ] **Step 2: Run tests to verify they pass**

```bash
npm test capabilities-detector
```

Expected: All CapabilitiesDetector tests PASS

- [ ] **Step 3: Commit implementation**

```bash
git add src/capabilities-detector.js
git commit -m "feat: implement CapabilitiesDetector (GREEN)"
```

---

## Task 4: Tool Adapter - Tests (RED)

**Files:**
- Create: `.gitlab-duo/mcp-server/test/tool-adapter.test.js`

- [ ] **Step 1: Write failing tests for ToolAdapter**

Create `.gitlab-duo/mcp-server/test/tool-adapter.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { createToolAdapter, TOOL_MAPPINGS } from '../src/tool-adapter.js';

describe('ToolAdapter', () => {
  describe('listTools', () => {
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
      expect(readTool.description).toBe('Read file contents');
    });

    it('should include input schemas', () => {
      const adapter = createToolAdapter();
      const tools = adapter.listTools();
      
      const readTool = tools.find(t => t.name === 'Read');
      expect(readTool.inputSchema).toBeDefined();
      expect(readTool.inputSchema.type).toBe('object');
    });
  });

  describe('callTool', () => {
    it('should map Read to read_file', () => {
      const adapter = createToolAdapter();
      const result = adapter.callTool('Read', { path: 'test.js' });
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('read_file');
      expect(result.content[0].text).toContain('test.js');
    });

    it('should handle path argument variations (DRY)', () => {
      const adapter = createToolAdapter();
      
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

    it('should handle content argument variations', () => {
      const adapter = createToolAdapter();
      
      const r1 = adapter.callTool('Write', { path: 'a.js', content: 'test' });
      const r2 = adapter.callTool('Write', { path: 'a.js', contents: 'test' });
      
      expect(r1.content[0].text).toContain('test');
      expect(r2.content[0].text).toContain('test');
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

    it('should handle command argument variations', () => {
      const adapter = createToolAdapter();
      
      const r1 = adapter.callTool('Bash', { command: 'ls' });
      const r2 = adapter.callTool('Bash', { cmd: 'ls' });
      
      expect(r1.content[0].text).toContain('ls');
      expect(r2.content[0].text).toContain('ls');
    });

    it('should throw error for unknown tool', () => {
      const adapter = createToolAdapter();
      
      expect(() => {
        adapter.callTool('UnknownTool', {});
      }).toThrow('Unknown tool: UnknownTool');
    });
  });

  describe('TOOL_MAPPINGS (DRY)', () => {
    it('should centralize all mappings', () => {
      expect(TOOL_MAPPINGS).toHaveProperty('Read');
      expect(TOOL_MAPPINGS).toHaveProperty('Write');
      expect(TOOL_MAPPINGS).toHaveProperty('Edit');
      expect(TOOL_MAPPINGS).toHaveProperty('Bash');
    });

    it('should match listTools output', () => {
      const adapter = createToolAdapter();
      const tools = adapter.listTools();
      
      expect(tools.length).toBe(Object.keys(TOOL_MAPPINGS).length);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test tool-adapter
```

Expected: All tests FAIL with "Cannot find module '../src/tool-adapter.js'"

- [ ] **Step 3: Commit failing tests**

```bash
git add test/tool-adapter.test.js
git commit -m "test: add failing tests for ToolAdapter (RED)"
```

---

## Task 5: Tool Adapter - Implementation (GREEN)

**Files:**
- Create: `.gitlab-duo/mcp-server/src/tool-adapter.js`

- [ ] **Step 1: Implement ToolAdapter**

Create `.gitlab-duo/mcp-server/src/tool-adapter.js`:

```javascript
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
      }
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
      }
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
      }
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

- [ ] **Step 2: Run tests to verify they pass**

```bash
npm test tool-adapter
```

Expected: All ToolAdapter tests PASS

- [ ] **Step 3: Commit implementation**

```bash
git add src/tool-adapter.js
git commit -m "feat: implement ToolAdapter with DRY mappings (GREEN)"
```

---

## Task 6: Resources Module - Tests (RED)

**Files:**
- Create: `.gitlab-duo/mcp-server/test/resources.test.js`

- [ ] **Step 1: Write failing tests for resource generators**

Create `.gitlab-duo/mcp-server/test/resources.test.js`:

```javascript
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
    
    expect(content).toContain('Subagents: Supported ✓');
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test resources
```

Expected: All tests FAIL with "Cannot find module '../src/resources/welcome.js'"

- [ ] **Step 3: Commit failing tests**

```bash
git add test/resources.test.js
git commit -m "test: add failing tests for resource generators (RED)"
```

---

## Task 7: Resources Module - Implementation (GREEN)

**Files:**
- Create: `.gitlab-duo/mcp-server/src/resources/welcome.js`
- Create: `.gitlab-duo/mcp-server/src/resources/bootstrap.js`
- Create: `.gitlab-duo/mcp-server/src/resources/capabilities.js`

- [ ] **Step 1: Create resources directory**

```bash
mkdir -p .gitlab-duo/mcp-server/src/resources
```

- [ ] **Step 2: Implement welcome resource**

Create `.gitlab-duo/mcp-server/src/resources/welcome.js`:

```javascript
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

- [ ] **Step 3: Implement bootstrap resource**

Create `.gitlab-duo/mcp-server/src/resources/bootstrap.js`:

```javascript
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

- [ ] **Step 4: Implement capabilities resource**

Create `.gitlab-duo/mcp-server/src/resources/capabilities.js`:

```javascript
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

${!report.subagents ? '- Use \`executing-plans\` skill for multi-task workflows instead of \`subagent-driven-development\`' : '- Full subagent support available - use \`subagent-driven-development\` for optimal workflow'}
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

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test resources
```

Expected: All resource tests PASS

- [ ] **Step 6: Commit implementation**

```bash
git add src/resources/
git commit -m "feat: implement resource generators with DRY principles (GREEN)"
```

---

## Task 8: MCP Server Integration - Tests (RED)

**Files:**
- Create: `.gitlab-duo/mcp-server/test/integration.test.js`

- [ ] **Step 1: Write failing integration tests**

Create `.gitlab-duo/mcp-server/test/integration.test.js`:

```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

// Mock server setup - will be implemented in next task
let server;

beforeAll(async () => {
  // Server creation will be tested here
  // For now, tests will fail
});

describe('MCP Server Integration', () => {
  describe('Resources', () => {
    it('should list welcome resource', async () => {
      const response = await server.request({
        method: 'resources/list'
      }, ListResourcesRequestSchema);
      
      const welcome = response.resources.find(r => r.uri === 'superpowers://welcome');
      expect(welcome).toBeDefined();
      expect(welcome.name).toContain('Welcome');
    });

    it('should list capabilities resource', async () => {
      const response = await server.request({
        method: 'resources/list'
      }, ListResourcesRequestSchema);
      
      const caps = response.resources.find(r => r.uri === 'superpowers://capabilities');
      expect(caps).toBeDefined();
    });

    it('should read welcome resource', async () => {
      const response = await server.request({
        method: 'resources/read',
        params: { uri: 'superpowers://welcome' }
      }, ReadResourceRequestSchema);
      
      expect(response.contents[0].text).toContain('Welcome to Superpowers');
    });

    it('should read capabilities resource', async () => {
      const response = await server.request({
        method: 'resources/read',
        params: { uri: 'superpowers://capabilities' }
      }, ReadResourceRequestSchema);
      
      expect(response.contents[0].text).toContain('GitLab Duo CLI Capabilities');
    });

    it('should read enhanced bootstrap', async () => {
      const response = await server.request({
        method: 'resources/read',
        params: { uri: 'superpowers://bootstrap' }
      }, ReadResourceRequestSchema);
      
      expect(response.contents[0].text).toContain('First Time Setup');
      expect(response.contents[0].text).toContain('MCP Tools Available');
    });
  });

  describe('Prompts', () => {
    it('should list initialize-superpowers prompt first', async () => {
      const response = await server.request({
        method: 'prompts/list'
      }, ListPromptsRequestSchema);
      
      expect(response.prompts[0].name).toBe('initialize-superpowers');
      expect(response.prompts[0].description).toContain('🚀');
    });

    it('should get initialize-superpowers prompt', async () => {
      const response = await server.request({
        method: 'prompts/get',
        params: { name: 'initialize-superpowers' }
      }, GetPromptRequestSchema);
      
      expect(response.messages[0].content.text).toContain('using-superpowers');
      expect(response.messages[0].content.text).toContain('Tool Mapping');
    });
  });

  describe('Tools', () => {
    it('should list Superpowers tools', async () => {
      const response = await server.request({
        method: 'tools/list'
      }, ListToolsRequestSchema);
      
      const toolNames = response.tools.map(t => t.name);
      expect(toolNames).toContain('Read');
      expect(toolNames).toContain('Write');
      expect(toolNames).toContain('Edit');
      expect(toolNames).toContain('Bash');
    });

    it('should call Read tool', async () => {
      const response = await server.request({
        method: 'tools/call',
        params: {
          name: 'Read',
          arguments: { path: 'test.js' }
        }
      }, CallToolRequestSchema);
      
      expect(response.content[0].text).toContain('read_file');
      expect(response.content[0].text).toContain('test.js');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test integration
```

Expected: All tests FAIL (server not initialized)

- [ ] **Step 3: Commit failing tests**

```bash
git add test/integration.test.js
git commit -m "test: add failing integration tests (RED)"
```

---

## Task 9: MCP Server Integration - Implementation (GREEN)

**Files:**
- Modify: `.gitlab-duo/mcp-server/src/index.js`

- [ ] **Step 1: Import new modules at top of index.js**

Add these imports after existing imports in `.gitlab-duo/mcp-server/src/index.js`:

```javascript
import { CapabilitiesDetector } from './capabilities-detector.js';
import { createToolAdapter } from './tool-adapter.js';
import { generateWelcome } from './resources/welcome.js';
import { generateBootstrap } from './resources/bootstrap.js';
import { generateCapabilities } from './resources/capabilities.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
```

- [ ] **Step 2: Initialize capabilities and tool adapter in createServer()**

Find the `createServer()` function and add after `const skills = await loadSkills();`:

```javascript
// Load capabilities
const capabilitiesDetector = new CapabilitiesDetector();
await capabilitiesDetector.load();
console.error(`Capabilities: ${capabilitiesDetector.getSummary()}`);

// Initialize tool adapter
const toolAdapter = createToolAdapter();
```

- [ ] **Step 3: Update server capabilities**

Replace the server initialization to include tools:

```javascript
const server = new Server(
  {
    name: 'superpowers',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      prompts: {},
      tools: {}  // Add this line
    },
  }
);
```

- [ ] **Step 4: Update ListResourcesRequestSchema handler**

Replace the existing handler with:

```javascript
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources = [
    // Bootstrap first
    {
      uri: 'superpowers://bootstrap',
      name: 'Superpowers Bootstrap',
      description: 'Initial context and instructions for using Superpowers skills',
      mimeType: 'text/markdown',
    },
    // Welcome second
    {
      uri: 'superpowers://welcome',
      name: 'Welcome to Superpowers',
      description: 'Quick start guide and overview',
      mimeType: 'text/markdown',
    },
    // Capabilities third
    {
      uri: 'superpowers://capabilities',
      name: 'GitLab Duo Capabilities',
      description: 'Detected capabilities and tool availability',
      mimeType: 'text/markdown',
    },
    // Then skills
    ...skills.map(skill => ({
      uri: `superpowers://skill/${skill.name}`,
      name: `Skill: ${skill.name}`,
      description: skill.description,
      mimeType: 'text/markdown',
    }))
  ];

  return { resources };
});
```

- [ ] **Step 5: Update ReadResourceRequestSchema handler**

Replace the existing handler with:

```javascript
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  // Handle welcome resource
  if (uri === 'superpowers://welcome') {
    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text: generateWelcome(),
      }],
    };
  }

  // Handle capabilities resource
  if (uri === 'superpowers://capabilities') {
    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text: generateCapabilities(capabilitiesDetector),
      }],
    };
  }

  // Handle bootstrap resource
  if (uri === 'superpowers://bootstrap') {
    const usingSuperpowersSkill = skills.find(s => s.name === 'using-superpowers');
    if (!usingSuperpowersSkill) {
      throw new Error('using-superpowers skill not found');
    }

    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text: generateBootstrap(usingSuperpowersSkill, capabilitiesDetector),
      }],
    };
  }

  // Handle skill resources
  const match = uri.match(/^superpowers:\/\/skill\/(.+)$/);
  if (!match) {
    throw new Error(`Unknown resource URI: ${uri}`);
  }

  const skillName = match[1];
  const skill = skills.find(s => s.name === skillName);
  
  if (!skill) {
    throw new Error(`Skill not found: ${skillName}`);
  }

  return {
    contents: [{
      uri,
      mimeType: 'text/markdown',
      text: skill.fullContent,
    }],
  };
});
```

- [ ] **Step 6: Update ListPromptsRequestSchema handler**

Replace the existing handler with:

```javascript
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
      arguments: [],
    }))
  ];

  return { prompts };
});
```

- [ ] **Step 7: Update GetPromptRequestSchema handler**

Replace the existing handler with:

```javascript
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const promptName = request.params.name;
  
  // Handle initialize-superpowers prompt
  if (promptName === 'initialize-superpowers') {
    const usingSuperpowersSkill = skills.find(s => s.name === 'using-superpowers');
    if (!usingSuperpowersSkill) {
      throw new Error('using-superpowers skill not found');
    }

    const bootstrapContent = generateBootstrap(usingSuperpowersSkill, capabilitiesDetector);
    const welcomeContent = generateWelcome();

    return {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `${bootstrapContent}\n\n---\n\n${welcomeContent}`,
        },
      }],
    };
  }

  // Handle skill prompts
  const skill = skills.find(s => s.name === promptName);
  if (!skill) {
    throw new Error(`Prompt not found: ${promptName}`);
  }

  return {
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Please use the ${skill.name} skill to guide this work.\n\nSkill content:\n\n${skill.fullContent}`,
      },
    }],
  };
});
```

- [ ] **Step 8: Add tools handlers**

Add these new handlers before the `return server;` line:

```javascript
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

- [ ] **Step 9: Run tests to verify they pass**

```bash
npm test
```

Expected: All tests PASS

- [ ] **Step 10: Commit implementation**

```bash
git add src/index.js
git commit -m "feat: integrate capabilities, tools, and enhanced resources (GREEN)"
```

---

## Task 10: Detection Script - Implementation

**Files:**
- Create: `.gitlab-duo/detect-capabilities.sh`

- [ ] **Step 1: Create detection script**

Create `.gitlab-duo/detect-capabilities.sh`:

```bash
#!/usr/bin/env bash
# GitLab Duo CLI Capabilities Detection Script

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_FILE="${SCRIPT_DIR}/capabilities.json"
INTERACTIVE=true

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --non-interactive)
      INTERACTIVE=false
      shift
      ;;
    --help)
      echo "Usage: $0 [--non-interactive]"
      echo ""
      echo "Detect GitLab Duo CLI capabilities and save to capabilities.json"
      echo ""
      echo "Options:"
      echo "  --non-interactive  Run without user prompts (for CI/testing)"
      echo "  --help            Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

echo "================================================"
echo "GitLab Duo CLI Capabilities Detection"
echo "================================================"
echo ""

# Get GitLab Duo version
echo "Detecting GitLab Duo CLI version..."
if command -v duo &> /dev/null; then
  DUO_VERSION=$(duo --version 2>&1 | head -n1 || echo "unknown")
  echo -e "${GREEN}✓${NC} GitLab Duo CLI: $DUO_VERSION"
else
  echo -e "${RED}✗${NC} GitLab Duo CLI not found in PATH"
  DUO_VERSION="not installed"
fi
echo ""

# Test basic tools
echo "Testing basic file operation tools..."
TOOLS_JSON="{"

# Assume these tools are available (standard GitLab Duo CLI tools)
BASIC_TOOLS=(
  "read_file"
  "edit_file"
  "create_file_with_contents"
  "run_command"
  "grep"
  "find_files"
)

for tool in "${BASIC_TOOLS[@]}"; do
  TOOLS_JSON="${TOOLS_JSON}\"${tool}\": true, "
  echo -e "${GREEN}✓${NC} $tool (assumed available)"
done

# Test GitLab-specific tools
echo ""
echo "Testing GitLab-specific tools..."

# gitlab_documentation_search - likely available
TOOLS_JSON="${TOOLS_JSON}\"gitlab_documentation_search\": true, "
echo -e "${GREEN}✓${NC} gitlab_documentation_search (assumed available)"

# web_search - likely not available
TOOLS_JSON="${TOOLS_JSON}\"web_search\": false"
echo -e "${YELLOW}?${NC} web_search (assumed not available)"

TOOLS_JSON="${TOOLS_JSON}}"

# Test subagent support
echo ""
echo "Testing subagent support..."
echo -e "${YELLOW}⚠${NC}  Subagent detection requires interactive testing"
echo "   GitLab Duo CLI subagent support is currently unknown"
echo "   Assuming NOT SUPPORTED (safe default)"

SUBAGENTS_SUPPORTED="false"
SUBAGENT_NOTES="Subagent support unknown - manual verification needed. Try asking GitLab Duo: 'Do you support dispatching subagents?'"

# Generate JSON
echo ""
echo "Generating capabilities report..."

cat > "$OUTPUT_FILE" <<EOF
{
  "detected_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "gitlab_duo_version": "$DUO_VERSION",
  "tools": $TOOLS_JSON,
  "subagents": {
    "supported": $SUBAGENTS_SUPPORTED,
    "tested_method": "manual_verification_needed",
    "fallback": "executing-plans",
    "notes": "$SUBAGENT_NOTES"
  }
}
EOF

echo -e "${GREEN}✓${NC} Capabilities saved to: $OUTPUT_FILE"
echo ""

# Show summary
echo "================================================"
echo "Detection Summary"
echo "================================================"
echo ""
echo "GitLab Duo Version: $DUO_VERSION"
echo "Subagent Support: ${SUBAGENTS_SUPPORTED}"
echo "Tools Detected: 8 (7 available, 1 unavailable)"
echo ""
echo "Next Steps:"
echo "1. Restart GitLab Duo CLI to load new capabilities"
echo "2. Test: duo"
echo "3. Ask: 'What MCP resources are available?'"
echo "4. Use: 'Use initialize-superpowers prompt'"
echo ""
echo "To manually verify subagent support:"
echo "  Ask GitLab Duo: 'Do you support dispatching subagents?'"
echo ""
```

- [ ] **Step 2: Make script executable**

```bash
chmod +x .gitlab-duo/detect-capabilities.sh
```

- [ ] **Step 3: Test script execution**

```bash
bash .gitlab-duo/detect-capabilities.sh --non-interactive
```

Expected: capabilities.json created with valid JSON

- [ ] **Step 4: Verify JSON is valid**

```bash
cat .gitlab-duo/capabilities.json | python3 -m json.tool
```

Expected: Pretty-printed JSON without errors

- [ ] **Step 5: Add capabilities.json to .gitignore**

Add to `.gitlab-duo/.gitignore` (create if doesn't exist):

```
capabilities.json
```

- [ ] **Step 6: Commit detection script**

```bash
git add detect-capabilities.sh .gitignore
git commit -m "feat: add capabilities detection script"
```

---

## Task 11: Update Installation Script

**Files:**
- Modify: `.gitlab-duo/install.sh`

- [ ] **Step 1: Add capability detection to install.sh**

Find the section after "Testing MCP server..." and before the final success message, add:

```bash
echo ""
echo "Detecting GitLab Duo capabilities..."
bash "${SCRIPT_DIR}/detect-capabilities.sh" --non-interactive
echo -e "${GREEN}✓${NC} Capabilities detected and saved"
```

- [ ] **Step 2: Test installation script**

```bash
bash .gitlab-duo/install.sh
```

Expected: Script runs successfully, capabilities.json created

- [ ] **Step 3: Commit updated install script**

```bash
git add install.sh
git commit -m "feat: add capability detection to installation"
```

---

## Task 12: Update Documentation

**Files:**
- Modify: `.gitlab-duo/README.md`
- Modify: `docs/README.gitlab-duo.md`

- [ ] **Step 1: Update .gitlab-duo/README.md**

Add after "What's Inside" section:

```markdown
## New in Phase 1

**Auto-Bootstrap:**
- `initialize-superpowers` prompt appears first in prompts list
- `superpowers://welcome` resource for quick start
- Enhanced bootstrap with capabilities summary

**Capability Detection:**
- `detect-capabilities.sh` script detects GitLab Duo features
- `superpowers://capabilities` resource shows what's available
- Automatic fallback to `executing-plans` when subagents not supported

**Tool Adapter:**
- MCP tools (`Read`, `Write`, `Edit`, `Bash`) for transparent mapping
- Skills work without modification
- Clear instructions for manual tool mapping
```

- [ ] **Step 2: Update docs/README.gitlab-duo.md**

Add new section after "How It Works":

```markdown
## Phase 1 Improvements (2026-04-03)

### Auto-Bootstrap

The integration now makes initialization obvious and easy:

1. **Initialize prompt** - `initialize-superpowers` appears first in prompts list
2. **Welcome resource** - Quick start guide at `superpowers://welcome`
3. **Enhanced bootstrap** - Includes capabilities summary and next steps

**Usage:**
```
duo
# Then: "What prompts are available?"
# Use: "Use initialize-superpowers prompt"
```

### Capability Detection

Automatically detects what GitLab Duo CLI supports:

1. **Detection script** - Run `bash .gitlab-duo/detect-capabilities.sh`
2. **Capabilities resource** - View at `superpowers://capabilities`
3. **Smart fallback** - Uses `executing-plans` when subagents not available

**Check capabilities:**
```
Read superpowers://capabilities
```

### Tool Adapter

Transparent tool name translation:

1. **MCP Tools** - `Read`, `Write`, `Edit`, `Bash` work directly
2. **Manual mapping** - Clear instructions for other tools
3. **No modification needed** - Skills work as-is

**Example:**
```
# Skill says: "Use Read tool"
# You can use: Read tool (MCP) or read_file (direct)
```
```

- [ ] **Step 3: Commit documentation updates**

```bash
git add .gitlab-duo/README.md docs/README.gitlab-duo.md
git commit -m "docs: document Phase 1 improvements"
```

---

## Task 13: End-to-End Testing

**Files:**
- Test all components together

- [ ] **Step 1: Clean test - remove capabilities.json**

```bash
rm -f .gitlab-duo/capabilities.json
```

- [ ] **Step 2: Run full test suite**

```bash
cd .gitlab-duo/mcp-server
npm test
```

Expected: All tests PASS

- [ ] **Step 3: Test detection script**

```bash
bash .gitlab-duo/detect-capabilities.sh --non-interactive
```

Expected: capabilities.json created successfully

- [ ] **Step 4: Test MCP server startup**

```bash
timeout 2 node .gitlab-duo/mcp-server/src/index.js 2>&1 | head -n 10
```

Expected output should include:
- "Starting Superpowers MCP Server..."
- "Loaded X skills from..."
- "Capabilities: Subagents: No, Tools: 7/8"
- "Superpowers MCP Server running on stdio"

- [ ] **Step 5: Verify all files created**

```bash
ls -la .gitlab-duo/mcp-server/src/
ls -la .gitlab-duo/mcp-server/src/resources/
ls -la .gitlab-duo/mcp-server/test/
```

Expected: All new files present

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "test: verify Phase 1 implementation complete"
```

---

## Task 14: Manual Testing with GitLab Duo CLI

**Files:**
- Real-world testing

- [ ] **Step 1: Start GitLab Duo CLI**

```bash
duo
```

- [ ] **Step 2: List prompts**

Ask GitLab Duo:
```
What prompts are available?
```

Expected: `initialize-superpowers` appears first with 🚀 emoji

- [ ] **Step 3: Use initialize prompt**

Ask GitLab Duo:
```
Use initialize-superpowers prompt
```

Expected: Receives bootstrap + welcome content

- [ ] **Step 4: Check capabilities**

Ask GitLab Duo:
```
Read superpowers://capabilities
```

Expected: Shows detected capabilities, subagent status, tool list

- [ ] **Step 5: Test MCP tool**

Ask GitLab Duo:
```
Use the Read tool to check package.json
```

Expected: GitLab Duo uses read_file (either via MCP tool or directly)

- [ ] **Step 6: Test a skill**

Ask GitLab Duo:
```
Use the brainstorming skill to help me design a simple feature
```

Expected: Skill loads and works normally

- [ ] **Step 7: Document results**

Create `.gitlab-duo/TESTING.md`:

```markdown
# Phase 1 Manual Testing Results

**Date:** 2026-04-03
**GitLab Duo Version:** [version]
**Tester:** [your name]

## Test Results

### Auto-Bootstrap
- [ ] initialize-superpowers prompt appears first
- [ ] Prompt includes bootstrap content
- [ ] Welcome resource accessible
- [ ] Capabilities summary shown

### Capability Detection
- [ ] detect-capabilities.sh runs successfully
- [ ] capabilities.json created
- [ ] Capabilities resource shows correct info
- [ ] Subagent status documented

### Tool Adapter
- [ ] MCP tools listed
- [ ] Read tool works
- [ ] Write tool works
- [ ] Edit tool works
- [ ] Bash tool works

### Skills Integration
- [ ] Skills load normally
- [ ] Tool mappings work
- [ ] No breaking changes

## Issues Found

[List any issues discovered]

## Notes

[Any additional observations]
```

- [ ] **Step 8: Commit testing documentation**

```bash
git add .gitlab-duo/TESTING.md
git commit -m "docs: add Phase 1 manual testing results"
```

---

## Completion Checklist

### Code Quality
- [ ] All tests pass (unit + integration)
- [ ] No console errors in MCP server
- [ ] Code follows DRY principles
- [ ] YAGNI applied (no unnecessary features)
- [ ] TDD followed (RED-GREEN-REFACTOR)

### Functionality
- [ ] Auto-bootstrap works (initialize prompt)
- [ ] Capability detection works (script + resource)
- [ ] Tool adapter works (MCP tools functional)
- [ ] No breaking changes to existing features
- [ ] Documentation updated

### Testing
- [ ] Unit tests: CapabilitiesDetector
- [ ] Unit tests: ToolAdapter
- [ ] Unit tests: Resources
- [ ] Integration tests: MCP server
- [ ] Manual tests: GitLab Duo CLI

### Documentation
- [ ] README.md updated
- [ ] docs/README.gitlab-duo.md updated
- [ ] TESTING.md created
- [ ] Code comments where needed

---

**Plan complete!** All tasks follow strict TDD (RED-GREEN-REFACTOR), YAGNI (only necessary code), and DRY (no duplication) principles.
