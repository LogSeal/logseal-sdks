"""LogSeal Python SDK client."""

from __future__ import annotations

import asyncio
import random
import time
from datetime import datetime
from typing import Any, AsyncIterator, Optional

import httpx

from logseal.errors import LogSealError
from logseal.types import (
    AuditEvent,
    CreateExportInput,
    CreateOrganizationInput,
    CreateSchemaInput,
    CreateViewerTokenInput,
    CreateWebhookInput,
    EmitEventInput,
    EmitEventResponse,
    EventSchema,
    Export,
    ListEventsParams,
    MerkleProofResponse,
    Organization,
    PaginatedList,
    UpdateSchemaInput,
    UpdateWebhookInput,
    VerifyParams,
    VerifyRangeParams,
    VerifyRangeResponse,
    VerifyResponse,
    ViewerToken,
    Webhook,
    WebhookWithSecret,
)

__version__ = "0.1.0"

_SENTINEL = object()


def _to_iso(value: str | datetime | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _strip_none(d: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in d.items() if v is not None}


class LogSeal:
    """Client for the LogSeal audit-logging API.

    Args:
        api_key: Your LogSeal API key (``sk_test_...`` or ``sk_live_...``).
        base_url: Override the API base URL.
        batch_size: Number of events to buffer before auto-flushing. Default ``100``.
        flush_interval: Seconds between automatic flushes. Default ``5.0``.
        max_retries: Maximum retry attempts on rate-limit or server errors. Default ``3``.
        timeout: HTTP request timeout in seconds. Default ``30``.

    Example::

        from logseal import LogSeal

        client = LogSeal(api_key="sk_test_...")
        await client.emit(EmitEventInput(
            action="document.published",
            organization_id="org_acme",
            actor=ActorInput(id="user_123", name="Jane Smith"),
        ))
        await client.shutdown()
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = "https://api.logseal.dev",
        batch_size: int = 100,
        flush_interval: float = 5.0,
        max_retries: int = 3,
        timeout: float = 30,
    ) -> None:
        if not api_key:
            raise ValueError("api_key is required")

        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._batch_size = batch_size
        self._flush_interval = flush_interval
        self._max_retries = max_retries
        self._timeout = timeout

        self._queue: list[EmitEventInput] = []
        self._flush_task: asyncio.Task[None] | None = None

        self._http = httpx.AsyncClient(
            base_url=self._base_url,
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
                "User-Agent": f"logseal-python/{__version__}",
            },
            timeout=self._timeout,
        )

        self.events = _EventsAPI(self)
        self.organizations = _OrganizationsAPI(self)
        self.schemas = _SchemasAPI(self)
        self.viewer_tokens = _ViewerTokensAPI(self)
        self.webhooks = _WebhooksAPI(self)
        self.exports = _ExportsAPI(self)

    # ------------------------------------------------------------------
    # Context manager
    # ------------------------------------------------------------------

    async def __aenter__(self) -> LogSeal:
        self._start_flush_loop()
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self.shutdown()

    # ------------------------------------------------------------------
    # Emit
    # ------------------------------------------------------------------

    async def emit(self, event: EmitEventInput) -> dict[str, str]:
        """Queue an event for batched delivery.

        Returns ``{"status": "queued"}`` immediately. Events are sent in bulk
        when the queue reaches *batch_size* or after *flush_interval* seconds.
        """
        self._validate_event(event)
        self._queue.append(event)

        if len(self._queue) >= self._batch_size:
            await self.flush()

        return {"status": "queued"}

    async def emit_sync(self, event: EmitEventInput) -> EmitEventResponse:
        """Emit a single event and wait for server confirmation."""
        self._validate_event(event)
        data = await self._request("POST", "/v1/events", json=self._format_event(event))
        return EmitEventResponse(**data)

    # ------------------------------------------------------------------
    # Flush / Shutdown
    # ------------------------------------------------------------------

    async def flush(self) -> dict[str, int]:
        """Flush all queued events to the API immediately.

        Returns ``{"sent": N}`` where *N* is the number of events accepted.
        """
        if not self._queue:
            return {"sent": 0}

        events = self._queue[:]
        self._queue.clear()

        try:
            body = {"events": [self._format_event(e) for e in events]}
            data = await self._request("POST", "/v1/events/batch", json=body)
            return {"sent": data.get("accepted", 0)}
        except Exception:
            self._queue = events + self._queue
            raise

    async def shutdown(self) -> None:
        """Flush remaining events and close the HTTP client.

        Call this before your process exits to avoid losing events.
        """
        if self._flush_task and not self._flush_task.done():
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass
            self._flush_task = None

        await self.flush()
        await self._http.aclose()

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _start_flush_loop(self) -> None:
        if self._flush_task is None or self._flush_task.done():
            self._flush_task = asyncio.create_task(self._flush_loop())

    async def _flush_loop(self) -> None:
        while True:
            await asyncio.sleep(self._flush_interval)
            try:
                await self.flush()
            except Exception:
                pass  # errors are surfaced on the next explicit flush

    @staticmethod
    def _validate_event(event: EmitEventInput) -> None:
        if not event.action:
            raise LogSealError(
                type="validation_error",
                code="missing_required_field",
                message="The 'action' field is required.",
                param="action",
            )
        if not event.actor or not event.actor.id:
            raise LogSealError(
                type="validation_error",
                code="missing_required_field",
                message="The 'actor.id' field is required.",
                param="actor.id",
            )
        if not event.organization_id:
            raise LogSealError(
                type="validation_error",
                code="missing_required_field",
                message="The 'organization_id' field is required.",
                param="organization_id",
            )

    @staticmethod
    def _format_event(event: EmitEventInput) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "action": event.action,
            "organization_id": event.organization_id,
            "actor": _strip_none(
                {
                    "id": event.actor.id,
                    "type": event.actor.type,
                    "name": event.actor.name,
                    "email": event.actor.email,
                    "metadata": event.actor.metadata,
                }
            ),
        }
        if event.targets:
            payload["targets"] = [
                _strip_none(
                    {"type": t.type, "id": t.id, "name": t.name, "metadata": t.metadata}
                )
                for t in event.targets
            ]
        if event.metadata:
            payload["metadata"] = event.metadata
        if event.context:
            payload["context"] = _strip_none(
                {
                    "ip_address": event.context.ip_address,
                    "user_agent": event.context.user_agent,
                    "request_id": event.context.request_id,
                }
            )
        if event.occurred_at:
            payload["occurred_at"] = _to_iso(event.occurred_at)
        if event.idempotency_key:
            payload["idempotency_key"] = event.idempotency_key
        return payload

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: Any = None,
        params: dict[str, str] | None = None,
        _retry: int = 0,
    ) -> dict[str, Any]:
        response = await self._http.request(method, path, json=json, params=params)

        if response.status_code == 429 or response.status_code >= 500:
            if _retry < self._max_retries:
                delay = min(1.0 * (2**_retry), 30.0)
                jitter = delay * 0.2 * random.random()
                await asyncio.sleep(delay + jitter)
                return await self._request(method, path, json=json, params=params, _retry=_retry + 1)

        data = response.json()

        if not response.is_success:
            err = data.get("error", {})
            raise LogSealError(
                type=err.get("type", "internal_error"),
                code=err.get("code", "unknown"),
                message=err.get("message", "Unknown error"),
                param=err.get("param"),
                doc_url=err.get("doc_url"),
                status_code=response.status_code,
            )

        return data


# ======================================================================
# Sub-APIs
# ======================================================================


class _EventsAPI:
    def __init__(self, client: LogSeal) -> None:
        self._client = client

    async def list(self, params: ListEventsParams) -> PaginatedList[AuditEvent]:
        """List audit events with filtering and pagination."""
        query = _strip_none(
            {
                "organization_id": params.organization_id,
                "action": params.action,
                "action_prefix": params.action_prefix,
                "actor_id": params.actor_id,
                "target_type": params.target_type,
                "target_id": params.target_id,
                "after": _to_iso(params.after),
                "before": _to_iso(params.before),
                "search": params.search,
                "limit": str(params.limit) if params.limit else None,
                "cursor": params.cursor,
            }
        )
        data = await self._client._request("GET", "/v1/events", params=query)
        return PaginatedList(
            data=[AuditEvent(**e) for e in data["data"]],
            has_more=data["has_more"],
            next_cursor=data.get("next_cursor"),
        )

    async def get(self, event_id: str) -> AuditEvent:
        """Retrieve a single event by ID."""
        data = await self._client._request("GET", f"/v1/events/{event_id}")
        return AuditEvent(**data)

    async def verify(self, params: VerifyParams) -> VerifyResponse:
        """Verify hash-chain integrity for an organization."""
        body = _strip_none(
            {
                "organization_id": params.organization_id,
                "after": _to_iso(params.after),
                "before": _to_iso(params.before),
            }
        )
        data = await self._client._request("POST", "/v1/events/verify", json=body)
        return VerifyResponse(**data)

    async def verify_range(self, params: VerifyRangeParams) -> VerifyRangeResponse:
        """Verify integrity for a specific sequence range."""
        body = {
            "organization_id": params.organization_id,
            "from_sequence": params.from_sequence,
            "to_sequence": params.to_sequence,
        }
        data = await self._client._request("POST", "/v1/events/verify-range", json=body)
        return VerifyRangeResponse(**data)

    async def get_proof(self, event_id: str) -> MerkleProofResponse:
        """Retrieve the Merkle proof for an event."""
        data = await self._client._request("GET", f"/v1/events/{event_id}/proof")
        return MerkleProofResponse(**data)

    async def list_all(
        self,
        *,
        organization_id: str,
        action: str | None = None,
        action_prefix: str | None = None,
        actor_id: str | None = None,
        target_type: str | None = None,
        target_id: str | None = None,
        after: str | datetime | None = None,
        before: str | datetime | None = None,
        search: str | None = None,
        limit: int | None = None,
    ) -> AsyncIterator[AuditEvent]:
        """Auto-paginate through all matching events.

        Yields individual :class:`AuditEvent` instances, fetching additional
        pages transparently as needed.

        Example::

            async for event in client.events.list_all(organization_id="org_acme"):
                print(event.action, event.actor)
        """
        cursor: str | None = None
        while True:
            page = await self.list(
                ListEventsParams(
                    organization_id=organization_id,
                    action=action,
                    action_prefix=action_prefix,
                    actor_id=actor_id,
                    target_type=target_type,
                    target_id=target_id,
                    after=after,
                    before=before,
                    search=search,
                    limit=limit,
                    cursor=cursor,
                )
            )
            for event in page.data:
                yield event
            if not page.has_more or not page.next_cursor:
                break
            cursor = page.next_cursor


class _OrganizationsAPI:
    def __init__(self, client: LogSeal) -> None:
        self._client = client

    async def list(self) -> PaginatedList[Organization]:
        """List all organizations."""
        data = await self._client._request("GET", "/v1/organizations")
        return PaginatedList(
            data=[Organization(**o) for o in data["data"]],
            has_more=data["has_more"],
            next_cursor=data.get("next_cursor"),
        )

    async def create(self, input: CreateOrganizationInput) -> Organization:
        """Create a new organization."""
        body = _strip_none({"external_id": input.external_id, "name": input.name})
        data = await self._client._request("POST", "/v1/organizations", json=body)
        return Organization(**data)

    async def get(self, organization_id: str) -> Organization:
        """Retrieve an organization by ID."""
        data = await self._client._request("GET", f"/v1/organizations/{organization_id}")
        return Organization(**data)


class _SchemasAPI:
    def __init__(self, client: LogSeal) -> None:
        self._client = client

    async def list(self) -> PaginatedList[EventSchema]:
        """List all event schemas."""
        data = await self._client._request("GET", "/v1/schemas")
        return PaginatedList(
            data=[EventSchema(**s) for s in data["data"]],
            has_more=data["has_more"],
            next_cursor=data.get("next_cursor"),
        )

    async def create(self, input: CreateSchemaInput) -> EventSchema:
        """Create a new event schema."""
        body = _strip_none(
            {
                "action": input.action,
                "description": input.description,
                "target_types": input.target_types,
                "metadata_schema": input.metadata_schema,
            }
        )
        data = await self._client._request("POST", "/v1/schemas", json=body)
        return EventSchema(**data)

    async def get(self, schema_id: str) -> EventSchema:
        """Retrieve a schema by ID."""
        data = await self._client._request("GET", f"/v1/schemas/{schema_id}")
        return EventSchema(**data)

    async def update(self, schema_id: str, input: UpdateSchemaInput) -> EventSchema:
        """Update an existing schema."""
        body = _strip_none(
            {
                "description": input.description,
                "target_types": input.target_types,
                "metadata_schema": input.metadata_schema,
            }
        )
        data = await self._client._request("PATCH", f"/v1/schemas/{schema_id}", json=body)
        return EventSchema(**data)

    async def delete(self, schema_id: str) -> None:
        """Delete a schema."""
        await self._client._request("DELETE", f"/v1/schemas/{schema_id}")


class _ViewerTokensAPI:
    def __init__(self, client: LogSeal) -> None:
        self._client = client

    async def create(self, input: CreateViewerTokenInput) -> ViewerToken:
        """Create a short-lived viewer token for the embeddable log viewer."""
        body = _strip_none(
            {
                "organization_id": input.organization_id,
                "expires_in": input.expires_in,
            }
        )
        data = await self._client._request("POST", "/v1/viewer-tokens", json=body)
        return ViewerToken(**data)


class _WebhooksAPI:
    def __init__(self, client: LogSeal) -> None:
        self._client = client

    async def list(self) -> PaginatedList[Webhook]:
        """List all webhooks."""
        data = await self._client._request("GET", "/v1/webhooks")
        return PaginatedList(
            data=[Webhook(**w) for w in data["data"]],
            has_more=data["has_more"],
            next_cursor=data.get("next_cursor"),
        )

    async def create(self, input: CreateWebhookInput) -> WebhookWithSecret:
        """Create a new webhook. The signing secret is only returned once."""
        body = _strip_none(
            {
                "url": input.url,
                "organization_id": input.organization_id,
                "events": input.events,
                "enabled": input.enabled,
            }
        )
        data = await self._client._request("POST", "/v1/webhooks", json=body)
        return WebhookWithSecret(**data)

    async def get(self, webhook_id: str) -> Webhook:
        """Retrieve a webhook by ID."""
        data = await self._client._request("GET", f"/v1/webhooks/{webhook_id}")
        return Webhook(**data)

    async def update(self, webhook_id: str, input: UpdateWebhookInput) -> Webhook:
        """Update an existing webhook."""
        body = _strip_none(
            {"url": input.url, "events": input.events, "enabled": input.enabled}
        )
        data = await self._client._request("PATCH", f"/v1/webhooks/{webhook_id}", json=body)
        return Webhook(**data)

    async def delete(self, webhook_id: str) -> None:
        """Delete a webhook."""
        await self._client._request("DELETE", f"/v1/webhooks/{webhook_id}")


class _ExportsAPI:
    def __init__(self, client: LogSeal) -> None:
        self._client = client

    async def create(self, input: CreateExportInput) -> Export:
        """Start a new export job."""
        body: dict[str, Any] = {
            "organization_id": input.organization_id,
            "format": input.format,
        }
        if input.filters:
            body["filters"] = _strip_none(
                {
                    "after": _to_iso(input.filters.after),
                    "before": _to_iso(input.filters.before),
                    "action": input.filters.action,
                    "actor_id": input.filters.actor_id,
                }
            )
        data = await self._client._request("POST", "/v1/exports", json=body)
        return Export(**data)

    async def get(self, export_id: str) -> Export:
        """Check the status of an export job."""
        data = await self._client._request("GET", f"/v1/exports/{export_id}")
        return Export(**data)

    async def poll(
        self,
        export_id: str,
        *,
        interval: float = 1.0,
        timeout: float = 60.0,
    ) -> Export:
        """Poll an export until it completes or fails.

        Args:
            export_id: The export job ID.
            interval: Seconds between polls. Default ``1.0``.
            timeout: Maximum seconds to wait. Default ``60.0``.

        Raises:
            LogSealError: If the export does not finish within *timeout*.
        """
        start = time.monotonic()
        while time.monotonic() - start < timeout:
            export = await self.get(export_id)
            if export.status in ("completed", "failed"):
                return export
            await asyncio.sleep(interval)

        raise LogSealError(
            type="internal_error",
            code="export_timeout",
            message="Export did not complete within the timeout period.",
        )


# Re-export for convenience
__all__ = ["LogSeal"]
