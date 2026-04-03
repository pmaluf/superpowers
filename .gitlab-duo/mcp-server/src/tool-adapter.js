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
