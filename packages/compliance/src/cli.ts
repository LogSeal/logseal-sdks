#!/usr/bin/env node

import { installTemplate } from './installer.js';
import { listTemplates, getTemplate } from './templates/index.js';
import type { TemplateName } from './types.js';

const HELP = `
@logseal/compliance — Install compliance event schemas

Usage:
  npx @logseal/compliance install <template...>  Install schema templates
  npx @logseal/compliance list                   List available templates
  npx @logseal/compliance show <template>        Show schemas in a template

Options:
  --api-key <key>        LogSeal API key (or set LOGSEAL_API_KEY)
  --base-url <url>       API base URL (default: https://api.logseal.io)
  --environment <env>    Target environment: test or live (default: test)
  --dry-run              Preview what will be installed without making changes
  --help                 Show this help message

Examples:
  npx @logseal/compliance install soc2
  npx @logseal/compliance install soc2 hipaa gdpr --environment live
  npx @logseal/compliance install gdpr --dry-run
  npx @logseal/compliance list
  npx @logseal/compliance show hipaa
`.trim();

function parseArgs(argv: string[]) {
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      flags.help = true;
    } else if (arg === '--dry-run') {
      flags.dryRun = true;
    } else if (arg === '--api-key' && argv[i + 1]) {
      flags.apiKey = argv[++i];
    } else if (arg === '--base-url' && argv[i + 1]) {
      flags.baseUrl = argv[++i];
    } else if (arg === '--environment' && argv[i + 1]) {
      flags.environment = argv[++i];
    } else if (!arg.startsWith('-')) {
      args.push(arg);
    } else {
      console.error(`Unknown flag: ${arg}`);
      process.exit(1);
    }
  }

  return { args, flags };
}

function getApiKey(flags: Record<string, string | boolean>): string {
  const key = (flags.apiKey as string) || process.env.LOGSEAL_API_KEY;
  if (!key) {
    console.error('Error: API key required. Use --api-key <key> or set LOGSEAL_API_KEY environment variable.');
    process.exit(1);
  }
  return key;
}

async function commandList() {
  const templates = listTemplates();
  console.log('\nAvailable compliance templates:\n');
  for (const t of templates) {
    console.log(`  ${t.id.padEnd(8)} ${t.name.padEnd(8)} ${t.schemas.length} schemas — ${t.description}`);
  }
  console.log('');
}

async function commandShow(name: string) {
  const template = getTemplate(name);
  if (!template) {
    const available = listTemplates().map((t) => t.id).join(', ');
    console.error(`Unknown template "${name}". Available: ${available}`);
    process.exit(1);
  }

  console.log(`\n${template.name} (${template.id}) — ${template.schemas.length} schemas\n`);
  console.log(template.description);
  console.log('');

  for (const schema of template.schemas) {
    const targets = schema.targetTypes.join(', ');
    console.log(`  ${schema.action.padEnd(35)} [${targets}]`);
    if (schema.description) {
      console.log(`  ${''.padEnd(35)} ${schema.description}`);
    }
  }
  console.log('');
}

async function commandInstall(
  templateNames: string[],
  flags: Record<string, string | boolean>
) {
  const apiKey = getApiKey(flags);
  const environment = (flags.environment as string) || 'test';
  const dryRun = !!flags.dryRun;
  const baseUrl = flags.baseUrl as string | undefined;

  if (environment !== 'test' && environment !== 'live') {
    console.error('Error: --environment must be "test" or "live"');
    process.exit(1);
  }

  // Validate all template names before starting
  for (const name of templateNames) {
    if (!getTemplate(name)) {
      const available = listTemplates().map((t) => t.id).join(', ');
      console.error(`Unknown template "${name}". Available: ${available}`);
      process.exit(1);
    }
  }

  if (dryRun) {
    console.log('\n[DRY RUN] No changes will be made.\n');
  }

  console.log(`Environment: ${environment}`);
  console.log('');

  for (const name of templateNames) {
    const template = getTemplate(name)!;
    console.log(`Installing ${template.name} (${template.schemas.length} schemas)...`);

    const result = await installTemplate(name as TemplateName, {
      apiKey,
      baseUrl,
      environment,
      dryRun,
    });

    if (dryRun) {
      console.log(`  Would install ${result.installed} schemas\n`);

      for (const schema of template.schemas) {
        console.log(`    + ${schema.action}`);
      }
      console.log('');
    } else {
      console.log(`  Installed: ${result.installed}`);
      if (result.skipped > 0) {
        console.log(`  Skipped (already exist): ${result.skipped}`);
      }
      if (result.errors.length > 0) {
        console.log(`  Errors: ${result.errors.length}`);
        for (const err of result.errors) {
          console.error(`    - ${err.action}: ${err.message}`);
        }
      }
      console.log('');
    }
  }

  console.log('Done.');
}

async function main() {
  const { args, flags } = parseArgs(process.argv.slice(2));

  if (flags.help || args.length === 0) {
    console.log(HELP);
    process.exit(0);
  }

  const command = args[0];

  switch (command) {
    case 'list':
      await commandList();
      break;
    case 'show':
      if (!args[1]) {
        console.error('Usage: npx @logseal/compliance show <template>');
        process.exit(1);
      }
      await commandShow(args[1]);
      break;
    case 'install':
      if (args.length < 2) {
        console.error('Usage: npx @logseal/compliance install <template...>');
        process.exit(1);
      }
      await commandInstall(args.slice(1), flags);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
