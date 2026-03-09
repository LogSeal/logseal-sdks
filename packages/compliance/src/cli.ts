#!/usr/bin/env node

import { installTemplate } from './installer.js';
import { fetchTemplateList, fetchTemplate } from './api.js';
import type { TemplateName } from './types.js';

const HELP = `
@logseal/compliance — Install compliance event schemas

Usage:
  npx @logseal/compliance install <template...>  Install schema templates
  npx @logseal/compliance list                   List available templates
  npx @logseal/compliance show <template>        Show schemas in a template

Options:
  --api-key <key>        LogSeal API key (or set LOGSEAL_API_KEY)
  --base-url <url>       API base URL (default: https://api.logseal.io/v1)
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

async function commandList(flags: Record<string, string | boolean>) {
  const summaries = await fetchTemplateList({
    baseUrl: flags.baseUrl as string | undefined,
  });

  console.log('\nAvailable compliance templates:\n');
  for (const t of summaries) {
    console.log(`  ${t.id.padEnd(8)} ${t.name.padEnd(8)} ${t.schema_count} schemas — ${t.description}`);
  }
  console.log('');
}

async function commandShow(name: string, flags: Record<string, string | boolean>) {
  const template = await fetchTemplate(name, {
    baseUrl: flags.baseUrl as string | undefined,
  });

  console.log(`\n${template.name} (${template.id}) v${template.version} — ${template.schemas.length} schemas\n`);
  console.log(template.description);
  console.log('');

  // Group by category if available
  const byCategory = new Map<string, typeof template.schemas>();
  for (const schema of template.schemas) {
    const cat = schema.category ?? 'General';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(schema);
  }

  for (const [category, schemas] of byCategory) {
    console.log(`  ${category}`);
    for (const schema of schemas) {
      const targets = schema.targetTypes.join(', ');
      console.log(`    ${schema.action.padEnd(35)} [${targets}]`);
      if (schema.description) {
        console.log(`    ${''.padEnd(35)} ${schema.description}`);
      }
    }
    console.log('');
  }
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

  // Validate all template names exist on the API before starting
  const available = await fetchTemplateList({ baseUrl });
  const availableIds = new Set(available.map((t) => t.id));

  for (const name of templateNames) {
    if (!availableIds.has(name)) {
      console.error(`Unknown template "${name}". Available: ${[...availableIds].join(', ')}`);
      process.exit(1);
    }
  }

  if (dryRun) {
    console.log('\n[DRY RUN] No changes will be made.\n');
  }

  console.log(`Environment: ${environment}`);
  console.log('');

  for (const name of templateNames) {
    const template = await fetchTemplate(name, { baseUrl });
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
      await commandList(flags);
      break;
    case 'show':
      if (!args[1]) {
        console.error('Usage: npx @logseal/compliance show <template>');
        process.exit(1);
      }
      await commandShow(args[1], flags);
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
