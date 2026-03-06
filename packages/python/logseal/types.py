"""Type definitions for the LogSeal SDK."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Generic, List, Literal, Optional, TypeVar

T = TypeVar("T")


@dataclass
class ActorInput:
    """Actor performing the audited action."""

    id: str
    type: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


@dataclass
class Actor:
    """Actor as returned by the API."""

    id: str
    type: str
    name: Optional[str] = None
    email: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


@dataclass
class TargetInput:
    """Target of the audited action."""

    type: str
    id: str
    name: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


@dataclass
class Target:
    """Target as returned by the API."""

    type: str
    id: str
    name: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


@dataclass
class EventContext:
    """Request context for an event."""

    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None


@dataclass
class EmitEventInput:
    """Input for emitting an audit event."""

    action: str
    organization_id: str
    actor: ActorInput
    targets: Optional[List[TargetInput]] = None
    metadata: Optional[dict[str, Any]] = None
    context: Optional[EventContext] = None
    occurred_at: Optional[str | datetime] = None
    idempotency_key: Optional[str] = None


@dataclass
class EmitEventResponse:
    """Response from emitting a single event."""

    id: str
    action: str
    occurred_at: str
    received_at: str
    organization_id: str
    object: str = "event"


@dataclass
class BatchEmitResponse:
    """Response from a batch emit."""

    accepted: int
    rejected: int
    object: str = "batch"


@dataclass
class AuditEvent:
    """A full audit event record."""

    id: str
    action: str
    occurred_at: str
    received_at: str
    actor: Actor
    targets: List[Target]
    metadata: dict[str, Any]
    context: dict[str, Any]
    event_hash: str
    object: str = "event"


@dataclass
class PaginatedList(Generic[T]):
    """A paginated list of results."""

    data: List[T]
    has_more: bool
    next_cursor: Optional[str] = None
    object: str = "list"


@dataclass
class ListEventsParams:
    """Parameters for listing events."""

    organization_id: str
    action: Optional[str] = None
    action_prefix: Optional[str] = None
    actor_id: Optional[str] = None
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    after: Optional[str | datetime] = None
    before: Optional[str | datetime] = None
    search: Optional[str] = None
    limit: Optional[int] = None
    cursor: Optional[str] = None


@dataclass
class Organization:
    """An organization record."""

    id: str
    external_id: str
    environment: str
    created_at: str
    name: Optional[str] = None
    object: str = "organization"


@dataclass
class CreateOrganizationInput:
    """Input for creating an organization."""

    external_id: str
    name: Optional[str] = None


@dataclass
class EventSchema:
    """An event schema definition."""

    id: str
    action: str
    version: int
    created_at: str
    target_types: List[str] = field(default_factory=list)
    description: Optional[str] = None
    metadata_schema: Optional[dict[str, Any]] = None
    object: str = "event_schema"


@dataclass
class CreateSchemaInput:
    """Input for creating an event schema."""

    action: str
    description: Optional[str] = None
    target_types: Optional[List[str]] = None
    metadata_schema: Optional[dict[str, Any]] = None


@dataclass
class UpdateSchemaInput:
    """Input for updating an event schema."""

    description: Optional[str] = None
    target_types: Optional[List[str]] = None
    metadata_schema: Optional[dict[str, Any]] = None


@dataclass
class ViewerToken:
    """A viewer token for the embeddable log viewer."""

    token: str
    expires_at: str
    organization_id: str
    object: str = "viewer_token"


@dataclass
class CreateViewerTokenInput:
    """Input for creating a viewer token."""

    organization_id: str
    expires_in: Optional[int] = None


@dataclass
class Webhook:
    """A webhook configuration."""

    id: str
    url: str
    events: List[str]
    enabled: bool
    created_at: str
    organization_id: Optional[str] = None
    object: str = "webhook"


@dataclass
class WebhookWithSecret(Webhook):
    """A webhook including its signing secret (returned on creation only)."""

    secret: str = ""


@dataclass
class CreateWebhookInput:
    """Input for creating a webhook."""

    url: str
    organization_id: Optional[str] = None
    events: Optional[List[str]] = None
    enabled: Optional[bool] = None


@dataclass
class UpdateWebhookInput:
    """Input for updating a webhook."""

    url: Optional[str] = None
    events: Optional[List[str]] = None
    enabled: Optional[bool] = None


@dataclass
class ExportFilters:
    """Filters for an export job."""

    after: Optional[str | datetime] = None
    before: Optional[str | datetime] = None
    action: Optional[str] = None
    actor_id: Optional[str] = None


@dataclass
class Export:
    """An export job record."""

    id: str
    status: Literal["pending", "processing", "completed", "failed"]
    format: Literal["csv", "json"]
    created_at: str
    download_url: Optional[str] = None
    event_count: Optional[int] = None
    expires_at: Optional[str] = None
    object: str = "export"


@dataclass
class CreateExportInput:
    """Input for creating an export job."""

    organization_id: str
    format: Literal["csv", "json"]
    filters: Optional[ExportFilters] = None


@dataclass
class VerifyParams:
    """Parameters for verifying hash-chain integrity."""

    organization_id: str
    after: Optional[str | datetime] = None
    before: Optional[str | datetime] = None


@dataclass
class VerifyResponse:
    """Response from a hash-chain verification."""

    status: Literal["valid", "broken", "tampered"]
    events_checked: int
    verified_at: str
    chain_start: Optional[str] = None
    chain_end: Optional[str] = None
    broken_at: Optional[str] = None
    tampered_event: Optional[str] = None
    expected_hash: Optional[str] = None
    actual_hash: Optional[str] = None


@dataclass
class VerifyRangeParams:
    """Parameters for verifying a sequence range."""

    organization_id: str
    from_sequence: int
    to_sequence: int


@dataclass
class VerifyRangeResponse:
    """Response from a range verification."""

    status: Literal["valid", "broken", "unverifiable"]
    events_checked: int
    verified_at: str
    verification_method: Optional[str] = None
    path_length: Optional[int] = None
    range: Optional[dict[str, int]] = None
    broken_at: Optional[str] = None
    broken_at_sequence: Optional[int] = None
    expected_hash: Optional[str] = None
    actual_hash: Optional[str] = None
    skip_hash: Optional[str] = None
    reason: Optional[str] = None


@dataclass
class MerkleProofResponse:
    """Merkle proof for an individual event."""

    event_id: str
    event_hash: str
    leaf_index: int
    merkle_tree_id: str
    root_hash: str
    proof: List[dict[str, str]]
    anchored: bool
    ct_timestamp: Optional[str] = None
    ct_log_id: Optional[str] = None
    object: str = "merkle_proof"
