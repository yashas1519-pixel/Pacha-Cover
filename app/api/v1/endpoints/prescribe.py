# ============================================================
# app/api/v1/endpoints/prescribe.py
#
# "Precision Prescription" API
# POST /api/v1/prescribe
#
# INSTANT MODE: Returns pre-computed recommendations in <50ms.
# AI MODE: Falls back to Gemini 2.5 Flash for novel combinations.
#
# Auth: Required (Firebase ID token).
# ============================================================

import asyncio

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import get_current_user
from app.core.config import get_settings
from app.core.logging import get_logger
from app.models.schemas import (
    PrescriptionRequest, 
    PrescriptionResponse,
    ChatPrescriptionRequest,
    ChatPrescriptionResponse
)
from app.services.gemini_service import GeminiService
from app.services.prescription_cache import (
    cache_gemini_result,
    get_instant_prescription,
)
from app.services.soil_health_service import SoilHealthService

router = APIRouter(prefix="/prescribe", tags=["Precision Prescription"])
log = get_logger(__name__)

# Singletons — thread-safe and reusable across requests
_gemini_service = GeminiService()
_soil_service = SoilHealthService()


@router.post(
    "",
    response_model=PrescriptionResponse,
    status_code=status.HTTP_200_OK,
    summary="AI-powered tree species recommendation",
    description=(
        "Send GPS coordinates and optional context (land use, soil type, "
        "plot area) to receive an instant tree species recommendation. "
        "Uses a pre-computed expert database for sub-50ms responses. "
        "Falls back to Gemini 2.5 Flash for novel location/soil combinations."
    ),
)
async def prescribe_species(
    request: PrescriptionRequest,
    current_user: dict = Depends(get_current_user),
    settings=Depends(get_settings),
) -> PrescriptionResponse:
    """
    Tree species prescription — instant mode + AI fallback.

    Example request body:
    ```json
    {
      "coordinates": {"latitude": 12.9352, "longitude": 77.6245},
      "nearby_land_use": "roadside",
      "ward_name": "Koramangala"
    }
    ```
    """
    uid = current_user.get("uid", "unknown")
    lat = request.coordinates.latitude
    lng = request.coordinates.longitude

    log.info("prescribe.request", uid=uid, lat=lat, lng=lng, ward=request.ward_name)

    # ── INSTANT MODE: Check pre-computed cache first ──────────────────────
    cached = get_instant_prescription(request)
    if cached:
        primary, alternatives = cached
        log.info(
            "prescribe.instant_hit",
            uid=uid,
            primary=primary.common_name,
            mode="instant",
        )
        return PrescriptionResponse(
            coordinates=request.coordinates,
            primary_recommendation=primary,
            alternative_recommendations=alternatives,
            gemini_model_used="instant-cache-v1",
            soil_analysis=None,
        )

    # ── AI MODE: Fallback to Gemini for novel queries ─────────────────────
    log.info("prescribe.cache_miss_using_gemini", uid=uid, ward=request.ward_name)

    # Step 1: Fetch site health data (non-blocking)
    site_health = None
    try:
        loop = asyncio.get_event_loop()
        site_health = await loop.run_in_executor(
            None, _soil_service.get_site_health, lat, lng
        )
        log.info(
            "prescribe.site_health_fetched",
            ndvi=site_health["ndvi"],
            lst=site_health["lst_celsius"],
        )
    except Exception as exc:
        log.warning("prescribe.site_health_failed", error=str(exc))

    # Step 2: Call Gemini
    try:
        primary, alternatives = await _gemini_service.prescribe_species(
            request, site_health=site_health
        )
    except ValueError as exc:
        log.error("prescribe.parse_error", uid=uid, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "The AI recommendation engine returned an unexpected response. "
                "Please try again."
            ),
        )
    except Exception as exc:
        log.error("prescribe.gemini_error", uid=uid, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "AI recommendation service is temporarily unavailable. "
                "Please retry in a few moments."
            ),
        )

    # Step 3: Cache the Gemini result for future instant retrieval
    cache_gemini_result(request, primary, alternatives)

    log.info(
        "prescribe.success",
        uid=uid,
        primary=primary.common_name,
        alternatives=[s.common_name for s in alternatives],
        enriched=site_health is not None,
        mode="gemini",
    )

    return PrescriptionResponse(
        coordinates=request.coordinates,
        primary_recommendation=primary,
        alternative_recommendations=alternatives,
        gemini_model_used=settings.gemini_model,
        soil_analysis=site_health,
    )


@router.post(
    "/chat",
    response_model=ChatPrescriptionResponse,
    status_code=status.HTTP_200_OK,
    summary="Conversational Spot Assistant",
)
async def chat_prescribe(
    request: ChatPrescriptionRequest,
    current_user: dict = Depends(get_current_user),
    settings=Depends(get_settings),
) -> ChatPrescriptionResponse:
    uid = current_user.get("uid", "unknown")
    lat = request.coordinates.latitude
    lng = request.coordinates.longitude

    log.info("prescribe.chat", uid=uid, lat=lat, lng=lng, msgs=len(request.messages))

    # Try to extract site health context
    site_health = None
    try:
        loop = asyncio.get_event_loop()
        site_health = await loop.run_in_executor(
            None, _soil_service.get_site_health, lat, lng
        )
    except Exception as exc:
        log.warning("prescribe.chat.site_health_failed", error=str(exc))

    try:
        response = await _gemini_service.chat_prescribe(request, site_health=site_health)
        return response
    except Exception as exc:
        log.error("prescribe.chat.error", uid=uid, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI assistant is temporarily unavailable."
        )
