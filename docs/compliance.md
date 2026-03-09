# @logseal/compliance

Pre-built compliance event schemas for LogSeal. Install SOC 2, HIPAA, and GDPR audit trail schemas in seconds.

Templates are fetched from the public LogSeal API at runtime, so you always get the latest definitions.

## Installation

```bash
npm install @logseal/compliance
```

Or run directly with npx — no installation required:

```bash
npx @logseal/compliance list
```

## Quick Start

```bash
# List available templates
npx @logseal/compliance list

# Preview what will be installed
npx @logseal/compliance install soc2 --dry-run

# Install SOC 2 schemas to your test environment
npx @logseal/compliance install soc2 --api-key sk_test_...

# Install multiple templates to live
npx @logseal/compliance install soc2 hipaa gdpr --environment live --api-key sk_live_...
```

## CLI Reference

### `list`

List all available compliance templates with schema counts.

```bash
npx @logseal/compliance list
```

Output:

```
Available compliance templates:

  soc2     SOC 2    36 schemas — Event schemas for SOC 2 Type II compliance...
  hipaa    HIPAA    17 schemas — Event schemas for HIPAA compliance...
  gdpr     GDPR     17 schemas — Event schemas for GDPR compliance...
```

### `show <template>`

Display all schemas in a template, grouped by category.

```bash
npx @logseal/compliance show hipaa
```

### `install <template...>`

Install one or more compliance templates into your LogSeal project. Each template creates event schemas that define the structure of your audit trail.

```bash
npx @logseal/compliance install soc2
npx @logseal/compliance install soc2 hipaa gdpr
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--api-key <key>` | LogSeal API key (or set `LOGSEAL_API_KEY` env var) | — |
| `--base-url <url>` | API base URL | `https://api.logseal.io/v1` |
| `--environment <env>` | Target environment: `test` or `live` | `test` |
| `--dry-run` | Preview schemas without making changes | `false` |

## Available Templates

### SOC 2 (36 schemas)

Covers SOC 2 Type II Trust Service Criteria. Each schema maps to specific criteria (CC6, CC7, CC8).

| Category | Schemas | Criteria |
|----------|---------|----------|
| Authentication | `user.login`, `user.login.failed`, `user.logout`, `user.mfa.enabled`, `user.mfa.disabled` | CC6.1 |
| User Lifecycle | `user.created`, `user.updated`, `user.deactivated`, `user.reactivated`, `user.deleted` | CC6.2 |
| Access Control | `user.role.assigned`, `user.role.removed`, `permission.granted`, `permission.revoked`, `access_request.approved`, `access_request.denied` | CC6.1, CC6.3 |
| Credential Management | `api_key.created`, `api_key.revoked` | CC6.1 |
| Data Access | `data.accessed`, `data.exported` | CC6.1, CC6.7 |
| System Configuration | `settings.updated`, `webhook.created`, `webhook.deleted` | CC7.2, CC8.1 |
| Change Management | `deployment.created`, `deployment.rolled_back`, `change_request.approved` | CC8.1 |
| Vulnerability Management | `vulnerability.detected`, `vulnerability.remediated`, `security_scan.completed` | CC7.1 |
| Security Event Evaluation | `security_incident.detected`, `security_incident.evaluated`, `alert.triggered`, `alert.acknowledged` | CC7.2, CC7.3 |
| Incident Response | `incident.opened`, `incident.escalated`, `incident.resolved` | CC7.4, CC7.5 |

### HIPAA (17 schemas)

Covers HIPAA Security Rule requirements. Each schema maps to specific CFR sections (45 CFR 164).

| Category | Schemas | Criteria |
|----------|---------|----------|
| PHI Access | `phi.accessed`, `phi.created`, `phi.updated`, `phi.deleted`, `phi.exported`, `phi.shared` | 164.312(b), 164.312(c)(1) |
| Authentication | `user.login`, `user.login.failed`, `user.logout` | 164.312(d) |
| Emergency Access | `emergency.access.invoked`, `emergency.access.revoked` | 164.312(a)(2)(ii) |
| Consent | `consent.granted`, `consent.revoked` | 164.508 |
| Security | `encryption.key.rotated`, `security.incident.reported` | 164.312(a)(2)(iv), 164.308(a)(6)(ii) |
| Access Control | `user.role.assigned`, `user.role.removed` | 164.312(a)(1), 164.308(a)(4) |

### GDPR (17 schemas)

Covers GDPR articles for data protection. Each schema maps to specific articles.

| Category | Schemas | Criteria |
|----------|---------|----------|
| Consent Management | `consent.granted`, `consent.revoked`, `consent.updated` | Art. 7 |
| Data Subject Rights | `dsar.created`, `dsar.completed`, `dsar.denied` | Art. 12, 15, 17, 20 |
| Data Processing | `data.processing.started`, `data.processing.completed` | Art. 30 |
| Data Access | `data.accessed`, `data.exported`, `data.deleted` | Art. 5(1)(f), 17, 20, 32 |
| Breach Notification | `data.breach.detected`, `data.breach.reported` | Art. 33, 34 |
| Data Retention | `data.retention.policy.applied` | Art. 5(1)(e) |
| Cross-Border Transfers | `data.transfer.initiated` | Art. 44, 46, 49 |
| Authentication | `user.login`, `user.login.failed` | Art. 5(1)(f), 32 |

## Programmatic Usage

```typescript
import {
  installTemplate,
  fetchTemplateList,
  fetchTemplate,
} from '@logseal/compliance';

// List all available templates (metadata only)
const templates = await fetchTemplateList();
// => [{ id: 'soc2', name: 'SOC 2', schema_count: 36, ... }, ...]

// Fetch a single template with full schema definitions
const hipaa = await fetchTemplate('hipaa');
// => { id: 'hipaa', schemas: [...], ... }

// Install schemas into your LogSeal project
const result = await installTemplate('soc2', {
  apiKey: process.env.LOGSEAL_API_KEY!,
  environment: 'test',
});

console.log(`Installed ${result.installed} schemas`);
```

### Custom API URL

```typescript
const templates = await fetchTemplateList({
  baseUrl: 'https://my-api.example.com/v1',
});
```

## Public API

Templates are served from a public API — no authentication required to browse.

```
GET /v1/compliance-templates           # List all templates (metadata only)
GET /v1/compliance-templates/:id       # Get template with full schemas
```

Authentication is only required when installing schemas via `installTemplate()` or the `install` CLI command.

## Schema Structure

Each schema in a template defines:

| Field | Type | Description |
|-------|------|-------------|
| `action` | `string` | Event action identifier (e.g. `user.login`) |
| `description` | `string` | What the event represents |
| `category` | `string` | Grouping category (e.g. `Authentication`) |
| `criteria` | `string[]` | Compliance criteria references (e.g. `CC6.1`, `Art. 7`) |
| `targetTypes` | `string[]` | Entity types involved (e.g. `user`, `record`) |
| `metadataSchema` | `object` | JSON Schema for structured event metadata |
