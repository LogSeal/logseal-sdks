import type { ComplianceTemplate } from './types.js';

const DEFAULT_BASE_URL = 'https://api.logseal.io/v1';

export interface FetchTemplatesOptions {
  baseUrl?: string;
}

export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  version: string;
  schema_count: number;
  object: string;
}

interface ListResponse {
  data: TemplateSummary[];
  object: string;
}

function templatesUrl(baseUrl?: string): string {
  const base = (baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  return `${base}/compliance-templates`;
}

export async function fetchTemplateList(
  options: FetchTemplatesOptions = {}
): Promise<TemplateSummary[]> {
  const url = templatesUrl(options.baseUrl);
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch templates: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as ListResponse;
  return body.data;
}

export async function fetchTemplate(
  templateId: string,
  options: FetchTemplatesOptions = {}
): Promise<ComplianceTemplate> {
  const url = `${templatesUrl(options.baseUrl)}/${encodeURIComponent(templateId)}`;
  const res = await fetch(url);

  if (res.status === 404) {
    throw new Error(`Template "${templateId}" not found`);
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch template "${templateId}": ${res.status} ${res.statusText}`);
  }

  const body = await res.json();
  return body as ComplianceTemplate;
}
