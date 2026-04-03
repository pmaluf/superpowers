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
