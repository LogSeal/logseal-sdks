import { LogSeal } from '@logseal/node';
import { fetchTemplate } from './api.js';
import type { InstallOptions, InstallResult, TemplateName } from './types.js';

export async function installTemplate(
  name: TemplateName,
  options: InstallOptions
): Promise<InstallResult> {
  const template = await fetchTemplate(name, { baseUrl: options.baseUrl });

  if (options.dryRun) {
    return {
      template: template.id,
      installed: template.schemas.length,
      skipped: 0,
      errors: [],
    };
  }

  const client = new LogSeal({
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
  });

  let installed = 0;
  let skipped = 0;
  const errors: InstallResult['errors'] = [];

  for (const schema of template.schemas) {
    try {
      await client.schemas.create({
        action: schema.action,
        description: schema.description,
        targetTypes: schema.targetTypes,
        metadataSchema: schema.metadataSchema,
      });
      installed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      // If schema already exists, count as skipped
      if (message.includes('already exists') || message.includes('conflict')) {
        skipped++;
      } else {
        errors.push({ action: schema.action, message });
      }
    }
  }

  return { template: template.id, installed, skipped, errors };
}
