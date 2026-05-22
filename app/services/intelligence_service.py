import asyncio
import json
from datetime import datetime

import google.generativeai as genai
from google.cloud import firestore

from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.firebase import get_firestore_client
from app.models.firestore_collections import Collections
from app.services.base_ai_service import BaseAiService

log = get_logger(__name__)

class IntelligenceService(BaseAiService):
    """
    Proactive AI Ward Intelligence Service.
    Monitors ward data and generates actionable insights/alerts.
    """
    def __init__(self) -> None:
        super().__init__()
        self._db = get_firestore_client()
        
        system_prompt = (
            "You are Pacha AI, a proactive urban forestry intelligence agent. "
            "Your job is to analyze real-time environmental data for Bengaluru wards "
            "and generate actionable, urgent alerts for city administrators or citizens.\n"
            "Generate 3-5 insights based on the provided ward data.\n\n"
            "Return JSON matching this schema:\n"
            "[\n"
            "  {\n"
            '    "id": "alert-1",\n'
            '    "ward_name": "Koramangala",\n'
            '    "severity": "high", // low, medium, high, critical\n'
            '    "title": "Heat Risk Spike",\n'
            '    "message": "NDVI dropped 12% in 60 days. Heat risk is now Critical. Prioritize neem plantations.",\n'
            '    "action": "Dispatch Inspection Team"\n'
            "  }\n"
            "]"
        )
        
        self._model = self._create_model(
            system_instruction=system_prompt,
            temperature=0.8,
            top_p=0.9
        )

    async def generate_ward_alerts(self) -> list[dict]:
        """
        Fetch all ward data and use Gemini to generate proactive alerts.
        """
        try:
            from app.services.earth_engine_service import EarthEngineService
            ee_service = EarthEngineService()
            wards_models = await ee_service.get_ward_heat_data()
            wards = [w.model_dump() for w in wards_models]
        except Exception as e:
            log.warning("intelligence.fetch_failed_using_fallback", error=str(e))
            # Fallback data if GEE fails or DB is empty during hackathon
            wards = [
                {"ward_name": "Indiranagar", "heat_risk_score": 85, "avg_ndvi": 0.12, "green_cover_percent": 8, "adopted_spots_count": 4},
                {"ward_name": "Jayanagar", "heat_risk_score": 45, "avg_ndvi": 0.45, "green_cover_percent": 22, "adopted_spots_count": 45},
                {"ward_name": "Koramangala", "heat_risk_score": 75, "avg_ndvi": 0.18, "green_cover_percent": 12, "adopted_spots_count": 12},
                {"ward_name": "Whitefield", "heat_risk_score": 90, "avg_ndvi": 0.08, "green_cover_percent": 5, "adopted_spots_count": 2},
                {"ward_name": "Malleswaram", "heat_risk_score": 30, "avg_ndvi": 0.55, "green_cover_percent": 35, "adopted_spots_count": 80},
                {"ward_name": "HSR Layout", "heat_risk_score": 60, "avg_ndvi": 0.25, "green_cover_percent": 15, "adopted_spots_count": 20},
            ]
            
        # Select top 5 worst and top 5 best wards to keep prompt size manageable
        sorted_wards = sorted(wards, key=lambda w: w.get('heat_risk_score', 0), reverse=True)
        sample_data = sorted_wards[:5] + sorted_wards[-5:]
        
        # Format for Gemini
        context = "Current Ward Environmental Snapshot:\n"
        for w in sample_data:
            context += f"- Ward: {w.get('ward_name', 'Unknown')}, Heat Risk: {w.get('heat_risk_score', 0)}/100, NDVI: {w.get('avg_ndvi', 0)}, Adopted Spots: {w.get('adopted_spots_count', 0)}\n"
            
        async with self._lock:
            genai.configure(api_key=self._settings.gemini_api_key_prescribe)
            response = await self._model.generate_content_async(context)
            
        try:
            alerts = json.loads(response.text)
            return alerts
        except Exception as e:
            log.error("intelligence.parse_failed", error=str(e), response=response.text)
            return []
