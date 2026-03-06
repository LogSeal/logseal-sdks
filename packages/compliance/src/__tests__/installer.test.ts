import { describe, it, expect, vi } from 'vitest';
import { installTemplate } from '../installer.js';

vi.mock('@logseal/node', () => {
  const schemasCreated: string[] = [];

  return {
    LogSeal: vi.fn().mockImplementation(() => ({
      schemas: {
        create: vi.fn().mockImplementation(async (input: { action: string }) => {
          schemasCreated.push(input.action);
          return { id: `schema_${input.action}`, action: input.action, object: 'event_schema' };
        }),
      },
    })),
    _schemasCreated: schemasCreated,
  };
});

describe('installTemplate', () => {
  it('returns dry-run result without creating schemas', async () => {
    const result = await installTemplate('soc2', {
      apiKey: 'test_key',
      environment: 'test',
      dryRun: true,
    });

    expect(result.template).toBe('soc2');
    expect(result.installed).toBeGreaterThan(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('throws on unknown template', async () => {
    await expect(
      installTemplate('pci-dss' as any, {
        apiKey: 'test_key',
        environment: 'test',
      })
    ).rejects.toThrow('Unknown template');
  });

  it('installs schemas via the SDK', async () => {
    const result = await installTemplate('soc2', {
      apiKey: 'test_key',
      environment: 'test',
    });

    expect(result.template).toBe('soc2');
    expect(result.installed).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });
});
