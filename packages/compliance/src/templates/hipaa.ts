import type { ComplianceTemplate } from '../types.js';

export const hipaa: ComplianceTemplate = {
  id: 'hipaa',
  name: 'HIPAA',
  description: 'Event schemas for HIPAA compliance — covers PHI access, authentication, consent management, and emergency access.',
  version: '1.0.0',
  schemas: [
    // PHI Access
    {
      action: 'phi.accessed',
      description: 'Protected Health Information was accessed',
      targetTypes: ['patient', 'record'],
      metadataSchema: {
        type: 'object',
        properties: {
          record_type: { type: 'string', enum: ['medical_record', 'lab_result', 'prescription', 'imaging', 'billing'] },
          access_reason: { type: 'string', enum: ['treatment', 'payment', 'operations', 'emergency', 'research'] },
          patient_id: { type: 'string' },
          fields_accessed: { type: 'array', items: { type: 'string' } },
        },
        required: ['record_type', 'access_reason'],
      },
    },
    {
      action: 'phi.created',
      description: 'New Protected Health Information record created',
      targetTypes: ['patient', 'record'],
      metadataSchema: {
        type: 'object',
        properties: {
          record_type: { type: 'string' },
          patient_id: { type: 'string' },
        },
        required: ['record_type'],
      },
    },
    {
      action: 'phi.updated',
      description: 'Protected Health Information record modified',
      targetTypes: ['patient', 'record'],
      metadataSchema: {
        type: 'object',
        properties: {
          record_type: { type: 'string' },
          patient_id: { type: 'string' },
          fields_changed: { type: 'array', items: { type: 'string' } },
          reason: { type: 'string' },
        },
        required: ['record_type'],
      },
    },
    {
      action: 'phi.deleted',
      description: 'Protected Health Information record deleted',
      targetTypes: ['patient', 'record'],
      metadataSchema: {
        type: 'object',
        properties: {
          record_type: { type: 'string' },
          patient_id: { type: 'string' },
          reason: { type: 'string' },
          retention_met: { type: 'boolean' },
        },
        required: ['record_type', 'reason'],
      },
    },
    {
      action: 'phi.exported',
      description: 'Protected Health Information exported or downloaded',
      targetTypes: ['patient', 'export'],
      metadataSchema: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['pdf', 'hl7', 'fhir', 'csv', 'ccd'] },
          record_count: { type: 'integer' },
          destination: { type: 'string' },
          encrypted: { type: 'boolean' },
        },
        required: ['format', 'encrypted'],
      },
    },
    {
      action: 'phi.shared',
      description: 'Protected Health Information shared with another party',
      targetTypes: ['patient', 'recipient'],
      metadataSchema: {
        type: 'object',
        properties: {
          recipient_type: { type: 'string', enum: ['provider', 'payer', 'patient', 'research', 'legal'] },
          recipient_name: { type: 'string' },
          purpose: { type: 'string' },
          authorization_id: { type: 'string' },
          encrypted: { type: 'boolean' },
        },
        required: ['recipient_type', 'purpose'],
      },
    },

    // Authentication (HIPAA-specific)
    {
      action: 'user.login',
      description: 'User authenticated to system with PHI access',
      targetTypes: ['user'],
      metadataSchema: {
        type: 'object',
        properties: {
          method: { type: 'string', enum: ['password', 'sso', 'mfa', 'smart_card', 'biometric'] },
          workstation_id: { type: 'string' },
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
          workstation_id: { type: 'string' },
          ip_address: { type: 'string' },
          consecutive_failures: { type: 'integer' },
        },
      },
    },
    {
      action: 'user.logout',
      description: 'User session ended',
      targetTypes: ['user'],
      metadataSchema: {
        type: 'object',
        properties: {
          reason: { type: 'string', enum: ['manual', 'timeout', 'forced'] },
          session_duration_seconds: { type: 'integer' },
        },
      },
    },

    // Emergency Access
    {
      action: 'emergency.access.invoked',
      description: 'Break-the-glass emergency access to PHI',
      targetTypes: ['patient', 'record'],
      metadataSchema: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
          patient_id: { type: 'string' },
          approved_by: { type: 'string' },
          duration_minutes: { type: 'integer' },
        },
        required: ['reason'],
      },
    },
    {
      action: 'emergency.access.revoked',
      description: 'Emergency access period ended or revoked',
      targetTypes: ['patient', 'record'],
      metadataSchema: {
        type: 'object',
        properties: {
          reason: { type: 'string', enum: ['expired', 'manual_revoke', 'reviewed'] },
          reviewed_by: { type: 'string' },
        },
      },
    },

    // Consent
    {
      action: 'consent.granted',
      description: 'Patient authorization or consent recorded',
      targetTypes: ['patient', 'consent'],
      metadataSchema: {
        type: 'object',
        properties: {
          consent_type: { type: 'string', enum: ['treatment', 'research', 'disclosure', 'marketing'] },
          scope: { type: 'string' },
          expires_at: { type: 'string', format: 'date-time' },
        },
        required: ['consent_type'],
      },
    },
    {
      action: 'consent.revoked',
      description: 'Patient authorization or consent withdrawn',
      targetTypes: ['patient', 'consent'],
      metadataSchema: {
        type: 'object',
        properties: {
          consent_type: { type: 'string' },
          reason: { type: 'string' },
          effective_date: { type: 'string', format: 'date' },
        },
        required: ['consent_type'],
      },
    },

    // Security
    {
      action: 'encryption.key.rotated',
      description: 'Encryption key rotated for PHI data at rest or in transit',
      targetTypes: ['encryption_key'],
      metadataSchema: {
        type: 'object',
        properties: {
          key_type: { type: 'string', enum: ['data_at_rest', 'data_in_transit', 'backup'] },
          algorithm: { type: 'string' },
          previous_key_id: { type: 'string' },
          new_key_id: { type: 'string' },
        },
        required: ['key_type'],
      },
    },
    {
      action: 'security.incident.reported',
      description: 'Security incident or potential breach reported',
      targetTypes: ['incident'],
      metadataSchema: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          category: { type: 'string', enum: ['unauthorized_access', 'data_loss', 'malware', 'physical', 'other'] },
          affected_records: { type: 'integer' },
          phi_involved: { type: 'boolean' },
        },
        required: ['severity', 'phi_involved'],
      },
    },

    // Access Control
    {
      action: 'user.role.assigned',
      description: 'User granted role with PHI access level',
      targetTypes: ['user', 'role'],
      metadataSchema: {
        type: 'object',
        properties: {
          role_name: { type: 'string' },
          phi_access_level: { type: 'string', enum: ['none', 'read', 'write', 'admin'] },
        },
        required: ['role_name', 'phi_access_level'],
      },
    },
    {
      action: 'user.role.removed',
      description: 'User role with PHI access removed',
      targetTypes: ['user', 'role'],
      metadataSchema: {
        type: 'object',
        properties: {
          role_name: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['role_name'],
      },
    },
  ],
};
