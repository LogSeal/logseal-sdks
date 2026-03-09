import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchTemplateList, fetchTemplate } from '../api.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('fetchTemplateList', () => {
  it('fetches template summaries from the API', async () => {
    const payload = {
      data: [
        { id: 'soc2', name: 'SOC 2', description: 'SOC 2 schemas', version: '2.0.0', schema_count: 36, object: 'compliance_template' },
        { id: 'hipaa', name: 'HIPAA', description: 'HIPAA schemas', version: '2.0.0', schema_count: 17, object: 'compliance_template' },
        { id: 'gdpr', name: 'GDPR', description: 'GDPR schemas', version: '2.0.0', schema_count: 17, object: 'compliance_template' },
      ],
      object: 'list',
    };

    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(payload) });

    const result = await fetchTemplateList();

    expect(mockFetch).toHaveBeenCalledWith('https://api.logseal.io/v1/compliance-templates');
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('soc2');
    expect(result[0].schema_count).toBe(36);
    expect(result[1].id).toBe('hipaa');
    expect(result[2].id).toBe('gdpr');
  });

  it('uses a custom base URL', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: [] }) });

    await fetchTemplateList({ baseUrl: 'https://custom.api.io/v1' });

    expect(mockFetch).toHaveBeenCalledWith('https://custom.api.io/v1/compliance-templates');
  });

  it('strips trailing slashes from base URL', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: [] }) });

    await fetchTemplateList({ baseUrl: 'https://custom.api.io/v1/' });

    expect(mockFetch).toHaveBeenCalledWith('https://custom.api.io/v1/compliance-templates');
  });

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' });

    await expect(fetchTemplateList()).rejects.toThrow('Failed to fetch templates: 500 Internal Server Error');
  });
});

describe('fetchTemplate', () => {
  it('fetches a single template with schemas', async () => {
    const payload = {
      id: 'soc2',
      name: 'SOC 2',
      description: 'SOC 2 schemas',
      version: '2.0.0',
      schemas: [
        { action: 'user.login', description: 'User login', category: 'Authentication', criteria: ['CC6.1'], targetTypes: ['user'] },
      ],
      schema_count: 1,
      object: 'compliance_template',
    };

    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(payload) });

    const result = await fetchTemplate('soc2');

    expect(mockFetch).toHaveBeenCalledWith('https://api.logseal.io/v1/compliance-templates/soc2');
    expect(result.id).toBe('soc2');
    expect(result.schemas).toHaveLength(1);
    expect(result.schemas[0].category).toBe('Authentication');
    expect(result.schemas[0].criteria).toEqual(['CC6.1']);
  });

  it('throws on 404', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });

    await expect(fetchTemplate('pci-dss')).rejects.toThrow('Template "pci-dss" not found');
  });

  it('throws on server error', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable' });

    await expect(fetchTemplate('soc2')).rejects.toThrow('Failed to fetch template "soc2": 503 Service Unavailable');
  });

  it('encodes the template ID in the URL', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });

    await fetchTemplate('foo bar').catch(() => {});

    expect(mockFetch).toHaveBeenCalledWith('https://api.logseal.io/v1/compliance-templates/foo%20bar');
  });
});
