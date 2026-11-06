"""Bound public upload bodies before Starlette's multipart parser writes temporary files."""

from autodraftman_backend.core.config import get_settings


class InternalBodyLimit:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        path = scope.get("path", "")
        limited = (
            scope.get("type") == "http"
            and scope.get("method") == "POST"
            and (path == "/api/v1/auth/password" or path.startswith("/api/v1/reconstructions"))
        )
        if not limited:
            return await self.app(scope, receive, send)
        maximum = (
            get_settings().asset_max_upload_bytes + 65536
            if path == "/api/v1/reconstructions"
            else 4096
        )

        async def reject():
            await send(
                {
                    "type": "http.response.start",
                    "status": 413,
                    "headers": [
                        (b"content-type", b"application/json"),
                        (b"cache-control", b"no-store"),
                    ],
                }
            )
            await send({"type": "http.response.body", "body": b'{"detail":"Request too large"}'})

        for key, value in scope.get("headers", []):
            if key == b"content-length" and value.isdigit() and int(value) > maximum:
                return await reject()
        # Also enforce the limit for chunked requests that omit Content-Length.
        chunks = []
        size = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            size += len(message.get("body", b""))
            if size > maximum:
                return await reject()
            chunks.append(message.get("body", b""))
            if not message.get("more_body", False):
                break
        body = b"".join(chunks)
        delivered = False

        async def bounded_receive():
            nonlocal delivered
            if delivered:
                return await receive()
            delivered = True
            return {"type": "http.request", "body": body, "more_body": False}

        await self.app(scope, bounded_receive, send)
