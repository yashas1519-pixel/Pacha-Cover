// ============================================================
// Centralized API Client — typed, uses Google OAuth token from AuthContext
// ============================================================

const API_BASE = '/api/v1';

// ── Type Definitions ───────────────────────────────────────────────────────────

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface TreeSpecies {
  common_name: string;
  scientific_name: string;
  kannada_name: string;
  why_recommended: string;
  expected_canopy_spread_m: number;
  water_requirement: string;
  growth_rate: string;
  co2_absorption_kg_per_year: number;
  rotary_focus: string;
}

export interface PrescriptionResponse {
  primary_recommendation: TreeSpecies;
  alternative_recommendations: TreeSpecies[];
  coordinates: Coordinates;
  gemini_model_used: string;
  soil_analysis: Record<string, unknown> | null;
}

export interface VerificationResponse {
  status: string;
  confidence_score: number;
  detected_labels: string[];
  message: string;
}

export interface WardHeatData {
  ward_id: string;
  ward_name: string;
  avg_land_surface_temp: number;
  avg_ndvi: number;
  green_cover_percent: number;
  heat_risk_score: number;
  heat_risk_level: string;
  adopted_spots_count: number;
}

export interface CarbonCreditRequest {
  species_common_name: string;
  species_scientific_name?: string;
  tree_age_years: number;
  num_trees: number;
  property_value_inr?: number;
}

export interface CarbonCreditResponse {
  species_common_name: string;
  num_trees: number;
  total_annual_co2_kg: number;
  cumulative_co2_kg_lifetime: number;
  carbon_credit_value_inr: number;
  tax_rebate: {
    rebate_percent: number;
    rebate_amount_inr: number | null;
    rebate_calculation_note: string;
  };
  gemini_narrative: string;
  annual_profile: Array<{
    year: number;
    co2_kg_sequestered: number;
    cumulative_co2_kg: number;
  }>;
}

export interface AdoptSpotPayload {
  coordinates: Coordinates;
  spot_name: string;
  ward_name: string;
  species_common_name: string;
  species_scientific_name?: string;
  notes?: string;
  is_public?: boolean;
}

export interface AdoptSpotOut {
  spot_id: string;
  user_id: string;
  coordinates: Coordinates;
  spot_name: string;
  ward_name: string;
  species_common_name: string;
  status: string;
  green_points_earned: number;
  verification_count: number;
  adopted_at: string;
}

export interface LeaderboardEntry {
  uid: string;
  name: string;
  email: string;
  total_green_points: number;
  picture: string;
}

// ── Auth helper ────────────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem('pacha_token') || null;
}

// ── Fetch wrapper ──────────────────────────────────────────────────────────────

async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const defaultHeaders: Record<string, string> = {
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...defaultHeaders, ...(options.headers as Record<string, string>) },
  });
  
  if (response.status === 401) {
    // Token is likely expired. Auto-logout the user.
    localStorage.removeItem('pacha_token');
    localStorage.removeItem('pacha_user');
    window.location.href = '/login';
    throw new Error("Session expired. Redirecting to login...");
  }
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { detail?: string }).detail || `API Error: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

// ── API object ─────────────────────────────────────────────────────────────────

export const api = {
  // ── Prescription ──────────────────────────────────────────────────────────
  prescribe: async (data: { coordinates: Coordinates; ward_name?: string; soil_type?: string; nearby_land_use?: string; plot_area_sqm?: number }): Promise<PrescriptionResponse> =>
    fetchWithAuth<PrescriptionResponse>('/prescribe', { method: 'POST', body: JSON.stringify(data) }),

  chatPrescribe: async (payload: {
    messages: { role: string; content: string }[];
    coordinates: Coordinates;
    ward_name?: string;
  }): Promise<{ is_complete: boolean; reply: string; prescription: PrescriptionResponse | null }> =>
    fetchWithAuth('/prescribe/chat', { method: 'POST', body: JSON.stringify(payload) }),

  getIntelligenceAlerts: async (): Promise<any[]> => {
    const data = await fetchWithAuth<{ success: boolean; data: any[] }>('/intelligence/alerts', { method: 'GET' });
    return data.data;
  },

  // ── Verification ──────────────────────────────────────────────────────────
  verifyImage: async (imageFile: File): Promise<VerificationResponse> => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return fetchWithAuth<VerificationResponse>('/verify-image', { method: 'POST', body: formData });
  },

  verifyGrowth: async ({ spotId, imageFile }: { spotId: string; imageFile: File }): Promise<VerificationResponse> => {
    const formData = new FormData();
    formData.append('spot_id', spotId);
    formData.append('image', imageFile);
    return fetchWithAuth<VerificationResponse>('/verify-growth', { method: 'POST', body: formData });
  },

  // ── Green Ledger / Firestore ──────────────────────────────────────────────
  adoptSpot: async (data: AdoptSpotPayload): Promise<AdoptSpotOut> =>
    fetchWithAuth<AdoptSpotOut>('/ledger/adopt', { method: 'POST', body: JSON.stringify(data) }),

  getMySpots: async (): Promise<AdoptSpotOut[]> =>
    fetchWithAuth<AdoptSpotOut[]>('/ledger/my-spots', { method: 'GET' }),

  getCommunitySpots: async (wardName?: string): Promise<AdoptSpotOut[]> =>
    fetchWithAuth<AdoptSpotOut[]>(`/ledger/community${wardName ? `?ward_name=${wardName}` : ''}`, { method: 'GET' }),

  getLeaderboard: async (limit: number = 5): Promise<LeaderboardEntry[]> =>
    fetchWithAuth<LeaderboardEntry[]>(`/ledger/leaderboard?limit=${limit}`, { method: 'GET' }),

  getWardCorridors: async (wardId: string): Promise<unknown> =>
    fetchWithAuth<unknown>(`/corridors/ward/${wardId}`, { method: 'GET' }),

  getCommunities: async (limit: number = 50): Promise<unknown> =>
    fetchWithAuth<unknown>(`/communities?limit=${limit}`, { method: 'GET' }),

  getCommunityLeaderboard: async (limit: number = 10): Promise<unknown> =>
    fetchWithAuth<unknown>(`/communities/leaderboard?limit=${limit}`, { method: 'GET' }),

  // ── Heatmap ───────────────────────────────────────────────────────────────
  getHeatmap: async (): Promise<{ wards: WardHeatData[]; total_wards: number; generated_at: string }> => fetchWithAuth<{ wards: WardHeatData[]; total_wards: number; generated_at: string }>('/heatmap', { method: 'GET' }),

  // ── Carbon Simulator ─────────────────────────────────────────────────────
  simulateCarbon: async (data: CarbonCreditRequest): Promise<CarbonCreditResponse> =>
    fetchWithAuth<CarbonCreditResponse>('/carbon/simulate', { method: 'POST', body: JSON.stringify(data) }),
};
