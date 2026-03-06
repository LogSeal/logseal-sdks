import { soc2 } from './soc2.js';
import { hipaa } from './hipaa.js';
import { gdpr } from './gdpr.js';
import type { ComplianceTemplate, TemplateName } from '../types.js';

export const templates: Record<TemplateName, ComplianceTemplate> = {
  soc2,
  hipaa,
  gdpr,
};

export function getTemplate(name: string): ComplianceTemplate | undefined {
  return templates[name as TemplateName];
}

export function listTemplates(): ComplianceTemplate[] {
  return Object.values(templates);
}

export { soc2, hipaa, gdpr };
