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
