import { describe, it, expect } from 'vitest';
import { 
  getAllQuickStarts, 
  getQuickStartPrompt, 
  listQuickStartPrompts,
  QUICK_START_PROMPTS 
} from '../src/prompts/quick-starts.js';

describe('QuickStarts', () => {
  describe('getAllQuickStarts', () => {
    it('should return all quick start prompts', () => {
      const prompts = getAllQuickStarts();
      
      expect(prompts.length).toBe(6);
    });

    it('should include development prompts', () => {
      const prompts = getAllQuickStarts();
      const names = prompts.map(p => p.name);
      
      expect(names).toContain('quick-start-tdd');
      expect(names).toContain('quick-start-debug');
      expect(names).toContain('quick-start-review');
    });

    it('should include GitLab prompts', () => {
      const prompts = getAllQuickStarts();
      const names = prompts.map(p => p.name);
      
      expect(names).toContain('quick-start-issue');
      expect(names).toContain('quick-start-mr');
      expect(names).toContain('quick-start-pipeline');
    });
  });

  describe('getQuickStartPrompt', () => {
    it('should generate TDD prompt content', () => {
      const content = getQuickStartPrompt('quick-start-tdd', { feature: 'login' });
      
      expect(content).toContain('login');
      expect(content).toContain('Test-Driven Development');
      expect(content).toContain('RED');
      expect(content).toContain('GREEN');
      expect(content).toContain('REFACTOR');
    });

    it('should generate debug prompt content', () => {
      const content = getQuickStartPrompt('quick-start-debug', { issue: 'timeout error' });
      
      expect(content).toContain('timeout error');
      expect(content).toContain('systematic-debugging');
      expect(content).toContain('4-phase');
    });

    it('should generate review prompt content', () => {
      const content = getQuickStartPrompt('quick-start-review', { changes: 'auth module' });
      
      expect(content).toContain('auth module');
      expect(content).toContain('requesting-code-review');
    });

    it('should generate issue prompt with URL', () => {
      const content = getQuickStartPrompt('quick-start-issue', { 
        issue_url: 'https://gitlab.com/group/project/-/issues/42' 
      });
      
      expect(content).toContain('https://gitlab.com/group/project/-/issues/42');
      expect(content).toContain('get_work_item');
    });

    it('should generate issue prompt without URL', () => {
      const content = getQuickStartPrompt('quick-start-issue', {});
      
      expect(content).toContain('What issue are you working on');
      expect(content).not.toContain('get_work_item');
    });

    it('should generate MR prompt with URL', () => {
      const content = getQuickStartPrompt('quick-start-mr', { 
        mr_url: 'https://gitlab.com/group/project/-/merge_requests/10' 
      });
      
      expect(content).toContain('https://gitlab.com/group/project/-/merge_requests/10');
      expect(content).toContain('get_merge_request');
    });

    it('should generate pipeline prompt with URL', () => {
      const content = getQuickStartPrompt('quick-start-pipeline', { 
        pipeline_url: 'https://gitlab.com/group/project/-/pipelines/100' 
      });
      
      expect(content).toContain('https://gitlab.com/group/project/-/pipelines/100');
      expect(content).toContain('get_pipeline_failing_jobs');
    });

    it('should throw error for unknown prompt', () => {
      expect(() => {
        getQuickStartPrompt('unknown-prompt', {});
      }).toThrow('Quick start not found');
    });
  });

  describe('listQuickStartPrompts', () => {
    it('should return prompt metadata', () => {
      const prompts = listQuickStartPrompts();
      
      expect(prompts.length).toBe(6);
      expect(prompts[0]).toHaveProperty('name');
      expect(prompts[0]).toHaveProperty('description');
      expect(prompts[0]).toHaveProperty('arguments');
    });

    it('should include emojis in descriptions', () => {
      const prompts = listQuickStartPrompts();
      
      expect(prompts.some(p => p.description.includes('🧪'))).toBe(true);
      expect(prompts.some(p => p.description.includes('🐛'))).toBe(true);
      expect(prompts.some(p => p.description.includes('📝'))).toBe(true);
    });

    it('should include argument definitions', () => {
      const prompts = listQuickStartPrompts();
      const tddPrompt = prompts.find(p => p.name === 'quick-start-tdd');
      
      expect(tddPrompt.arguments.length).toBeGreaterThan(0);
      expect(tddPrompt.arguments[0].name).toBe('feature');
    });
  });

  describe('QUICK_START_PROMPTS (DRY)', () => {
    it('should centralize all prompts', () => {
      expect(QUICK_START_PROMPTS.development.length).toBe(3);
      expect(QUICK_START_PROMPTS.gitlab.length).toBe(3);
    });

    it('should match getAllQuickStarts output', () => {
      const all = getAllQuickStarts();
      const expected = QUICK_START_PROMPTS.development.length + QUICK_START_PROMPTS.gitlab.length;
      
      expect(all.length).toBe(expected);
    });

    it('should have template functions', () => {
      QUICK_START_PROMPTS.development.forEach(prompt => {
        expect(typeof prompt.template).toBe('function');
      });
      
      QUICK_START_PROMPTS.gitlab.forEach(prompt => {
        expect(typeof prompt.template).toBe('function');
      });
    });
  });
});
