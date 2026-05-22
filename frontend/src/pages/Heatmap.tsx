import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Thermometer, Leaf, Loader2, AlertTriangle, Flame, Satellite, Zap, BarChart3, MapPin, X } from 'lucide-react';
import { ALL_WARDS, BENGALURU_WARDS, getWardRisk } from '../data/bengaluruWards';
import { api } from '../api';
import { MapSkeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';

const RISK_CFG = {
  low:      { color: '#22c55e', label: 'Low Risk', Icon: Leaf },
  moderate: { color: '#f59e0b', label: 'Moderate', Icon: Thermometer },
  high:     { color: '#f97316', label: 'High Risk', Icon: Flame },
  critical: { color: '#ef4444', label: 'Critical', Icon: AlertTriangle },
};

// Deterministic fallback (instant, always works)
const FALLBACK_WARDS = ALL_WARDS.map(w => ({ ...w, ...getWardRisk(w) }));

// Map API ward to display format
function apiWardToDisplay(apiW) {
  const level = apiW.heat_risk_level || apiW.heat_risk_score > 75 ? 'critical'
    : apiW.heat_risk_score > 55 ? 'high'
    : apiW.heat_risk_score > 35 ? 'moderate' : 'low';
  return {
    id: apiW.ward_id,
    name: apiW.ward_name,
    lat: ALL_WARDS.find(w => w.id === apiW.ward_id)?.lat || 12.9716,
    lng: ALL_WARDS.find(w => w.id === apiW.ward_id)?.lng || 77.5946,
    lst: apiW.avg_land_surface_temp,
    ndvi: apiW.avg_ndvi,
    score: apiW.heat_risk_score,
    level: typeof apiW.heat_risk_level === 'string' ? apiW.heat_risk_level : level,
    adopted: apiW.adopted_spots_count || 0,
    isReal: true,
  };
}


export default function Heatmap() {
  const [wardsData, setWardsData]   = useState(FALLBACK_WARDS);
  const [filter, setFilter]         = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [search, setSearch]         = useState('');
  const [showAll, setShowAll]       = useState(false);
  const [selectedWard, setSelected] = useState(null);
  const [apiStatus, setApiStatus]   = useState('loading'); // 'loading' | 'real' | 'fallback'
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled && apiStatus === 'loading') setApiStatus('fallback');
    }, 12000); // 12s timeout before giving up

    api.getHeatmap()
      .then(resp => {
        if (cancelled) return;
        const apiWards = (resp.wards || []).map(apiWardToDisplay);
        if (apiWards.length > 0) {
          // Merge: use real data where available, keep fallback for the rest
          const realMap = Object.fromEntries(apiWards.map(w => [w.id, w]));
          setWardsData(FALLBACK_WARDS.map(fw => realMap[fw.id] || fw));
          setApiStatus('real');
        } else {
          setApiStatus('fallback');
        }
      })
      .catch(() => { if (!cancelled) { setApiStatus('fallback'); showToast('Using offline heatmap data', 'warning'); } })
      .finally(() => clearTimeout(timeout));

    return () => { cancelled = true; clearTimeout(timeout); };
  }, []);

  const ALL_WARDS_DATA = wardsData;

  const cityFiltered = cityFilter === 'all' ? ALL_WARDS_DATA : ALL_WARDS_DATA.filter(w => w.city === cityFilter);

  const filtered = cityFiltered.filter(w => {
    const matchFilter = filter === 'all' || w.level === filter;
    const matchSearch = w.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const displayed = showAll ? filtered : filtered.slice(0, 12);

  const stats = {
    critical: cityFiltered.filter(w => w.level === 'critical').length,
    high:     cityFiltered.filter(w => w.level === 'high').length,
    moderate: cityFiltered.filter(w => w.level === 'moderate').length,
    low:      cityFiltered.filter(w => w.level === 'low').length,
    avgLst:   (cityFiltered.reduce((s, w) => s + w.lst, 0) / (cityFiltered.length || 1)).toFixed(1),
    total:    cityFiltered.length,
  };
  const selectedCfg = selectedWard ? RISK_CFG[selectedWard.level] : null;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 className="text-gradient-warm" style={{ fontSize: '2.5rem', marginBottom: '0.4rem', fontFamily: 'Outfit, sans-serif', fontWeight: 800 }}>
          Karnataka Heat Map
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          {stats.total} wards · Urban Heat Island analysis · Google Earth Engine
        </p>

        {/* City filter pills */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          {['all', 'Bengaluru', 'Mysuru', 'Mandya'].map(city => (
            <button key={city} onClick={() => setCityFilter(city)} style={{
              padding: '0.35rem 1rem', borderRadius: '999px', border: '1px solid',
              borderColor: cityFilter === city ? 'var(--accent-green)' : 'var(--glass-border)',
              background: cityFilter === city ? 'rgba(34,197,94,0.15)' : 'transparent',
              color: cityFilter === city ? 'var(--accent-green)' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'Outfit, sans-serif',
              transition: 'all 0.2s',
            }}>
              {city === 'all' ? `All (${ALL_WARDS.length})` : city}
            </button>
          ))}
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.9rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600,
          background: apiStatus === 'real' ? 'rgba(34,197,94,0.1)' : apiStatus === 'loading' ? 'rgba(255,255,255,0.04)' : 'rgba(245,158,11,0.08)',
          border: `1px solid ${apiStatus === 'real' ? 'rgba(34,197,94,0.25)' : apiStatus === 'loading' ? 'rgba(255,255,255,0.08)' : 'rgba(245,158,11,0.25)'}`,
          color: apiStatus === 'real' ? 'var(--accent-green)' : apiStatus === 'loading' ? 'var(--text-secondary)' : '#f59e0b',
        }}>
          {apiStatus === 'loading' && <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Loading GEE data…</>}
          {apiStatus === 'real'    && <><Satellite size={12} /> Live GEE Data</>}
          {apiStatus === 'fallback'&& <><Zap size={12} /> Fast Mode — Deterministic model</>}
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Avg Temperature', value: `${stats.avgLst}°C`, color: '#f97316', Icon: Thermometer },
          { label: 'Critical', value: stats.critical, color: '#ef4444', Icon: AlertTriangle },
          { label: 'High Risk', value: stats.high, color: '#f97316', Icon: Flame },
          { label: 'Moderate', value: stats.moderate, color: '#f59e0b', Icon: Thermometer },
          { label: 'Low Risk', value: stats.low, color: '#22c55e', Icon: Leaf },
          { label: 'Total Wards', value: stats.total, color: 'var(--accent-green)', Icon: BarChart3 },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="glass-panel" style={{ padding: '0.85rem', textAlign: 'center', borderTop: `3px solid ${color}` }}>
            <div style={{ marginBottom: '0.3rem' }}><Icon size={15} color={color} /></div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color, fontFamily: 'Outfit, sans-serif' }}>{value}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* MAP */}
      <div className="heatmap-container" style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', marginBottom: '1.5rem', height: '540px' }}>
        {/* Vignette overlay */}
        <div className="map-vignette" />
        <MapContainer
          center={[12.6, 77.1]}
          zoom={9}
          style={{ height: '100%', width: '100%', background: '#040d08' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
            opacity={0.45}
          />
          {cityFiltered.map(ward => {
            const cfg = RISK_CFG[ward.level];
            const isSelected = selectedWard?.id === ward.id;
            const isFiltered = filter === 'all' || filter === ward.level;
            // Small core dots: critical=10, high=8, moderate=6, low=5
            const coreSize = ward.level === 'critical' ? 10 : ward.level === 'high' ? 8 : ward.level === 'moderate' ? 6 : 5;
            const size = isFiltered ? coreSize : 3;
            const color = cfg.color;

            const icon = L.divIcon({
              className: '',
              iconSize: [size, size],
              iconAnchor: [size / 2, size / 2],
              html: `<div class="sat-light ${ward.level === 'critical' && isFiltered ? 'sat-light--pulse' : ''} ${isSelected ? 'sat-light--selected' : ''}" style="
                width: ${size}px;
                height: ${size}px;
                opacity: ${isFiltered ? 1 : 0.15};
                background: radial-gradient(circle, #fff 0%, ${color} 50%, ${color}00 100%);
                box-shadow: 0 0 ${size * 2}px ${color}, 0 0 ${size * 4}px ${color}88, 0 0 ${size * 6}px ${color}33;
              "></div>`,
            });

            return (
              <Marker
                key={ward.id}
                position={[ward.lat, ward.lng]}
                icon={icon}
                eventHandlers={{ click: () => setSelected(ward) }}
              >
                <Tooltip direction="top" offset={[0, -(size / 2 + 6)]} opacity={0.97}>
                  <div style={{ fontSize: '12px', padding: '4px 6px', lineHeight: 1.5 }}>
                    <strong style={{ fontSize: '13px' }}>{ward.name}</strong><br />
                    <span style={{ color }}>{cfg.label}</span> · <strong>{ward.score}/100</strong><br />
                    🌡️ {ward.lst}°C · 🌿 NDVI {ward.ndvi}
                  </div>
                </Tooltip>
              </Marker>
            );
          })}
        </MapContainer>
        {/* Floating legend inside map */}
        <div className="map-legend">
          {Object.entries(RISK_CFG).map(([key, cfg]) => (
            <div key={key} className="map-legend__item" onClick={() => setFilter(filter === key ? 'all' : key)} style={{ opacity: filter === 'all' || filter === key ? 1 : 0.4, cursor: 'pointer' }}>
              <span className="map-legend__dot" style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.color}88` }} />
              <span>{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected ward detail */}
      {selectedWard && (
        <div className="glass-panel" style={{
          marginBottom: '1.5rem', padding: '1.25rem',
          border: `1px solid ${selectedCfg.color}55`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedWard.id}</div>
            <h3 style={{ margin: '0.25rem 0' }}>{selectedWard.name}</h3>
            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: selectedCfg.color + '22', color: selectedCfg.color }}>
              <selectedCfg.Icon size={12} style={{ marginRight: 4 }} /> {selectedCfg.label}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {[
              { label: 'LST', value: `${selectedWard.lst}°C`, Icon: Thermometer },
              { label: 'NDVI', value: selectedWard.ndvi, Icon: Leaf },
              { label: 'Heat Score', value: `${selectedWard.score}/100`, Icon: BarChart3 },
              { label: 'Coords', value: `${selectedWard.lat.toFixed(4)}, ${selectedWard.lng.toFixed(4)}`, Icon: MapPin },
            ].map(({ label, value, Icon }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Icon size={11} /> {label}
                </div>
                <div style={{ fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}><X size={18} /></button>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {Object.entries(RISK_CFG).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilter(filter === key ? 'all' : key)} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem',
            borderRadius: '999px', border: `1px solid ${cfg.color}55`, cursor: 'pointer',
            background: filter === key ? cfg.color + '33' : 'transparent',
            color: filter === key ? cfg.color : 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600,
          }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
            <cfg.Icon size={13} /> {cfg.label}
          </button>
        ))}
        <button onClick={() => setFilter('all')} style={{
          marginLeft: 'auto', padding: '0.4rem 1rem', borderRadius: '999px',
          border: '1px solid var(--glass-border)', background: filter === 'all' ? 'var(--accent-green)' : 'transparent',
          color: filter === 'all' ? '#000' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
        }}>Show All</button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.25rem' }}>
        <input
          type="text"
          placeholder="Search ward name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: '320px' }}
        />
      </div>

      {/* Ward cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {displayed.map(ward => {
          const cfg = RISK_CFG[ward.level];
          return (
            <div
              key={ward.id}
              className="glass-panel"
              onClick={() => setSelected(ward)}
              style={{ padding: '1rem', border: `1px solid ${cfg.color}33`, cursor: 'pointer', transition: 'transform 0.15s', borderTop: `4px solid ${cfg.color}` }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'Outfit, sans-serif' }}>{ward.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{ward.id}</div>
                </div>
                <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: cfg.color + '22', color: cfg.color, fontWeight: 600 }}>
                  <cfg.Icon size={12} />
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                <div><div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>LST</div><strong style={{ color: cfg.color }}>{ward.lst}°C</strong></div>
                <div><div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>NDVI</div><strong>{ward.ndvi}</strong></div>
                <div><div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>Score</div><strong>{ward.score}/100</strong></div>
              </div>
              {/* Heat score bar */}
              <div style={{ marginTop: '0.75rem', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px' }}>
                <div style={{ height: '100%', width: `${ward.score}%`, background: cfg.color, borderRadius: '2px', transition: 'width 0.6s' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* See All / Show Less */}
      {filtered.length > 12 && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            onClick={() => setShowAll(!showAll)}
            className="btn-primary"
            style={{ width: 'auto', padding: '0.75rem 2.5rem' }}
          >
            {showAll ? 'Show Less' : `See All ${filtered.length} Wards`}
          </button>
        </div>
      )}

      <style>{`
        /* ── Map Container ─────────────────────────── */
        .heatmap-container {
          border: 1px solid rgba(34, 197, 94, 0.1);
          box-shadow:
            0 0 80px rgba(0, 0, 0, 0.6),
            inset 0 0 100px rgba(0, 0, 0, 0.4);
        }

        /* Vignette: dark edges for space-view */
        .map-vignette {
          position: absolute;
          inset: 0;
          z-index: 401;
          pointer-events: none;
          background: radial-gradient(ellipse at center, transparent 50%, rgba(2, 6, 4, 0.6) 85%, rgba(2, 6, 4, 0.85) 100%);
          border-radius: 20px;
        }

        /* ── Satellite Light Dots ─────────────────── */
        .sat-light {
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.2s ease, opacity 0.3s ease;
        }

        .sat-light:hover {
          transform: scale(1.6);
        }

        .sat-light--selected {
          outline: 2px solid rgba(255, 255, 255, 0.8);
          outline-offset: 2px;
          transform: scale(1.4);
        }

        .sat-light--pulse {
          animation: satPulse 2s ease-in-out infinite;
        }

        @keyframes satPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }

        /* ── Floating Legend ────────────────────────── */
        .map-legend {
          position: absolute;
          bottom: 16px;
          left: 16px;
          z-index: 500;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px 14px;
          background: rgba(2, 6, 4, 0.9);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }

        .map-legend__item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.72rem;
          font-weight: 600;
          color: #cbd5e1;
          transition: opacity 0.2s;
          padding: 2px 0;
        }

        .map-legend__item:hover {
          opacity: 1 !important;
        }

        .map-legend__dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
          flex-shrink: 0;
        }

        /* ── Leaflet Overrides ─────────────────────── */
        .leaflet-container {
          font-family: 'Inter', sans-serif;
          background: #020604 !important;
        }

        .leaflet-tooltip {
          background: rgba(2, 6, 4, 0.95) !important;
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          color: #e2e8f0 !important;
          border-radius: 12px !important;
          padding: 10px 14px !important;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6), 0 0 30px rgba(34, 197, 94, 0.06) !important;
          font-family: 'Inter', sans-serif !important;
          line-height: 1.5;
        }

        .leaflet-tooltip::before {
          display: none !important;
        }

        .leaflet-control-zoom {
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 10px !important;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5) !important;
        }

        .leaflet-control-zoom a {
          background: rgba(2, 6, 4, 0.92) !important;
          color: rgba(255, 255, 255, 0.5) !important;
          border-color: rgba(255, 255, 255, 0.06) !important;
          width: 34px !important;
          height: 34px !important;
          line-height: 34px !important;
          font-size: 16px !important;
          transition: all 0.2s;
        }

        .leaflet-control-zoom a:hover {
          background: rgba(255, 255, 255, 0.06) !important;
          color: rgba(255, 255, 255, 0.8) !important;
        }

        /* Remove default leaflet marker shadows */
        .leaflet-marker-icon {
          background: none !important;
          border: none !important;
        }

        .leaflet-control-attribution {
          background: rgba(2, 6, 4, 0.75) !important;
          color: rgba(255, 255, 255, 0.2) !important;
          font-size: 10px !important;
          border-radius: 6px 0 0 0 !important;
        }

        .leaflet-control-attribution a {
          color: rgba(255, 255, 255, 0.3) !important;
        }

        @media (max-width: 640px) {
          .heatmap-container {
            height: 380px !important;
          }
          .map-legend {
            bottom: 8px;
            left: 8px;
            padding: 6px 10px;
          }
        }
      `}</style>
    </div>
  );
}
