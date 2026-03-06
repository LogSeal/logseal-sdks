"""Error types for the LogSeal SDK."""

from __future__ import annotations

from typing import Literal, Optional

ErrorType = Literal[
    "invalid_request_error",
    "authentication_error",
    "authorization_error",
    "not_found_error",
    "rate_limit_error",
    "idempotency_error",
    "validation_error",
    "internal_error",
]


class LogSealError(Exception):
    """Raised when the LogSeal API returns an error response.

    Attributes:
        type: The category of the error.
        code: A machine-readable error code.
        message: A human-readable description.
        param: The request parameter that caused the error, if applicable.
        doc_url: A link to relevant documentation, if available.
        status_code: The HTTP status code of the response.
    """

    def __init__(
        self,
        *,
        type: ErrorType,
        code: str,
        message: str,
        param: Optional[str] = None,
        doc_url: Optional[str] = None,
        status_code: int = 400,
    ) -> None:
        super().__init__(message)
        self.type = type
        self.code = code
        self.param = param
        self.doc_url = doc_url
        self.status_code = status_code

    def __repr__(self) -> str:
        return f"LogSealError(type={self.type!r}, code={self.code!r}, message={self.args[0]!r})"
