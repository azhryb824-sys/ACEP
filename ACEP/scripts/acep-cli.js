#!/usr/bin/env node

const commands = {
  analyze: 'Analyze a project description',
  projects: 'List all projects',
  'show-boq': 'Show BOQ for a project',
  'show-cost': 'Show cost breakdown',
  'show-schedule': 'Show schedule',
  'show-risks': 'Show risk analysis',
  version: 'Show version info',
  help: 'Show help'
};

const args = process.argv.slice(2);
const command = args[0];

function showHelp() {
  console.log('\n  ACEP - Architectural Construction Estimation Platform');
  console.log('  Usage: acep <command> [options]\n');
  console.log('  Commands:\n');
  Object.entries(commands).forEach(([cmd, desc]) => {
    console.log(`    ${cmd.padEnd(16)} ${desc}`);
  });
  console.log('\n  Examples:\n');
  console.log('    acep analyze "Villa with 3 bedrooms"');
  console.log('    acep projects');
  console.log('    acep show-boq --project-id <id>');
  console.log('    acep show-cost --project-id <id>');
  console.log('    acep show-schedule --project-id <id>');
  console.log('    acep show-risks --project-id <id>');
  console.log('    acep version');
  console.log('    acep help\n');
}

function showVersion() {
  const pkg = require('../package.json');
  console.log(`ACEP v${pkg.version}`);
}

async function main() {
  switch (command) {
    case undefined:
    case 'help':
      showHelp();
      break;
    case 'version':
      showVersion();
      break;
    case 'analyze':
      console.log('Analyzing project description...');
      break;
    case 'projects':
      console.log('Fetching projects...');
      break;
    case 'show-boq':
      console.log('Showing BOQ...');
      break;
    case 'show-cost':
      console.log('Showing cost breakdown...');
      break;
    case 'show-schedule':
      console.log('Showing schedule...');
      break;
    case 'show-risks':
      console.log('Showing risk analysis...');
      break;
    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
