#!/usr/bin/env node

import { InstallationValidator } from './mcp-server/src/diagnostics/validator.js';
import { CapabilitiesDetector } from './mcp-server/src/capabilities-detector.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SKILLS_DIR = process.env.SUPERPOWERS_SKILLS_DIR || path.join(__dirname, '../skills');

async function main() {
  const detector = new CapabilitiesDetector();
  await detector.load();

  const validator = new InstallationValidator(detector, SKILLS_DIR);
  const report = await validator.generateReport();

  // Write report
  await fs.writeFile(path.join(__dirname, 'compatibility-report.md'), report);

  // Show summary
  const result = await validator.validate();
  console.log('✓', result.checks.skillsLoaded.message);
  console.log('✓', result.checks.toolsAvailable.message);
  if (result.warnings.length > 0) {
    console.log('⚠️ ', result.warnings.length, 'warning(s) - see compatibility-report.md');
  } else {
    console.log('✓ No warnings - installation fully compatible');
  }
}

main().catch(err => {
  console.error('Validation failed:', err.message);
  process.exit(1);
});
