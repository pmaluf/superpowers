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
