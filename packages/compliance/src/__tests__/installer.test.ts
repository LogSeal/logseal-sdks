import { describe, it, expect, vi, beforeEach } from 'vitest';
import { installTemplate } from '../installer.js';

const mockFetchTemplate = vi.fn();
vi.mock('../api.js', () => ({
  fetchTemplate: (...args: unknown[]) => mockFetchTemplate(...args),
}));

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

const sampleTemplate = {
  id: 'soc2',
  name: 'SOC 2',
  description: 'SOC 2 schemas',
  version: '2.0.0',
  schemas: [
    { action: 'user.login', description: 'User login', category: 'Authentication', criteria: ['CC6.1'], targetTypes: ['user'] },
    { action: 'user.logout', description: 'User logout', category: 'Authentication', criteria: ['CC6.1'], targetTypes: ['user'] },
  ],
};

beforeEach(() => {
  mockFetchTemplate.mockReset();
  mockFetchTemplate.mockResolvedValue(sampleTemplate);
});

describe('installTemplate', () => {
  it('returns dry-run result without creating schemas', async () => {
    const result = await installTemplate('soc2', {
      apiKey: 'test_key',
      environment: 'test',
      dryRun: true,
    });

    expect(result.template).toBe('soc2');
    expect(result.installed).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('fetches template from the API', async () => {
    await installTemplate('soc2', {
      apiKey: 'test_key',
      environment: 'test',
      dryRun: true,
    });

    expect(mockFetchTemplate).toHaveBeenCalledWith('soc2', { baseUrl: undefined });
  });

  it('passes baseUrl to fetchTemplate', async () => {
    await installTemplate('soc2', {
      apiKey: 'test_key',
      baseUrl: 'https://custom.api.io/v1',
      environment: 'test',
      dryRun: true,
    });

    expect(mockFetchTemplate).toHaveBeenCalledWith('soc2', { baseUrl: 'https://custom.api.io/v1' });
  });

  it('throws when template not found on API', async () => {
    mockFetchTemplate.mockRejectedValue(new Error('Template "pci-dss" not found'));

    await expect(
      installTemplate('pci-dss', {
        apiKey: 'test_key',
        environment: 'test',
      })
    ).rejects.toThrow('Template "pci-dss" not found');
  });

  it('installs schemas via the SDK', async () => {
    const result = await installTemplate('soc2', {
      apiKey: 'test_key',
      environment: 'test',
    });

    expect(result.template).toBe('soc2');
    expect(result.installed).toBe(2);
    expect(result.errors).toHaveLength(0);
  });
});
