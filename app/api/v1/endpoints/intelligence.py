from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import get_current_user
from app.core.logging import get_logger
from app.services.intelligence_service import IntelligenceService

router = APIRouter(prefix="/intelligence", tags=["Proactive Intelligence"])
log = get_logger(__name__)

_intelligence_service = IntelligenceService()

@router.get(
    "/alerts",
    status_code=status.HTTP_200_OK,
    summary="Get proactive AI ward alerts",
)
async def get_alerts(current_user: dict = Depends(get_current_user)):
    try:
        alerts = await _intelligence_service.generate_ward_alerts()
        return {"success": True, "data": alerts}
    except Exception as exc:
        log.error("intelligence.alerts.error", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate intelligence alerts."
        )
