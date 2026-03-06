export interface SchemaTemplate {
  action: string;
  description: string;
  targetTypes: string[];
  metadataSchema?: Record<string, unknown>;
}

export interface ComplianceTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  schemas: SchemaTemplate[];
}

export type TemplateName = 'soc2' | 'hipaa' | 'gdpr';

export interface InstallOptions {
  apiKey: string;
  baseUrl?: string;
  environment: 'test' | 'live';
  dryRun?: boolean;
}

export interface InstallResult {
  template: string;
  installed: number;
  skipped: number;
  errors: Array<{ action: string; message: string }>;
}
