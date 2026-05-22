# ============================================================
# app/services/corridor_service.py
#
# Feature 2 — "Green Corridor" Geospatial Clustering Service
#
# Algorithm:
#   1. For each BBMP ward, fetch all "verified" or "completed"
#      adopted spots from Firestore.
#   2. Run a simple DBSCAN-style sweep: for each unvisited spot,
#      count neighbours within `corridor_radius_m` (default 100m).
#   3. If a cluster has ≥ corridor_min_trees (default 5), it
#      qualifies as an Active Green Corridor.
#   4. Write the corridor document to green_corridors/{corridor_id}.
#   5. Update the ward_heat_data doc with corridor_status.
#   6. Award the "Corridor Creator" badge + bonus Green Points
#      to all unique contributors in the cluster — atomically via
#      Firestore batch writes.
#
# Geo-distance:
#   Uses the Haversine formula (pure Python, no geo library needed).
#   Accuracy is ±0.5% at 100m scale — more than sufficient.
#
# Scalability:
#   For 198 wards × ~50 verified spots each = ~10,000 points.
#   O(n²) Haversine sweep is fast (<50ms) at this scale.
#   For city-scale (millions of spots), switch to a geohash-bucketed
#   approach or use BigQuery GIS via an export pipeline.
#
# Trigger:
#   Called by:
#     POST /api/v1/corridors/audit   (manual / scheduled)
#     Cloud Scheduler job (daily at 02:00 IST)
# ============================================================

import math
import time
import uuid
from datetime import datetime, timezone
from typing import NamedTuple

from google.cloud.firestore import AsyncClient

from app.core.config import get_settings
from app.core.logging import get_logger
from app.models.firestore_collections import Collections, FirestoreFields
from app.models.schemas import (
    AdoptionStatus,
    CorridorAuditResult,
    CorridorStatus,
    Coordinates,
    GreenCorridor,
)

log = get_logger(__name__)
UTC = timezone.utc

# Badge name — must match the badge system in functions/main.py
_CORRIDOR_BADGE = "Corridor Creator"

# ── Haversine distance ─────────────────────────────────────────────────────────

_EARTH_RADIUS_M = 6_371_000.0


def haversine_distance_m(a: Coordinates, b: Coordinates) -> float:
    """
    Returns the great-circle distance between two WGS-84 points in metres.
    Accurate to < 0.5% at distances under 1km.
    """
    lat1, lon1 = math.radians(a.latitude), math.radians(a.longitude)
    lat2, lon2 = math.radians(b.latitude), math.radians(b.longitude)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    h = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    )
    return 2 * _EARTH_RADIUS_M * math.asin(math.sqrt(h))


# ── Internal data structure ────────────────────────────────────────────────────

class _SpotPoint(NamedTuple):
    spot_id: str
    user_id: str
    coords: Coordinates
    ward_name: str
    ward_id: str


# ── Clustering algorithm ───────────────────────────────────────────────────────

def _find_clusters(
    points: list[_SpotPoint],
    radius_m: float,
    min_trees: int,
) -> list[list[_SpotPoint]]:
    """
    O(N) grid-based density clustering.

    Groups points into geographic grid cells sized to `radius_m`.
    Adjacent cells are merged to catch points near cell boundaries.
    If a merged neighbourhood has >= min_trees, it forms a corridor.

    This replaces the previous O(N²) pairwise Haversine sweep.
    """
    clusters: list[list[_SpotPoint]] = []
    grid: dict[tuple[int, int], list[_SpotPoint]] = {}

    # ~111,111 metres per degree of latitude at the equator.
    # For Bengaluru (~13°N) the error is < 3%, acceptable for 100m cells.
    cell_deg = radius_m / 111_111.0

    # ── Assign each point to a grid cell ─────────────────────────────
    for p in points:
        cx = math.floor(p.coords.longitude / cell_deg)
        cy = math.floor(p.coords.latitude / cell_deg)
        grid.setdefault((cx, cy), []).append(p)

    # ── Check each cell + its 8 neighbours ───────────────────────────
    visited: set[tuple[int, int]] = set()

    for (cx, cy), cell_points in grid.items():
        if (cx, cy) in visited:
            continue
        visited.add((cx, cy))

        # Collect points from this cell and all 8 adjacent cells
        neighbourhood: list[_SpotPoint] = list(cell_points)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                neighbour_key = (cx + dx, cy + dy)
                if neighbour_key in grid:
                    neighbourhood.extend(grid[neighbour_key])
                    visited.add(neighbour_key)

        if len(neighbourhood) >= min_trees:
            clusters.append(neighbourhood)

    return clusters


def _cluster_centroid(cluster: list[_SpotPoint]) -> Coordinates:
    """Arithmetic mean of all points' lat/lon (valid for small areas < 1km)."""
    avg_lat = sum(p.coords.latitude for p in cluster) / len(cluster)
    avg_lng = sum(p.coords.longitude for p in cluster) / len(cluster)
    return Coordinates(latitude=round(avg_lat, 6), longitude=round(avg_lng, 6))


# ── Service class ──────────────────────────────────────────────────────────────

class CorridorService:
    """
    Detects Green Corridors across all wards and awards badges.
    """

    def __init__(self, db: AsyncClient) -> None:
        self._db = db
        self._settings = get_settings()

    # ── Main audit entry point ─────────────────────────────────────────────────

    async def audit_corridor_status(self) -> CorridorAuditResult:
        """
        Full city-wide corridor audit.

        Steps:
          1. Load all verified/completed adopted spots
          2. Run clustering per ward
          3. Persist new corridors and update ward docs
          4. Award badges to contributors
          5. Return audit summary

        This is idempotent — re-running does not duplicate badges
        because badge award checks for existing badge membership.
        """
        t_start = time.perf_counter()
        log.info("corridor.audit_started")

        # ── Step 1: Load verified spots ───────────────────────────────────
        verified_statuses = [
            AdoptionStatus.VERIFIED.value,
            AdoptionStatus.COMPLETED.value,
        ]

        all_points: list[_SpotPoint] = []

        _BATCH_SIZE = 500

        for vstatus in verified_statuses:
            base_query = (
                self._db.collection(Collections.ADOPTED_SPOTS)
                .where(filter=_where(FirestoreFields.STATUS, "==", vstatus))
                .order_by("__name__")
            )

            last_doc = None
            while True:
                query = base_query.limit(_BATCH_SIZE)
                if last_doc is not None:
                    query = query.start_after(last_doc)

                batch_count = 0
                async for doc in query.stream():
                    batch_count += 1
                    last_doc = doc
                    data = doc.to_dict() or {}
                    geo = data.get(FirestoreFields.COORDINATES)
                    if geo is None:
                        continue

                    all_points.append(
                        _SpotPoint(
                            spot_id=doc.id,
                            user_id=data.get(FirestoreFields.USER_ID, ""),
                            coords=Coordinates(
                                latitude=geo.latitude,
                                longitude=geo.longitude,
                            ),
                            ward_name=data.get(FirestoreFields.WARD_NAME, "unknown"),
                            ward_id=_ward_id_from_name(
                                data.get(FirestoreFields.WARD_NAME, "unknown")
                            ),
                        )
                    )

                if batch_count < _BATCH_SIZE:
                    break

        log.info("corridor.spots_loaded", count=len(all_points))

        # ── Step 2: Cluster all points together (city-wide sweep) ──────────
        clusters = _find_clusters(
            all_points,
            radius_m=self._settings.corridor_radius_m,
            min_trees=self._settings.corridor_min_trees,
        )

        # ── Step 3 & 4: Persist corridors + award badges ───────────────────
        new_corridors: list[GreenCorridor] = []
        total_badges = 0

        for cluster in clusters:
            corridor, badges_given = await self._persist_corridor(cluster)
            if corridor is not None:
                new_corridors.append(corridor)
                total_badges += badges_given

        duration = round(time.perf_counter() - t_start, 3)

        # Collect unique ward names audited
        wards_audited = len({p.ward_id for p in all_points})

        log.info(
            "corridor.audit_complete",
            corridors=len(new_corridors),
            badges=total_badges,
            duration_s=duration,
        )

        return CorridorAuditResult(
            wards_audited=wards_audited,
            new_corridors_detected=len(new_corridors),
            badges_awarded=total_badges,
            corridors=new_corridors,
            audit_duration_seconds=duration,
        )

    # ── Per-cluster persistence ────────────────────────────────────────────────

    async def _persist_corridor(
        self, cluster: list[_SpotPoint]
    ) -> tuple[GreenCorridor | None, int]:
        """
        Writes (or updates) one corridor document and awards the
        Corridor Creator badge to all unique contributors.

        Returns (GreenCorridor, badges_awarded_count).
        Returns (None, 0) if Firestore write fails — audit continues.
        """
        now = datetime.now(UTC)
        centroid = _cluster_centroid(cluster)
        contributor_uids = list({p.user_id for p in cluster if p.user_id})

        # Stable corridor_id based on centroid grid cell (prevents duplication
        # on re-runs for the same geographic area).
        grid_key = (
            f"{round(centroid.latitude, 3)}_{round(centroid.longitude, 3)}"
        )
        corridor_id = f"corridor_{grid_key.replace('.', 'd').replace('-', 'n')}"

        ward_name = cluster[0].ward_name   # All points in same general area
        ward_id = cluster[0].ward_id

        corridor = GreenCorridor(
            corridor_id=corridor_id,
            ward_name=ward_name,
            ward_id=ward_id,
            centre_coordinates=centroid,
            radius_m=self._settings.corridor_radius_m,
            verified_tree_count=len(cluster),
            status=CorridorStatus.ACTIVE,
            contributor_user_ids=contributor_uids,
            badge_awarded=_CORRIDOR_BADGE,
            detected_at=now,
            last_audited=now,
        )

        try:
            batch = self._db.batch()

            # Write corridor document
            corridor_ref = (
                self._db.collection(Collections.GREEN_CORRIDORS)
                .document(corridor_id)
            )
            batch.set(
                corridor_ref,
                {
                    **corridor.model_dump(),
                    "centre_coordinates": _to_geopoint(centroid),
                    "last_audited": now,
                },
                merge=True,
            )

            # Update ward_heat_data with corridor status
            ward_ref = (
                self._db.collection(Collections.WARD_HEAT_DATA)
                .document(ward_id)
            )
            batch.update(
                ward_ref,
                {
                    FirestoreFields.CORRIDOR_STATUS: CorridorStatus.ACTIVE.value,
                    FirestoreFields.CORRIDOR_ID: corridor_id,
                    FirestoreFields.LAST_UPDATED: now,
                },
            )

            await batch.commit()

            # Award badges individually (separate batch for each user to
            # avoid exceeding Firestore batch limit of 500 operations)
            badges_given = await self._award_corridor_badges(
                contributor_uids, corridor_id
            )

            log.info(
                "corridor.persisted",
                corridor_id=corridor_id,
                ward=ward_name,
                trees=len(cluster),
                contributors=len(contributor_uids),
                badges=badges_given,
            )

            return corridor, badges_given

        except Exception as exc:
            log.error(
                "corridor.persist_failed",
                corridor_id=corridor_id,
                error=str(exc),
            )
            return None, 0

    # ── Badge awarding ─────────────────────────────────────────────────────────

    async def _award_corridor_badges(
        self, user_ids: list[str], corridor_id: str
    ) -> int:
        """
        Awards the "Corridor Creator" badge and bonus Green Points
        to each contributing user who doesn't already have the badge.

        Uses array-union so existing badges are preserved.
        Returns the number of users newly awarded.
        """
        from google.cloud.firestore_v1.transforms import ArrayUnion, INCREMENT

        awarded = 0
        points_bonus = self._settings.points_corridor_badge

        for uid in user_ids:
            try:
                user_ref = (
                    self._db.collection(Collections.USERS).document(uid)
                )
                user_doc = await user_ref.get()
                if not user_doc.exists:
                    continue

                existing_badges: list[str] = (
                    user_doc.to_dict() or {}
                ).get(FirestoreFields.BADGES, [])

                if _CORRIDOR_BADGE in existing_badges:
                    log.debug(
                        "corridor.badge_already_held",
                        uid=uid,
                        badge=_CORRIDOR_BADGE,
                    )
                    continue

                await user_ref.update(
                    {
                        FirestoreFields.BADGES: ArrayUnion([_CORRIDOR_BADGE]),
                        FirestoreFields.TOTAL_GREEN_POINTS: INCREMENT(points_bonus),
                        "corridor_contributor_ids": ArrayUnion([corridor_id]),
                        FirestoreFields.LAST_UPDATED: datetime.now(UTC),
                    }
                )
                awarded += 1
                log.info(
                    "corridor.badge_awarded",
                    uid=uid,
                    badge=_CORRIDOR_BADGE,
                    points=points_bonus,
                )

            except Exception as exc:
                log.error(
                    "corridor.badge_award_failed",
                    uid=uid,
                    error=str(exc),
                )

        return awarded

    # ── Single-ward query ──────────────────────────────────────────────────────

    async def get_ward_corridors(self, ward_id: str) -> list[GreenCorridor]:
        """
        Returns all active corridors for a specific ward.
        Used by the heat-map detail view.
        """
        corridors: list[GreenCorridor] = []
        query = (
            self._db.collection(Collections.GREEN_CORRIDORS)
            .where(filter=_where("ward_id", "==", ward_id))
            .where(filter=_where("status", "==", CorridorStatus.ACTIVE.value))
        )

        async for doc in query.stream():
            data = doc.to_dict() or {}
            # Convert GeoPoint back to Coordinates
            geo = data.get("centre_coordinates")
            if geo:
                data["centre_coordinates"] = {
                    "latitude": geo.latitude,
                    "longitude": geo.longitude,
                }
            try:
                corridors.append(GreenCorridor(**data))
            except Exception as exc:
                log.warning(
                    "corridor.deserialise_error",
                    doc_id=doc.id,
                    error=str(exc),
                )

        return corridors


# ── Private helpers ────────────────────────────────────────────────────────────

def _where(field: str, op: str, value):
    from google.cloud.firestore_v1.base_query import FieldFilter
    return FieldFilter(field, op, value)


def _to_geopoint(coords: Coordinates):
    from google.cloud.firestore import GeoPoint
    return GeoPoint(coords.latitude, coords.longitude)


def _ward_id_from_name(ward_name: str) -> str:
    return ward_name.lower().replace(" ", "_")
