#!/usr/bin/env node

/**
 * Superpowers MCP Server for GitLab Duo CLI
 * 
 * Exposes Superpowers skills as MCP resources and prompts.
 * Supports stdio transport for GitLab Duo CLI integration.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
  ReadResourceRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine skills directory
const SKILLS_DIR = process.env.SUPERPOWERS_SKILLS_DIR || 
  path.resolve(__dirname, '../../../skills');

/**
 * Parse YAML frontmatter from skill markdown files
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content };

  const frontmatterStr = match[1];
  const body = match[2];
  const frontmatter = {};

  for (const line of frontmatterStr.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let value = line.slice(colonIdx + 1).trim();
      // Remove quotes if present
      value = value.replace(/^["']|["']$/g, '');
      frontmatter[key] = value;
    }
  }

  return { frontmatter, content: body };
}

/**
 * Load all skills from the skills directory
 */
async function loadSkills() {
  const skills = [];
  
  try {
    const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const skillPath = path.join(SKILLS_DIR, entry.name, 'SKILL.md');
      
      try {
        const content = await fs.readFile(skillPath, 'utf-8');
        const { frontmatter, content: body } = parseFrontmatter(content);
        
        if (frontmatter.name) {
          skills.push({
            name: frontmatter.name,
            description: frontmatter.description || '',
            path: skillPath,
            content: body,
            fullContent: content,
          });
        }
      } catch (err) {
        // Skip skills that can't be read
        console.error(`Warning: Could not load skill from ${skillPath}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`Error reading skills directory ${SKILLS_DIR}:`, err.message);
  }
  
  return skills;
}

/**
 * Create and configure the MCP server
 */
async function createServer() {
  const server = new Server(
    {
      name: 'superpowers',
      version: '1.0.0',
    },
    {
      capabilities: {
        resources: {},
        prompts: {},
      },
    }
  );

  // Load skills at startup
  const skills = await loadSkills();
  console.error(`Loaded ${skills.length} skills from ${SKILLS_DIR}`);

  // List available resources (skills)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = skills.map(skill => ({
      uri: `superpowers://skill/${skill.name}`,
      name: `Skill: ${skill.name}`,
      description: skill.description,
      mimeType: 'text/markdown',
    }));

    // Add special bootstrap resource
    resources.unshift({
      uri: 'superpowers://bootstrap',
      name: 'Superpowers Bootstrap',
      description: 'Initial context and instructions for using Superpowers skills',
      mimeType: 'text/markdown',
    });

    return { resources };
  });

  // Read a specific resource
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    // Handle bootstrap resource
    if (uri === 'superpowers://bootstrap') {
      const usingSuperpowersSkill = skills.find(s => s.name === 'using-superpowers');
      if (!usingSuperpowersSkill) {
        throw new Error('using-superpowers skill not found');
      }

      const toolMapping = `
## Tool Mapping for GitLab Duo CLI

When skills reference Claude Code tools, use GitLab Duo equivalents:

| Skill Reference | GitLab Duo Equivalent |
|----------------|----------------------|
| \`Skill\` tool | MCP Resource read (this system) |
| \`Read\` (file reading) | \`read_file\` |
| \`Write\` (file creation) | \`create_file_with_contents\` |
| \`Edit\` (file editing) | \`edit_file\` |
| \`Bash\` (run commands) | \`run_command\` |
| \`Grep\` (search file content) | \`grep\` |
| \`Glob\` (search files by name) | \`find_files\` |
| \`TodoWrite\` (task tracking) | Native GitLab Duo task tracking |
| \`Task\` tool (dispatch subagent) | Check if GitLab Duo supports subagents |
| \`WebSearch\` | \`gitlab_documentation_search\` or web tools |
| \`WebFetch\` | Web fetch tools if available |

**Note:** Some skills may reference tools not available in GitLab Duo. Adapt the workflow using available tools.
`;

      const bootstrapContent = `<EXTREMELY_IMPORTANT>
You have superpowers.

**Below is the full content of your 'superpowers:using-superpowers' skill - your introduction to using skills. For all other skills, use MCP resources:**

${usingSuperpowersSkill.content}

${toolMapping}
</EXTREMELY_IMPORTANT>`;

      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: bootstrapContent,
          },
        ],
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
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text: skill.fullContent,
        },
      ],
    };
  });

  // List available prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    const prompts = skills.map(skill => ({
      name: skill.name,
      description: skill.description,
      arguments: [],
    }));

    return { prompts };
  });

  // Get a specific prompt
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const promptName = request.params.name;
    const skill = skills.find(s => s.name === promptName);
    
    if (!skill) {
      throw new Error(`Prompt not found: ${promptName}`);
    }

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please use the ${skill.name} skill to guide this work.\n\nSkill content:\n\n${skill.fullContent}`,
          },
        },
      ],
    };
  });

  return server;
}

/**
 * Main entry point
 */
async function main() {
  console.error('Starting Superpowers MCP Server...');
  console.error(`Skills directory: ${SKILLS_DIR}`);
  
  const server = await createServer();
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  console.error('Superpowers MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
