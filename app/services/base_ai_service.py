# ============================================================
# app/services/base_ai_service.py
#
# Shared base class for all AI-powered services (Gemini, Carbon).
# Extracts common configuration, safety settings, and async lock
# to eliminate duplication across service classes.
# ============================================================

import asyncio

import google.generativeai as genai

from app.core.config import Settings, get_settings
from app.core.logging import get_logger

log = get_logger(__name__)

# Shared safety settings — disable content filtering for scientific/ecological prompts
SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]


class BaseAiService:
    """
    Base class for Gemini-powered services.

    Provides:
      - Shared Settings instance
      - Shared asyncio.Lock for API key configuration
      - Factory method for creating GenerativeModel instances
    """

    def __init__(self) -> None:
        self._settings: Settings = get_settings()
        self._lock = asyncio.Lock()

    def _create_model(
        self,
        *,
        system_instruction: str,
        temperature: float = 0.3,
        top_p: float = 0.85,
        response_mime_type: str = "application/json",
    ) -> genai.GenerativeModel:
        """Factory: build a GenerativeModel with the project's shared safety settings."""
        return genai.GenerativeModel(
            model_name=self._settings.gemini_model,
            system_instruction=system_instruction if system_instruction else None,
            generation_config=genai.GenerationConfig(
                temperature=temperature,
                top_p=top_p,
                response_mime_type=response_mime_type,
            ),
            safety_settings=SAFETY_SETTINGS,
        )
