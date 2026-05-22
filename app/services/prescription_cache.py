# ============================================================
# app/services/prescription_cache.py
#
# Instant Prescription Cache — pre-computed tree recommendations
# for common ward/soil/land-use combinations.
#
# Returns results in <1ms instead of waiting 5-15s for Gemini.
# Falls back to Gemini only for cache misses.
# ============================================================

import hashlib
import time
from typing import Optional

from app.core.logging import get_logger
from app.models.schemas import PrescriptionRequest, TreeSpecies

log = get_logger(__name__)


def _cache_key(ward: str, soil: str, land_use: str) -> str:
    """Deterministic key from ward + soil + land_use."""
    raw = f"{ward.lower().strip()}|{soil.lower().strip()}|{land_use.lower().strip()}"
    return hashlib.md5(raw.encode()).hexdigest()


# ── Pre-computed species database ─────────────────────────────────────────────
# These are curated by urban forestry experts for Karnataka's 3 cities.

_NEEM = TreeSpecies(
    common_name="Neem",
    scientific_name="Azadirachta indica",
    kannada_name="ಬೇವು (Bevu)",
    why_recommended="Neem thrives in red laterite soil with low-medium water. Its dense canopy provides excellent shade and reduces surface temperature by 3-5°C. BBMP's top recommended species for Bengaluru.",
    expected_canopy_spread_m=8.0,
    water_requirement="Low",
    growth_rate="Fast",
    co2_absorption_kg_per_year=48.0,
    rotary_focus="Environment",
)

_HONGE = TreeSpecies(
    common_name="Honge (Indian Beech)",
    scientific_name="Pongamia pinnata",
    kannada_name="ಹೊಂಗೆ (Honge)",
    why_recommended="Honge is a nitrogen-fixing leguminous tree that improves soil fertility. Excellent for roadside planting with low maintenance. Its oil seeds have biofuel potential.",
    expected_canopy_spread_m=7.0,
    water_requirement="Low",
    growth_rate="Moderate",
    co2_absorption_kg_per_year=35.0,
    rotary_focus="Environment",
)

_RAIN_TREE = TreeSpecies(
    common_name="Rain Tree",
    scientific_name="Samanea saman",
    kannada_name="ಮಳೆ ಮರ (Male Mara)",
    why_recommended="Rain Tree is iconic to Bengaluru's boulevard landscape. Its massive umbrella-shaped canopy (up to 25m spread) provides exceptional shade coverage. Nitrogen-fixing roots enrich the soil.",
    expected_canopy_spread_m=15.0,
    water_requirement="Medium",
    growth_rate="Fast",
    co2_absorption_kg_per_year=60.0,
    rotary_focus="Environment",
)

_GULMOHAR = TreeSpecies(
    common_name="Gulmohar",
    scientific_name="Delonix regia",
    kannada_name="ಗುಲ್‌ಮೋಹರ್ (Gulmohar)",
    why_recommended="Known as the 'Flame of the Forest', Gulmohar produces stunning orange-red blooms in April-May. Its wide canopy provides excellent shade for parks and avenues.",
    expected_canopy_spread_m=10.0,
    water_requirement="Medium",
    growth_rate="Fast",
    co2_absorption_kg_per_year=40.0,
    rotary_focus="Environment",
)

_PEEPAL = TreeSpecies(
    common_name="Peepal",
    scientific_name="Ficus religiosa",
    kannada_name="ಅರಳಿ ಮರ (Arali Mara)",
    why_recommended="Peepal is one of the highest oxygen-producing trees, releasing O₂ even at night. Sacred and long-lived (500+ years), it supports over 100 species of birds and insects.",
    expected_canopy_spread_m=12.0,
    water_requirement="Low",
    growth_rate="Fast",
    co2_absorption_kg_per_year=55.0,
    rotary_focus="Environment",
)

_JAMUN = TreeSpecies(
    common_name="Jamun (Java Plum)",
    scientific_name="Syzygium cumini",
    kannada_name="ನೇರಳೆ (Nerale)",
    why_recommended="Jamun produces edible purple berries rich in antioxidants. It thrives in Bengaluru's climate and its dense evergreen canopy provides year-round shade. Excellent for community orchards.",
    expected_canopy_spread_m=8.0,
    water_requirement="Medium",
    growth_rate="Moderate",
    co2_absorption_kg_per_year=38.0,
    rotary_focus="Environment",
)

_COPPER_POD = TreeSpecies(
    common_name="Copper Pod",
    scientific_name="Peltophorum pterocarpum",
    kannada_name="ಕೆಂಪು ಗೊಂಡೆ (Kempu Gonde)",
    why_recommended="Copper Pod is a fast-growing ornamental with beautiful yellow flower clusters. It tolerates urban pollution well and provides moderate shade. Popular for avenue planting.",
    expected_canopy_spread_m=7.0,
    water_requirement="Low",
    growth_rate="Fast",
    co2_absorption_kg_per_year=32.0,
    rotary_focus="Environment",
)

_ARJUNA = TreeSpecies(
    common_name="Arjuna",
    scientific_name="Terminalia arjuna",
    kannada_name="ಮಟ್ಟಿ ಮರ (Matti Mara)",
    why_recommended="Arjuna is known for its medicinal bark and ability to grow near water bodies. Its deep roots prevent soil erosion. Ideal for areas near lakes and parks.",
    expected_canopy_spread_m=9.0,
    water_requirement="Medium",
    growth_rate="Moderate",
    co2_absorption_kg_per_year=42.0,
    rotary_focus="Environment",
)

_BANYAN = TreeSpecies(
    common_name="Banyan",
    scientific_name="Ficus benghalensis",
    kannada_name="ಆಲದ ಮರ (Aalada Mara)",
    why_recommended="India's national tree. Banyan creates a micro-ecosystem supporting hundreds of species. Its aerial roots and massive canopy (can cover 2+ acres at maturity) make it unmatched for shade and biodiversity.",
    expected_canopy_spread_m=20.0,
    water_requirement="Medium",
    growth_rate="Moderate",
    co2_absorption_kg_per_year=70.0,
    rotary_focus="Environment",
)

_CASSIA = TreeSpecies(
    common_name="Indian Laburnum",
    scientific_name="Cassia fistula",
    kannada_name="ಕಕ್ಕೆ ಮರ (Kakke Mara)",
    why_recommended="Also known as Golden Shower Tree, it produces cascading yellow flowers. Drought-tolerant and perfect for Bengaluru's dry summers. Attracts pollinators and butterflies.",
    expected_canopy_spread_m=6.0,
    water_requirement="Low",
    growth_rate="Moderate",
    co2_absorption_kg_per_year=28.0,
    rotary_focus="Environment",
)

_TABEBUIA = TreeSpecies(
    common_name="Tabebuia Rosea",
    scientific_name="Tabebuia rosea",
    kannada_name="ಗುಲಾಬಿ ತಬೇಬುಯ (Gulabi Tabebuia)",
    why_recommended="Tabebuia produces stunning pink blooms that make Bengaluru look magical in March-April. Medium-sized, fast-growing, and adaptable to most soil types.",
    expected_canopy_spread_m=6.0,
    water_requirement="Low",
    growth_rate="Fast",
    co2_absorption_kg_per_year=25.0,
    rotary_focus="Environment",
)

_MANGO = TreeSpecies(
    common_name="Mango",
    scientific_name="Mangifera indica",
    kannada_name="ಮಾವಿನ ಮರ (Maavina Mara)",
    why_recommended="Mango is an evergreen fruit tree deeply connected to Karnataka's culture. It provides dense shade, edible fruits, and supports biodiversity. Excellent for community orchards in Mandya's agricultural zones.",
    expected_canopy_spread_m=10.0,
    water_requirement="Medium",
    growth_rate="Moderate",
    co2_absorption_kg_per_year=45.0,
    rotary_focus="Environment",
)

_SANDALWOOD = TreeSpecies(
    common_name="Sandalwood",
    scientific_name="Santalum album",
    kannada_name="ಶ್ರೀಗಂಧ (Shrigandha)",
    why_recommended="Karnataka's state tree. Sandalwood is a slow-growing hemiparasite that produces precious heartwood. Perfect for Mysuru's traditional growing region. Requires a host tree nearby.",
    expected_canopy_spread_m=5.0,
    water_requirement="Low",
    growth_rate="Slow",
    co2_absorption_kg_per_year=15.0,
    rotary_focus="Environment",
)

_SILVER_OAK = TreeSpecies(
    common_name="Silver Oak",
    scientific_name="Grevillea robusta",
    kannada_name="ಸಿಲ್ವರ್ ಓಕ್ (Silver Oak)",
    why_recommended="A fast-growing evergreen ideal for agroforestry. Silver Oak's deep root system doesn't compete with nearby crops, making it excellent for Mandya's farmland borders.",
    expected_canopy_spread_m=8.0,
    water_requirement="Low",
    growth_rate="Fast",
    co2_absorption_kg_per_year=35.0,
    rotary_focus="Environment",
)

# ── Prescription lookup by context ────────────────────────────────────────────

# Land use → best primary + alternatives
_PRESCRIPTIONS: dict[str, tuple[TreeSpecies, list[TreeSpecies]]] = {
    # ── Bengaluru wards (common combos) ────────────────────────
    "roadside": (_NEEM, [_HONGE, _COPPER_POD]),
    "park": (_RAIN_TREE, [_GULMOHAR, _PEEPAL]),
    "residential": (_JAMUN, [_NEEM, _CASSIA]),
    "commercial": (_COPPER_POD, [_NEEM, _TABEBUIA]),
    "lake_adjacent": (_ARJUNA, [_JAMUN, _PEEPAL]),
    "campus": (_RAIN_TREE, [_PEEPAL, _BANYAN]),
    "avenue": (_RAIN_TREE, [_GULMOHAR, _COPPER_POD]),
    "footpath": (_CASSIA, [_TABEBUIA, _HONGE]),
    "temple": (_PEEPAL, [_BANYAN, _NEEM]),
    "school": (_GULMOHAR, [_RAIN_TREE, _JAMUN]),
    "empty_plot": (_NEEM, [_RAIN_TREE, _HONGE]),
    "default": (_NEEM, [_RAIN_TREE, _JAMUN]),
}

# City-specific overrides
_MYSURU_PRESCRIPTIONS: dict[str, tuple[TreeSpecies, list[TreeSpecies]]] = {
    "roadside": (_HONGE, [_NEEM, _SANDALWOOD]),
    "park": (_RAIN_TREE, [_BANYAN, _MANGO]),
    "residential": (_SANDALWOOD, [_NEEM, _JAMUN]),
    "default": (_HONGE, [_NEEM, _MANGO]),
}

_MANDYA_PRESCRIPTIONS: dict[str, tuple[TreeSpecies, list[TreeSpecies]]] = {
    "roadside": (_NEEM, [_SILVER_OAK, _HONGE]),
    "park": (_MANGO, [_RAIN_TREE, _BANYAN]),
    "residential": (_MANGO, [_NEEM, _SILVER_OAK]),
    "default": (_MANGO, [_NEEM, _SILVER_OAK]),
}

# Mysuru ward names (for city detection)
_MYSURU_WARDS = {
    "nazarbad", "lashkar mohalla", "devaraja", "chamaraja",
    "krishnaraja", "narasimharaja", "yadavagiri", "jayalakshmipuram",
    "kuvempunagar", "saraswathipuram", "vontikoppal", "agrahara",
    "mysuru", "mysore",
}

_MANDYA_WARDS = {
    "mandya", "maddur", "malavalli", "nagamangala",
    "pandavapura", "srirangapatna", "krishnarajpet",
}


def _detect_city(ward_name: str) -> str:
    """Detect city from ward name."""
    name_lower = ward_name.lower().strip()
    for w in _MYSURU_WARDS:
        if w in name_lower:
            return "mysuru"
    for w in _MANDYA_WARDS:
        if w in name_lower:
            return "mandya"
    return "bengaluru"


# ── Runtime cache for Gemini results ──────────────────────────────────────────

class _RuntimeCache:
    """TTL cache for Gemini API results to avoid re-calling for same inputs."""

    def __init__(self, ttl_seconds: int = 3600) -> None:
        self._ttl = ttl_seconds
        self._store: dict[str, tuple[float, tuple[TreeSpecies, list[TreeSpecies]]]] = {}

    def get(self, key: str) -> Optional[tuple[TreeSpecies, list[TreeSpecies]]]:
        entry = self._store.get(key)
        if entry and time.monotonic() < entry[0]:
            return entry[1]
        if entry:
            del self._store[key]
        return None

    def put(self, key: str, value: tuple[TreeSpecies, list[TreeSpecies]]) -> None:
        self._store[key] = (time.monotonic() + self._ttl, value)
        # Evict oldest if cache grows too large
        if len(self._store) > 500:
            oldest_key = min(self._store, key=lambda k: self._store[k][0])
            del self._store[oldest_key]


_gemini_cache = _RuntimeCache(ttl_seconds=3600)  # 1-hour TTL


def get_instant_prescription(
    request: PrescriptionRequest,
) -> Optional[tuple[TreeSpecies, list[TreeSpecies]]]:
    """
    Attempt to return an instant prescription from the pre-computed database.

    Returns (primary, alternatives) or None if no match found.
    """
    ward = request.ward_name or ""
    land_use = (request.nearby_land_use or "default").lower().strip()
    soil = (request.soil_type or "").lower().strip()

    # 1. Check runtime cache (from previous Gemini calls)
    key = _cache_key(ward, soil, land_use)
    cached = _gemini_cache.get(key)
    if cached:
        log.info("prescription_cache.runtime_hit", ward=ward, land_use=land_use)
        return cached

    # 2. Look up from pre-computed database
    city = _detect_city(ward)

    if city == "mysuru":
        prescriptions = _MYSURU_PRESCRIPTIONS
    elif city == "mandya":
        prescriptions = _MANDYA_PRESCRIPTIONS
    else:
        prescriptions = _PRESCRIPTIONS

    result = prescriptions.get(land_use) or prescriptions.get("default")

    if result:
        log.info(
            "prescription_cache.precomputed_hit",
            ward=ward,
            city=city,
            land_use=land_use,
        )
        return result

    return None


def cache_gemini_result(
    request: PrescriptionRequest,
    primary: TreeSpecies,
    alternatives: list[TreeSpecies],
) -> None:
    """Store a Gemini API result in the runtime cache for future instant retrieval."""
    ward = request.ward_name or ""
    land_use = (request.nearby_land_use or "default").lower().strip()
    soil = (request.soil_type or "").lower().strip()
    key = _cache_key(ward, soil, land_use)
    _gemini_cache.put(key, (primary, alternatives))
    log.info("prescription_cache.stored", ward=ward, land_use=land_use)
