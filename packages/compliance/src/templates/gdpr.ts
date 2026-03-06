import type { ComplianceTemplate } from '../types.js';

export const gdpr: ComplianceTemplate = {
  id: 'gdpr',
  name: 'GDPR',
  description: 'Event schemas for GDPR compliance — covers consent management, data subject rights, breach notification, and data processing.',
  version: '1.0.0',
  schemas: [
    // Consent Management
    {
      action: 'consent.granted',
      description: 'Data subject consent recorded',
      targetTypes: ['data_subject', 'consent'],
      metadataSchema: {
        type: 'object',
        properties: {
          purpose: { type: 'string', enum: ['marketing', 'analytics', 'profiling', 'third_party_sharing', 'essential'] },
          legal_basis: { type: 'string', enum: ['consent', 'contract', 'legal_obligation', 'vital_interest', 'public_task', 'legitimate_interest'] },
          scope: { type: 'string' },
          expires_at: { type: 'string', format: 'date-time' },
          version: { type: 'string' },
        },
        required: ['purpose', 'legal_basis'],
      },
    },
    {
      action: 'consent.revoked',
      description: 'Data subject withdrew consent',
      targetTypes: ['data_subject', 'consent'],
      metadataSchema: {
        type: 'object',
        properties: {
          purpose: { type: 'string' },
          reason: { type: 'string' },
          effective_date: { type: 'string', format: 'date' },
        },
        required: ['purpose'],
      },
    },
    {
      action: 'consent.updated',
      description: 'Data subject consent preferences changed',
      targetTypes: ['data_subject', 'consent'],
      metadataSchema: {
        type: 'object',
        properties: {
          purposes_added: { type: 'array', items: { type: 'string' } },
          purposes_removed: { type: 'array', items: { type: 'string' } },
          version: { type: 'string' },
        },
      },
    },

    // Data Subject Rights (DSAR)
    {
      action: 'dsar.created',
      description: 'Data Subject Access Request submitted',
      targetTypes: ['data_subject', 'dsar'],
      metadataSchema: {
        type: 'object',
        properties: {
          request_type: { type: 'string', enum: ['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'] },
          channel: { type: 'string', enum: ['email', 'web_form', 'postal', 'phone', 'in_person'] },
          identity_verified: { type: 'boolean' },
          deadline: { type: 'string', format: 'date' },
        },
        required: ['request_type', 'identity_verified'],
      },
    },
    {
      action: 'dsar.completed',
      description: 'Data Subject Access Request fulfilled',
      targetTypes: ['data_subject', 'dsar'],
      metadataSchema: {
        type: 'object',
        properties: {
          request_type: { type: 'string' },
          response_format: { type: 'string', enum: ['electronic', 'postal', 'in_person'] },
          records_affected: { type: 'integer' },
          completed_within_deadline: { type: 'boolean' },
        },
        required: ['request_type', 'completed_within_deadline'],
      },
    },
    {
      action: 'dsar.denied',
      description: 'Data Subject Access Request denied',
      targetTypes: ['data_subject', 'dsar'],
      metadataSchema: {
        type: 'object',
        properties: {
          request_type: { type: 'string' },
          reason: { type: 'string', enum: ['identity_not_verified', 'excessive_requests', 'legal_exemption', 'third_party_rights'] },
          appeal_instructions_provided: { type: 'boolean' },
        },
        required: ['request_type', 'reason'],
      },
    },

    // Data Processing
    {
      action: 'data.processing.started',
      description: 'Personal data processing activity initiated',
      targetTypes: ['data_subject', 'processing_activity'],
      metadataSchema: {
        type: 'object',
        properties: {
          purpose: { type: 'string' },
          legal_basis: { type: 'string', enum: ['consent', 'contract', 'legal_obligation', 'vital_interest', 'public_task', 'legitimate_interest'] },
          data_categories: { type: 'array', items: { type: 'string' } },
          processor: { type: 'string' },
          cross_border: { type: 'boolean' },
        },
        required: ['purpose', 'legal_basis'],
      },
    },
    {
      action: 'data.processing.completed',
      description: 'Personal data processing activity finished',
      targetTypes: ['data_subject', 'processing_activity'],
      metadataSchema: {
        type: 'object',
        properties: {
          purpose: { type: 'string' },
          records_processed: { type: 'integer' },
          outcome: { type: 'string' },
        },
      },
    },

    // Data Access & Handling
    {
      action: 'data.accessed',
      description: 'Personal data accessed by authorized user',
      targetTypes: ['data_subject', 'resource'],
      metadataSchema: {
        type: 'object',
        properties: {
          data_category: { type: 'string', enum: ['identity', 'contact', 'financial', 'health', 'behavioral', 'location'] },
          purpose: { type: 'string' },
          access_level: { type: 'string', enum: ['read', 'write', 'admin'] },
        },
        required: ['data_category', 'purpose'],
      },
    },
    {
      action: 'data.exported',
      description: 'Personal data exported (data portability)',
      targetTypes: ['data_subject', 'export'],
      metadataSchema: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['json', 'csv', 'xml'] },
          record_count: { type: 'integer' },
          destination: { type: 'string' },
          encrypted: { type: 'boolean' },
        },
        required: ['format'],
      },
    },
    {
      action: 'data.deleted',
      description: 'Personal data erased (right to erasure)',
      targetTypes: ['data_subject'],
      metadataSchema: {
        type: 'object',
        properties: {
          reason: { type: 'string', enum: ['dsar_request', 'consent_withdrawn', 'retention_expired', 'no_longer_necessary'] },
          data_categories: { type: 'array', items: { type: 'string' } },
          records_deleted: { type: 'integer' },
          backup_deletion_scheduled: { type: 'boolean' },
        },
        required: ['reason'],
      },
    },

    // Breach Notification
    {
      action: 'data.breach.detected',
      description: 'Personal data breach detected',
      targetTypes: ['incident'],
      metadataSchema: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          category: { type: 'string', enum: ['confidentiality', 'integrity', 'availability'] },
          data_categories_affected: { type: 'array', items: { type: 'string' } },
          estimated_subjects_affected: { type: 'integer' },
          detected_at: { type: 'string', format: 'date-time' },
        },
        required: ['severity', 'category'],
      },
    },
    {
      action: 'data.breach.reported',
      description: 'Data breach reported to supervisory authority',
      targetTypes: ['incident', 'authority'],
      metadataSchema: {
        type: 'object',
        properties: {
          authority_name: { type: 'string' },
          reported_within_72h: { type: 'boolean' },
          subjects_notified: { type: 'boolean' },
          reference_number: { type: 'string' },
        },
        required: ['reported_within_72h'],
      },
    },

    // Data Retention
    {
      action: 'data.retention.policy.applied',
      description: 'Data retention policy executed — records purged or archived',
      targetTypes: ['retention_policy'],
      metadataSchema: {
        type: 'object',
        properties: {
          policy_name: { type: 'string' },
          action_taken: { type: 'string', enum: ['deleted', 'anonymized', 'archived'] },
          records_affected: { type: 'integer' },
          data_categories: { type: 'array', items: { type: 'string' } },
          retention_period_days: { type: 'integer' },
        },
        required: ['policy_name', 'action_taken', 'records_affected'],
      },
    },

    // Third-Party Data Transfers
    {
      action: 'data.transfer.initiated',
      description: 'Personal data transfer to third party or cross-border initiated',
      targetTypes: ['data_subject', 'processor'],
      metadataSchema: {
        type: 'object',
        properties: {
          destination_country: { type: 'string' },
          transfer_mechanism: { type: 'string', enum: ['adequacy_decision', 'standard_contractual_clauses', 'bcr', 'derogation', 'consent'] },
          processor_name: { type: 'string' },
          encrypted: { type: 'boolean' },
        },
        required: ['transfer_mechanism'],
      },
    },

    // Authentication
    {
      action: 'user.login',
      description: 'User authenticated to system processing personal data',
      targetTypes: ['user'],
      metadataSchema: {
        type: 'object',
        properties: {
          method: { type: 'string', enum: ['password', 'sso', 'mfa'] },
          ip_address: { type: 'string' },
        },
      },
    },
    {
      action: 'user.login.failed',
      description: 'Failed authentication attempt',
      targetTypes: ['user'],
      metadataSchema: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
          ip_address: { type: 'string' },
        },
      },
    },
  ],
};
