import { describe, it, expect } from 'vitest';
import { listTemplates, getTemplate, soc2, hipaa, gdpr } from '../templates/index.js';

describe('templates', () => {
  it('lists all available templates', () => {
    const templates = listTemplates();
    expect(templates).toHaveLength(3);
    expect(templates.map((t) => t.id).sort()).toEqual(['gdpr', 'hipaa', 'soc2']);
  });

  it('gets a template by name', () => {
    expect(getTemplate('soc2')).toBe(soc2);
    expect(getTemplate('hipaa')).toBe(hipaa);
    expect(getTemplate('gdpr')).toBe(gdpr);
  });

  it('returns undefined for unknown template', () => {
    expect(getTemplate('pci-dss')).toBeUndefined();
  });

  describe('SOC 2', () => {
    it('has required authentication schemas', () => {
      const actions = soc2.schemas.map((s) => s.action);
      expect(actions).toContain('user.login');
      expect(actions).toContain('user.login.failed');
      expect(actions).toContain('user.logout');
      expect(actions).toContain('user.mfa.enabled');
    });

    it('has access control schemas', () => {
      const actions = soc2.schemas.map((s) => s.action);
      expect(actions).toContain('user.role.assigned');
      expect(actions).toContain('permission.granted');
      expect(actions).toContain('api_key.created');
    });

    it('all schemas have action and description', () => {
      for (const schema of soc2.schemas) {
        expect(schema.action).toBeTruthy();
        expect(schema.description).toBeTruthy();
        expect(schema.targetTypes.length).toBeGreaterThan(0);
      }
    });

    it('has no duplicate actions', () => {
      const actions = soc2.schemas.map((s) => s.action);
      expect(new Set(actions).size).toBe(actions.length);
    });
  });

  describe('HIPAA', () => {
    it('has PHI access schemas', () => {
      const actions = hipaa.schemas.map((s) => s.action);
      expect(actions).toContain('phi.accessed');
      expect(actions).toContain('phi.created');
      expect(actions).toContain('phi.exported');
      expect(actions).toContain('phi.shared');
    });

    it('has emergency access schemas', () => {
      const actions = hipaa.schemas.map((s) => s.action);
      expect(actions).toContain('emergency.access.invoked');
      expect(actions).toContain('emergency.access.revoked');
    });

    it('all schemas have action and description', () => {
      for (const schema of hipaa.schemas) {
        expect(schema.action).toBeTruthy();
        expect(schema.description).toBeTruthy();
        expect(schema.targetTypes.length).toBeGreaterThan(0);
      }
    });

    it('has no duplicate actions', () => {
      const actions = hipaa.schemas.map((s) => s.action);
      expect(new Set(actions).size).toBe(actions.length);
    });
  });

  describe('GDPR', () => {
    it('has consent management schemas', () => {
      const actions = gdpr.schemas.map((s) => s.action);
      expect(actions).toContain('consent.granted');
      expect(actions).toContain('consent.revoked');
      expect(actions).toContain('consent.updated');
    });

    it('has DSAR schemas', () => {
      const actions = gdpr.schemas.map((s) => s.action);
      expect(actions).toContain('dsar.created');
      expect(actions).toContain('dsar.completed');
      expect(actions).toContain('dsar.denied');
    });

    it('has breach notification schemas', () => {
      const actions = gdpr.schemas.map((s) => s.action);
      expect(actions).toContain('data.breach.detected');
      expect(actions).toContain('data.breach.reported');
    });

    it('all schemas have action and description', () => {
      for (const schema of gdpr.schemas) {
        expect(schema.action).toBeTruthy();
        expect(schema.description).toBeTruthy();
        expect(schema.targetTypes.length).toBeGreaterThan(0);
      }
    });

    it('has no duplicate actions', () => {
      const actions = gdpr.schemas.map((s) => s.action);
      expect(new Set(actions).size).toBe(actions.length);
    });
  });
});
