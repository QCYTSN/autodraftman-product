from fastapi import APIRouter

from autodraftman_backend.modules.assets.router import router as asset_router
from autodraftman_backend.modules.credits.router import router as credit_router
from autodraftman_backend.modules.drafts.router import router as draft_router
from autodraftman_backend.modules.feedback.router import router as feedback_router
from autodraftman_backend.modules.health.router import router as health_router
from autodraftman_backend.modules.identity.auth_router import router as auth_router
from autodraftman_backend.modules.identity.router import router as identity_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(identity_router, prefix="/api/v1")
api_router.include_router(auth_router, prefix="/api/v1")
api_router.include_router(credit_router, prefix="/api/v1")
api_router.include_router(asset_router, prefix="/api/v1")
api_router.include_router(draft_router, prefix="/api/v1")
api_router.include_router(feedback_router, prefix="/api/v1")
