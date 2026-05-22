import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, TreePine, Droplets, Wind, CheckCircle, Leaf, Thermometer, FlaskConical, Boxes, Sprout, ChartColumn, TestTube2, Send } from 'lucide-react';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';

// ── JS-side multi-city ward soil lookup (mirrors the backend table) ──
const WARD_SOIL_TABLE = [
  {
    zone: 'south', city: 'Bengaluru', texture: 'Sandy Clay Loam', pH: 6.8,
    organic_carbon_pct: 0.52, nitrogen_kg_ha: 215, soil_health_index: 62,
    lat: [12.88, 12.95], lng: [77.60, 77.66],
  },
  {
    zone: 'east', city: 'Bengaluru', texture: 'Red Laterite', pH: 7.1,
    organic_carbon_pct: 0.38, nitrogen_kg_ha: 185, soil_health_index: 55,
    lat: [12.93, 13.00], lng: [77.70, 77.78],
  },
  {
    zone: 'north', city: 'Bengaluru', texture: 'Loamy', pH: 6.5,
    organic_carbon_pct: 0.61, nitrogen_kg_ha: 240, soil_health_index: 70,
    lat: [13.00, 13.12], lng: [77.55, 77.62],
  },
  {
    zone: 'central', city: 'Bengaluru', texture: 'Clay', pH: 7.3,
    organic_carbon_pct: 0.41, nitrogen_kg_ha: 178, soil_health_index: 52,
    lat: [12.97, 13.02], lng: [77.60, 77.64],
  },
  {
    zone: 'southeast', city: 'Bengaluru', texture: 'Black Cotton', pH: 6.3,
    organic_carbon_pct: 0.70, nitrogen_kg_ha: 268, soil_health_index: 74,
    lat: [12.82, 12.90], lng: [77.65, 77.72],
  },
  {
    zone: 'central', city: 'Mysuru', texture: 'Red Sandy Loam', pH: 6.6,
    organic_carbon_pct: 0.55, nitrogen_kg_ha: 225, soil_health_index: 65,
    lat: [12.29, 12.33], lng: [76.63, 76.67],
  },
];

function detectSoilLocally(lat: number, lng: number) {
  for (const z of WARD_SOIL_TABLE) {
    if (lat >= z.lat[0] && lat <= z.lat[1] && lng >= z.lng[0] && lng <= z.lng[1]) {
      return z;
    }
  }
  let best = WARD_SOIL_TABLE[0];
  let bestDist = Infinity;
  for (const z of WARD_SOIL_TABLE) {
    const cLat = (z.lat[0] + z.lat[1]) / 2;
    const cLng = (z.lng[0] + z.lng[1]) / 2;
    const d = Math.sqrt((lat - cLat) ** 2 + (lng - cLng) ** 2);
    if (d < bestDist) { bestDist = d; best = z; }
  }
  return best;
}

export default function Prescribe() {
  const [locationStatus, setLocationStatus] = useState('detecting');
  const [loadingAI, setLoadingAI] = useState(false);
  const [coords, setCoords] = useState({ latitude: null, longitude: null });
  const [wardName, setWardName] = useState('');
  const [localSoil, setLocalSoil] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const { showToast } = useToast();
  
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('error');
      setError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoords({ latitude: lat, longitude: lng });

        const soil = detectSoilLocally(lat, lng);
        setLocalSoil(soil);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const geo = await res.json();
          const ward =
            geo.address?.suburb ||
            geo.address?.neighbourhood ||
            geo.address?.county ||
            geo.address?.city_district || '';
          setWardName(ward);
        } catch { /* ignore */ }

        setLocationStatus('ready');
        setMessages([
          { role: 'model', content: "Hi! I've grabbed your soil and climate info based on your location. Tell me a bit about the spot where you want to plant a tree! (e.g., 'It's a 3x3 corner plot, gets a lot of sun, right by a road')" }
        ]);
      },
      () => {
        setLocationStatus('error');
        setError('Location access denied. Please allow GPS and reload.');
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, []);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !coords.latitude) return;
    
    const newMessages = [...messages, { role: 'user', content: chatInput }];
    setMessages(newMessages);
    setChatInput('');
    setLoadingAI(true);
    
    try {
      const data = await api.chatPrescribe({
        messages: newMessages,
        coordinates: coords,
        ward_name: wardName,
      });
      
      setMessages([...newMessages, { role: 'model', content: data.reply }]);
      if (data.is_complete && data.prescription) {
        setResult(data.prescription);
        showToast(`Recommended: ${data.prescription.primary_recommendation?.common_name}`, 'success');
      }
    } catch (err: any) {
      setError(err.message);
      showToast(err.message || 'Chat failed', 'error');
    } finally {
      setLoadingAI(false);
    }
  };

  const navigate = useNavigate();
  const displaySoil = result?.soil_analysis?.soil || localSoil;

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', marginBottom: '1rem' }}>
          <TreePine size={28} color="var(--accent-green)" />
        </div>
        <h2 className="text-gradient-green" style={{ fontSize: '2.5rem', marginBottom: '0.4rem', fontFamily: 'Outfit, sans-serif', fontWeight: 800 }}>
          Conversational Assistant
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Chat with our AI Arborist to get the perfect tree recommendation
        </p>
      </div>

      <div className="glass-panel" style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        padding: '1rem 1.5rem', marginBottom: '1.5rem',
        border: `1px solid ${locationStatus === 'ready' ? 'var(--accent-green)' : locationStatus === 'error' ? '#ef4444' : 'var(--glass-border)'}`,
      }}>
        {locationStatus === 'detecting' && (
          <><Loader2 size={20} color="var(--accent-green)" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          <span>Detecting your location…</span></>
        )}
        {locationStatus === 'ready' && (
          <><CheckCircle size={20} color="var(--accent-green)" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ color: 'var(--accent-green)' }}>Location Detected</strong>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {coords.latitude?.toFixed(5)}, {coords.longitude?.toFixed(5)}
              {wardName && ` · ${wardName}`}
            </div>
          </div></>
        )}
        {locationStatus === 'error' && (
          <><MapPin size={20} color="#ef4444" style={{ flexShrink: 0 }} />
          <span style={{ color: '#ef4444' }}>{error}</span></>
        )}
      </div>

      {localSoil && locationStatus === 'ready' && !result && (
        <div className="glass-panel" style={{
          marginBottom: '1.5rem', padding: '1rem 1.5rem',
          border: '1px solid rgba(34,197,94,0.25)',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem'
        }}>
          {[
            { label: 'Soil Type', value: localSoil.texture, Icon: Sprout },
            { label: 'pH', value: localSoil.pH, Icon: FlaskConical },
            { label: 'Organic Carbon', value: `${localSoil.organic_carbon_pct}%`, Icon: Leaf },
            { label: 'Nitrogen', value: `${localSoil.nitrogen_kg_ha} kg/ha`, Icon: TestTube2 },
            { label: 'Health Index', value: `${localSoil.soil_health_index}/100`, Icon: ChartColumn },
          ].map(({ label, value, Icon }) => (
            <div key={label} style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '12px', borderLeft: '3px solid rgba(34,197,94,0.4)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                <Icon size={11} color="var(--accent-green)" /> {label}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'Outfit, sans-serif' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chat Interface */}
      {!result && locationStatus === 'ready' && (
        <div className="glass-panel" style={{ marginBottom: '2rem', padding: '1rem', display: 'flex', flexDirection: 'column', height: '400px' }}>
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? 'var(--accent-green)' : 'rgba(255,255,255,0.05)',
                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                padding: '0.75rem 1rem',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                maxWidth: '80%',
                lineHeight: 1.5,
                border: msg.role === 'model' ? '1px solid var(--glass-border)' : 'none',
              }}>
                {msg.content}
              </div>
            ))}
            {loadingAI && (
              <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '18px 18px 18px 4px', border: '1px solid var(--glass-border)' }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} color="var(--accent-green)" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Describe the spot..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              style={{ flex: 1, padding: '0.85rem 1rem', borderRadius: '999px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none' }}
              disabled={loadingAI}
            />
            <button type="submit" disabled={loadingAI || !chatInput.trim()} style={{
              background: 'var(--accent-green)', color: '#fff', border: 'none', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: loadingAI || !chatInput.trim() ? 0.5 : 1
            }}>
              <Send size={18} style={{ marginLeft: '2px' }} />
            </button>
          </form>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease-out' }}>
          <div className="glass-panel" style={{ border: '1px solid rgba(34,197,94,0.3)', overflow: 'hidden', padding: 0 }}>
            <div style={{ padding: '1.5rem 1.75rem', background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.05))', borderBottom: '1px solid rgba(34,197,94,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(34,197,94,0.15)', padding: '0.85rem', borderRadius: '16px', flexShrink: 0, border: '1px solid rgba(34,197,94,0.25)' }}>
                  <TreePine size={30} color="var(--accent-green)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.2rem' }}>🌿 Primary Recommendation</div>
                  <h3 style={{ fontSize: '1.6rem', margin: 0, fontFamily: 'Outfit, sans-serif' }}>{result.primary_recommendation?.common_name}</h3>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic', fontSize: '0.9rem' }}>
                    {result.primary_recommendation?.scientific_name}
                  </p>
                </div>
              </div>
            </div>
            <div style={{ padding: '1.5rem 1.75rem' }}>

            {displaySoil && (
              <div style={{
                background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem',
                fontSize: '0.875rem', color: 'var(--text-secondary)'
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Sprout size={13} color="var(--accent-green)" /> Recommended for <strong style={{ color: 'var(--text-primary)' }}>{displaySoil.texture}</strong> soil ·
                </span>
                pH {displaySoil.pH} · Nitrogen {displaySoil.nitrogen_kg_ha} kg/ha
              </div>
            )}

            <p style={{ fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              {result.primary_recommendation?.why_recommended}
            </p>

            <button
              onClick={() => navigate(`/ar?species=${encodeURIComponent(result.primary_recommendation?.common_name || '')}`)}
              style={{
                width: '100%', marginTop: '1rem', padding: '0.85rem',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,185,129,0.08))',
                border: '1px solid var(--accent-green)', borderRadius: '12px',
                color: 'var(--accent-green)', cursor: 'pointer', fontWeight: 700,
                fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              <Boxes size={18} /> View {result.primary_recommendation?.common_name} in 3D / AR
            </button>
            </div>
          </div>

          {result.alternative_recommendations?.length > 0 && (
            <div>
              <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Also Consider</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                {result.alternative_recommendations.map((alt, i) => (
                  <div key={i} className="glass-panel" style={{ padding: '1.25rem' }}>
                    <h4 style={{ margin: '0 0 0.25rem 0' }}>{alt.common_name}</h4>
                    <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{alt.scientific_name}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{alt.why_recommended}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
