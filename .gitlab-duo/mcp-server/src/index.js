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
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { CapabilitiesDetector } from './capabilities-detector.js';
import { createToolAdapter } from './tool-adapter.js';
import { generateWelcome } from './resources/welcome.js';
import { generateBootstrap } from './resources/bootstrap.js';
import { generateCapabilities } from './resources/capabilities.js';
import { InstallationValidator } from './diagnostics/validator.js';
import { HealthChecker } from './diagnostics/health-checker.js';
import { generateDiagnostics } from './resources/diagnostics.js';
import { listQuickStartPrompts, getQuickStartPrompt, getAllQuickStarts } from './prompts/quick-starts.js';

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
        tools: {},
      },
    }
  );

  // Load skills at startup
  const skills = await loadSkills();
  console.error(`Loaded ${skills.length} skills from ${SKILLS_DIR}`);

  // Load capabilities
  const capabilitiesDetector = new CapabilitiesDetector();
  await capabilitiesDetector.load();
  console.error(`Capabilities: ${capabilitiesDetector.getSummary()}`);

  // Initialize tool adapter
  const toolAdapter = createToolAdapter();

  // Initialize diagnostics
  const validator = new InstallationValidator(capabilitiesDetector, SKILLS_DIR);
  const healthChecker = new HealthChecker(validator, capabilitiesDetector, skills);

  // List available resources (skills)
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
      // Diagnostics fourth
      {
        uri: 'superpowers://diagnostics',
        name: 'Superpowers Diagnostics',
        description: 'System health check and troubleshooting',
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

  // Read a specific resource
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

  // List available prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
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

    return { prompts };
  });

  // Get a specific prompt
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

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: toolAdapter.listTools() };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return toolAdapter.callTool(name, args);
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
