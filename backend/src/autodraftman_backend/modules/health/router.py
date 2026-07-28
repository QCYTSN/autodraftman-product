from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from autodraftman_backend.core.database import get_session

router = APIRouter(tags=["health"])
HealthSession = Annotated[AsyncSession, Depends(get_session)]


@router.get("/health/live")
async def live() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/ready")
async def ready(session: HealthSession):
    try:
        await session.execute(text("SELECT 1"))
    except (ConnectionError, OSError, SQLAlchemyError):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unavailable"},
        )
    return {"status": "ready"}
