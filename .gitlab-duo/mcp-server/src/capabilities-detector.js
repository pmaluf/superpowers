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
