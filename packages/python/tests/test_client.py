"""Tests for the LogSeal Python client."""

from __future__ import annotations

import pytest
import httpx
from pytest_httpx import HTTPXMock

from logseal import LogSeal, LogSealError
from logseal.types import (
    ActorInput,
    CreateOrganizationInput,
    CreateWebhookInput,
    EmitEventInput,
    ListEventsParams,
    TargetInput,
    VerifyParams,
)


@pytest.fixture
def client() -> LogSeal:
    return LogSeal(api_key="sk_test_abc123", base_url="https://api.logseal.io")


def _event(**overrides: object) -> EmitEventInput:
    defaults = dict(
        action="user.login",
        organization_id="org_acme",
        actor=ActorInput(id="user_1", name="Alice"),
    )
    defaults.update(overrides)
    return EmitEventInput(**defaults)  # type: ignore[arg-type]


# ------------------------------------------------------------------
# Construction
# ------------------------------------------------------------------


class TestInit:
    def test_missing_api_key_raises(self) -> None:
        with pytest.raises(ValueError, match="api_key is required"):
            LogSeal(api_key="")


# ------------------------------------------------------------------
# Validation
# ------------------------------------------------------------------


class TestValidation:
    async def test_missing_action(self, client: LogSeal) -> None:
        with pytest.raises(LogSealError, match="action"):
            await client.emit(EmitEventInput(action="", organization_id="org_1", actor=ActorInput(id="u")))

    async def test_missing_actor_id(self, client: LogSeal) -> None:
        with pytest.raises(LogSealError, match="actor.id"):
            await client.emit(EmitEventInput(action="a", organization_id="org_1", actor=ActorInput(id="")))

    async def test_missing_organization_id(self, client: LogSeal) -> None:
        with pytest.raises(LogSealError, match="organization_id"):
            await client.emit(EmitEventInput(action="a", organization_id="", actor=ActorInput(id="u")))


# ------------------------------------------------------------------
# Emit
# ------------------------------------------------------------------


class TestEmit:
    async def test_emit_queues_event(self, client: LogSeal) -> None:
        result = await client.emit(_event())
        assert result == {"status": "queued"}
        assert len(client._queue) == 1

    async def test_emit_sync(self, client: LogSeal, httpx_mock: HTTPXMock) -> None:
        httpx_mock.add_response(
            url="https://api.logseal.io/v1/events",
            method="POST",
            json={
                "id": "evt_1",
                "action": "user.login",
                "occurred_at": "2025-01-01T00:00:00Z",
                "received_at": "2025-01-01T00:00:00Z",
                "organization_id": "org_acme",
                "object": "event",
            },
        )
        resp = await client.emit_sync(_event())
        assert resp.id == "evt_1"
        assert resp.action == "user.login"


# ------------------------------------------------------------------
# Flush
# ------------------------------------------------------------------


class TestFlush:
    async def test_flush_empty_queue(self, client: LogSeal) -> None:
        result = await client.flush()
        assert result == {"sent": 0}

    async def test_flush_sends_batch(self, client: LogSeal, httpx_mock: HTTPXMock) -> None:
        httpx_mock.add_response(
            url="https://api.logseal.io/v1/events/batch",
            method="POST",
            json={"accepted": 2, "rejected": 0, "object": "batch"},
        )
        await client.emit(_event())
        await client.emit(_event(action="user.logout"))
        result = await client.flush()
        assert result == {"sent": 2}
        assert len(client._queue) == 0

    async def test_flush_requeues_on_failure(self, client: LogSeal, httpx_mock: HTTPXMock) -> None:
        client._max_retries = 0
        httpx_mock.add_response(
            url="https://api.logseal.io/v1/events/batch",
            method="POST",
            status_code=500,
            json={"error": {"type": "internal_error", "code": "server_error", "message": "fail"}},
        )
        await client.emit(_event())
        with pytest.raises(LogSealError):
            await client.flush()
        assert len(client._queue) == 1


# ------------------------------------------------------------------
# Events API
# ------------------------------------------------------------------


class TestEventsAPI:
    async def test_list_events(self, client: LogSeal, httpx_mock: HTTPXMock) -> None:
        httpx_mock.add_response(
            method="GET",
            json={
                "data": [
                    {
                        "id": "evt_1",
                        "action": "user.login",
                        "occurred_at": "2025-01-01T00:00:00Z",
                        "received_at": "2025-01-01T00:00:00Z",
                        "actor": {"id": "u1", "type": "user"},
                        "targets": [],
                        "metadata": {},
                        "context": {},
                        "event_hash": "abc",
                        "object": "event",
                    }
                ],
                "has_more": False,
                "object": "list",
            },
        )
        page = await client.events.list(ListEventsParams(organization_id="org_acme"))
        assert len(page.data) == 1
        assert page.data[0].id == "evt_1"

    async def test_get_event(self, client: LogSeal, httpx_mock: HTTPXMock) -> None:
        httpx_mock.add_response(
            method="GET",
            json={
                "id": "evt_1",
                "action": "user.login",
                "occurred_at": "2025-01-01T00:00:00Z",
                "received_at": "2025-01-01T00:00:00Z",
                "actor": {"id": "u1", "type": "user"},
                "targets": [],
                "metadata": {},
                "context": {},
                "event_hash": "abc",
                "object": "event",
            },
        )
        event = await client.events.get("evt_1")
        assert event.action == "user.login"


# ------------------------------------------------------------------
# Error handling
# ------------------------------------------------------------------


class TestErrors:
    async def test_api_error_raised(self, client: LogSeal, httpx_mock: HTTPXMock) -> None:
        httpx_mock.add_response(
            url="https://api.logseal.io/v1/events",
            method="POST",
            status_code=401,
            json={
                "error": {
                    "type": "authentication_error",
                    "code": "invalid_api_key",
                    "message": "Invalid API key",
                }
            },
        )
        with pytest.raises(LogSealError) as exc_info:
            await client.emit_sync(_event())
        assert exc_info.value.type == "authentication_error"
        assert exc_info.value.status_code == 401
