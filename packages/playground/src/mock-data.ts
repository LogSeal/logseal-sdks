import type { AuditEvent } from '@logseal/viewer-core';

export const MOCK_ACTIONS = [
  'user.login',
  'user.logout',
  'user.created',
  'user.updated',
  'user.deleted',
  'user.invited',
  'user.role_changed',
  'document.created',
  'document.updated',
  'document.deleted',
  'document.shared',
  'document.downloaded',
  'api.key.created',
  'api.key.revoked',
  'api.post.v1.viewer-token.refresh',
  'billing.subscription.updated',
  'billing.invoice.paid',
  'team.member.added',
  'team.member.removed',
  'settings.security.updated',
  'settings.sso.configured',
  'export.started',
  'export.completed',
];

const ACTORS = [
  { id: 'user_1', type: 'user', name: 'Jane Doe', email: 'jane@acme.com' },
  { id: 'user_2', type: 'user', name: 'John Smith', email: 'john@acme.com' },
  { id: 'user_3', type: 'user', name: 'Alexandra Konstantinopolis-Weatherington', email: 'alexandra.konstantinopolis-weatherington@longdomain.example.com' },
  { id: 'api_key_abc123def456', type: 'api_key', name: 'Production API Key' },
  { id: 'user_5', type: 'user', name: 'Carlos Rivera', email: 'carlos@acme.com' },
  { id: 'system', type: 'system', name: 'System' },
  { id: 'user_7', type: 'user', name: 'Emily Chen' },
  { id: 'service_account_analytics_pipeline_v2', type: 'service_account', name: 'Analytics Pipeline' },
];

const TARGETS = [
  { type: 'user', id: 'user_42', name: 'Bob Wilson' },
  { type: 'document', id: 'doc_1', name: 'Q4 Financial Report' },
  { type: 'document', id: 'doc_2', name: 'Engineering Onboarding Guide - Updated March 2026 Edition' },
  { type: 'api_key', id: 'key_prod_abc123def456ghi789', name: 'Production Key' },
  { type: 'team', id: 'team_engineering', name: 'Engineering' },
  { type: 'subscription', id: 'sub_enterprise_annual_2026', name: 'Enterprise Annual' },
  { type: 'invoice', id: 'inv_20260301_acme_corp_ent', name: 'March 2026 Invoice' },
  { type: 'export', id: 'exp_full_audit_log_20260304', name: 'Full Audit Export' },
  { type: 'sso_config', id: 'sso_okta_acme', name: 'Okta SSO' },
  { type: 'role', id: 'role_admin', name: 'Administrator' },
];

const METADATA_VARIANTS = [
  { reason: 'Password expired' },
  { ip: '192.168.1.100', browser: 'Chrome 122' },
  { old_role: 'member', new_role: 'admin', approved_by: 'user_1' },
  { file_size: 2048576, mime_type: 'application/pdf', pages: 42 },
  { changes: { email: { from: 'old@acme.com', to: 'new@acme.com' }, name: { from: 'Old Name', to: 'New Name' } } },
  { plan: 'enterprise', seats: 500, annual_cost: '$49,500', features: ['sso', 'audit_log', 'api_access', 'custom_roles', 'data_retention_90d'] },
  {},
  { method: 'oauth2', provider: 'google', mfa_used: true, session_id: 'sess_abc123def456ghi789jkl012mno345' },
  { export_format: 'csv', row_count: 15420, date_range: { from: '2025-01-01', to: '2026-03-04' }, filters_applied: { actions: ['user.login', 'user.logout'], actors: ['user_1', 'user_2'] } },
];

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/123.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15',
  undefined,
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateEvents(count: number): AuditEvent[] {
  const events: AuditEvent[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const occurredAt = new Date(now - i * 180_000 - Math.random() * 60_000);
    const actor = randomItem(ACTORS);
    const target = randomItem(TARGETS);
    const action = randomItem(MOCK_ACTIONS);
    const metadata = randomItem(METADATA_VARIANTS);
    const ua = randomItem(USER_AGENTS);

    events.push({
      id: `evt_${String(i + 1).padStart(4, '0')}`,
      action,
      occurred_at: occurredAt.toISOString(),
      received_at: new Date(occurredAt.getTime() + 500).toISOString(),
      actor: { ...actor },
      targets: [{ ...target }],
      metadata: { ...metadata },
      context: {
        ip_address: `${10 + (i % 5)}.${20 + (i % 10)}.${i % 256}.${(i * 7) % 256}`,
        ...(ua ? { user_agent: ua } : {}),
        ...(i % 4 === 0 ? { request_id: `req_${Math.random().toString(36).slice(2, 14)}` } : {}),
      },
      event_hash: `sha256:${Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')}`,
      object: 'event',
    });
  }

  return events;
}

export const MOCK_EVENTS = generateEvents(120);
