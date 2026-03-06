import type { ComplianceTemplate } from '../types.js';

export const soc2: ComplianceTemplate = {
  id: 'soc2',
  name: 'SOC 2',
  description: 'Event schemas for SOC 2 Type II compliance — covers access control, authentication, data handling, and system changes.',
  version: '1.0.0',
  schemas: [
    // Authentication
    {
      action: 'user.login',
      description: 'User successfully authenticated',
      targetTypes: ['user'],
      metadataSchema: {
        type: 'object',
        properties: {
          method: { type: 'string', enum: ['password', 'sso', 'mfa', 'api_key'] },
          ip_address: { type: 'string' },
          user_agent: { type: 'string' },
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
          reason: { type: 'string', enum: ['invalid_credentials', 'account_locked', 'mfa_failed', 'expired_session'] },
          ip_address: { type: 'string' },
          user_agent: { type: 'string' },
        },
      },
    },
    {
      action: 'user.logout',
      description: 'User session ended',
      targetTypes: ['user'],
    },
    {
      action: 'user.mfa.enabled',
      description: 'Multi-factor authentication enabled for a user',
      targetTypes: ['user'],
      metadataSchema: {
        type: 'object',
        properties: {
          method: { type: 'string', enum: ['totp', 'sms', 'webauthn', 'email'] },
        },
      },
    },
    {
      action: 'user.mfa.disabled',
      description: 'Multi-factor authentication disabled for a user',
      targetTypes: ['user'],
      metadataSchema: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
          disabled_by: { type: 'string', enum: ['self', 'admin'] },
        },
      },
    },

    // User Lifecycle
    {
      action: 'user.created',
      description: 'New user account created',
      targetTypes: ['user'],
      metadataSchema: {
        type: 'object',
        properties: {
          role: { type: 'string' },
          invitation_id: { type: 'string' },
        },
      },
    },
    {
      action: 'user.updated',
      description: 'User account details modified',
      targetTypes: ['user'],
      metadataSchema: {
        type: 'object',
        properties: {
          fields_changed: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      action: 'user.deleted',
      description: 'User account removed',
      targetTypes: ['user'],
      metadataSchema: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
          soft_delete: { type: 'boolean' },
        },
      },
    },

    // Access Control
    {
      action: 'user.role.assigned',
      description: 'Role assigned to a user',
      targetTypes: ['user', 'role'],
      metadataSchema: {
        type: 'object',
        properties: {
          role_name: { type: 'string' },
          previous_role: { type: 'string' },
        },
      },
    },
    {
      action: 'user.role.removed',
      description: 'Role removed from a user',
      targetTypes: ['user', 'role'],
      metadataSchema: {
        type: 'object',
        properties: {
          role_name: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },
    {
      action: 'permission.granted',
      description: 'Permission granted to a user or role',
      targetTypes: ['user', 'permission'],
      metadataSchema: {
        type: 'object',
        properties: {
          permission_name: { type: 'string' },
          resource_type: { type: 'string' },
          resource_id: { type: 'string' },
        },
      },
    },
    {
      action: 'permission.revoked',
      description: 'Permission revoked from a user or role',
      targetTypes: ['user', 'permission'],
      metadataSchema: {
        type: 'object',
        properties: {
          permission_name: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },

    // API Keys
    {
      action: 'api_key.created',
      description: 'New API key generated',
      targetTypes: ['api_key'],
      metadataSchema: {
        type: 'object',
        properties: {
          key_prefix: { type: 'string' },
          scopes: { type: 'array', items: { type: 'string' } },
          expires_at: { type: 'string', format: 'date-time' },
        },
      },
    },
    {
      action: 'api_key.revoked',
      description: 'API key revoked',
      targetTypes: ['api_key'],
      metadataSchema: {
        type: 'object',
        properties: {
          key_prefix: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },

    // Data Access
    {
      action: 'data.exported',
      description: 'Data exported from the system',
      targetTypes: ['export'],
      metadataSchema: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['csv', 'json', 'pdf'] },
          record_count: { type: 'integer' },
          data_type: { type: 'string' },
        },
      },
    },
    {
      action: 'data.accessed',
      description: 'Sensitive data accessed',
      targetTypes: ['resource'],
      metadataSchema: {
        type: 'object',
        properties: {
          resource_type: { type: 'string' },
          access_level: { type: 'string', enum: ['read', 'write', 'admin'] },
        },
      },
    },

    // System Configuration
    {
      action: 'settings.updated',
      description: 'System or organization settings modified',
      targetTypes: ['settings'],
      metadataSchema: {
        type: 'object',
        properties: {
          setting_name: { type: 'string' },
          previous_value: {},
          new_value: {},
        },
      },
    },
    {
      action: 'webhook.created',
      description: 'Webhook endpoint configured',
      targetTypes: ['webhook'],
      metadataSchema: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          events: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      action: 'webhook.deleted',
      description: 'Webhook endpoint removed',
      targetTypes: ['webhook'],
    },
  ],
};
