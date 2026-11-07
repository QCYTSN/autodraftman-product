"""Session transport for the same-site app and the explicitly trusted Pages frontend."""

import re

from fastapi import HTTPException, Request

from autodraftman_backend.core.config import Settings


def require_bearer_origin(request: Request, settings: Settings) -> None:
    if request.headers.get("origin") not in settings.bearer_origin_list:
        raise HTTPException(403, "Session transport is unavailable for this origin")


def session_token(request: Request, settings: Settings) -> str | None:
    authorization = request.headers.get("authorization")
    if authorization is None:
        return request.cookies.get(settings.session_cookie_name)
    # An explicit credential always wins. Never fall back to another user's cookie.
    require_bearer_origin(request, settings)
    match = re.fullmatch(r"Bearer ([A-Za-z0-9_-]{64})", authorization, re.IGNORECASE)
    if not match:
        raise HTTPException(401, "Invalid session credential")
    return match[1]
