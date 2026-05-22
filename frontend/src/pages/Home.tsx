import React from 'react';
import { Link } from 'react-router-dom';
import { TreePine, Scan, Map, Heart, ArrowRight, Sparkles, Satellite, Building2, Leaf } from 'lucide-react';

const FEATURES = [
  {
    icon: TreePine,
    title: 'AI Tree Prescription',
    desc: 'Gemini 2.5 Flash recommends the perfect native species for your GPS, soil type, and microclimate.',
    link: '/prescribe',
    color: '#22c55e',
  },
  {
    icon: Scan,
    title: 'Vision Verification',
    desc: 'Snap a photo of your sapling. Our Vision AI instantly verifies growth stage and species.',
    link: '/verify',
    color: '#3b82f6',
  },
  {
    icon: Map,
    title: 'Heat Island Map',
    desc: '298 wards across Bengaluru, Mysuru & Mandya. Real-time satellite analysis via Google Earth Engine.',
    link: '/heatmap',
    color: '#f97316',
  },
  {
    icon: Heart,
    title: 'Green Credits',
    desc: 'Earn verified green points. Track your carbon footprint reduction and tax benefits.',
    link: '/profile',
    color: '#ec4899',
  },
];

const CITIES = [
  { name: 'Bengaluru', wards: 198, emoji: '🏙️' },
  { name: 'Mysuru', wards: 65, emoji: '🏛️' },
  { name: 'Mandya', wards: 35, emoji: '🌾' },
];

const STATS = [
  { value: '298', label: 'Wards', icon: Building2 },
  { value: '3', label: 'Cities', icon: Map },
  { value: 'AI', label: 'Powered', icon: Sparkles },
  { value: 'Live', label: 'Satellite', icon: Satellite },
];

export default function Home() {
  return (
    <div className="home-page">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero__glow" />
        <div className="hero__icon">
          <Leaf size={40} color="#22c55e" />
        </div>
        <h1 className="hero__title">
          Pacha <span className="hero__title-accent">Cover</span>
        </h1>
        <p className="hero__subtitle">
          The smart urban forestry platform. Use AI to find the perfect tree
          for your neighborhood, plant it, and earn verified green credits.
        </p>

        {/* Stat strip */}
        <div className="hero__stats">
          {STATS.map(({ value, label, icon: Icon }) => (
            <div key={label} className="hero__stat">
              <Icon size={14} color="var(--accent-green)" />
              <span className="hero__stat-value">{value}</span>
              <span className="hero__stat-label">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature Cards ────────────────────────────────────── */}
      <section className="features-grid">
        {FEATURES.map(({ icon: Icon, title, desc, link, color }, i) => (
          <Link to={link} key={title} className="feature-card" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="feature-card__icon" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
              <Icon size={22} color={color} />
            </div>
            <div className="feature-card__body">
              <h3 className="feature-card__title">{title}</h3>
              <p className="feature-card__desc">{desc}</p>
            </div>
            <ArrowRight size={16} className="feature-card__arrow" style={{ color }} />
          </Link>
        ))}
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="cta-section">
        <Link to="/prescribe" style={{ textDecoration: 'none' }}>
          <button className="cta-btn">
            <Leaf size={20} />
            Start Planting Now
            <ArrowRight size={18} />
          </button>
        </Link>
      </section>

      {/* ── Cities ───────────────────────────────────────────── */}
      <section className="cities-section">
        <p className="cities-label">Supported Cities</p>
        <div className="cities-row">
          {CITIES.map(({ name, wards, emoji }) => (
            <div key={name} className="city-badge">
              <span className="city-badge__emoji">{emoji}</span>
              <span className="city-badge__name">{name}</span>
              <span className="city-badge__count">{wards} wards</span>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        .home-page {
          max-width: 800px;
          margin: 0 auto;
          padding-top: 1rem;
        }

        /* ── Hero ─────────────────────────────────────── */
        .hero {
          text-align: center;
          padding: 3rem 1rem 2.5rem;
          position: relative;
        }

        .hero__glow {
          position: absolute;
          top: -40px;
          left: 50%;
          transform: translateX(-50%);
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(34, 197, 94, 0.12), transparent 70%);
          pointer-events: none;
          animation: pulse-glow 4s ease-in-out infinite;
        }

        .hero__icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 72px;
          height: 72px;
          border-radius: 22px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          margin-bottom: 1.5rem;
          animation: float 3s ease-in-out infinite;
          position: relative;
        }

        .hero__title {
          font-family: 'Outfit', sans-serif;
          font-size: clamp(2rem, 8vw, 3.5rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 40%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          position: relative;
          overflow-wrap: break-word;
          word-break: break-word;
          padding: 0 0.5rem;
        }

        .hero__title-accent {
          background: linear-gradient(135deg, #22c55e, #10b981, #84cc16);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero__subtitle {
          color: var(--text-secondary);
          font-size: 1.1rem;
          line-height: 1.7;
          max-width: 540px;
          margin: 0 auto 2rem;
        }

        .hero__stats {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .hero__stat {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.9rem;
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.06);
          border: 1px solid rgba(34, 197, 94, 0.12);
          font-size: 0.78rem;
        }

        .hero__stat-value {
          font-weight: 700;
          color: var(--accent-green);
        }

        .hero__stat-label {
          color: var(--text-secondary);
        }

        /* ── Features ─────────────────────────────────── */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 2.5rem;
        }

        .feature-card {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.25rem;
          background: var(--glass-bg);
          backdrop-filter: var(--glass-blur);
          border: 1px solid var(--glass-border);
          border-radius: 18px;
          text-decoration: none;
          color: inherit;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          animation: fadeInUp 0.5s ease-out both;
          position: relative;
        }

        .feature-card:hover {
          transform: translateY(-4px);
          border-color: rgba(34, 197, 94, 0.2);
          box-shadow: 0 12px 40px rgba(34, 197, 94, 0.08);
        }

        .feature-card__icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .feature-card__body {
          flex: 1;
          min-width: 0;
        }

        .feature-card__title {
          font-family: 'Outfit', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 0.35rem;
          color: var(--text-primary);
        }

        .feature-card__desc {
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .feature-card__arrow {
          position: absolute;
          top: 1.25rem;
          right: 1.25rem;
          opacity: 0;
          transform: translateX(-4px);
          transition: all 0.3s ease;
        }

        .feature-card:hover .feature-card__arrow {
          opacity: 1;
          transform: translateX(0);
        }

        /* ── CTA ──────────────────────────────────────── */
        .cta-section {
          text-align: center;
          margin-bottom: 3rem;
        }

        .cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 1rem 2.5rem;
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 1.15rem;
          color: #000;
          background: linear-gradient(135deg, #22c55e, #10b981);
          border: none;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          letter-spacing: 0.02em;
          animation: pulse-glow 3s ease-in-out infinite;
        }

        .cta-btn:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 8px 30px rgba(34, 197, 94, 0.35);
        }

        /* ── Cities ───────────────────────────────────── */
        .cities-section {
          text-align: center;
          padding-bottom: 2rem;
        }

        .cities-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          margin-bottom: 1rem;
          font-weight: 600;
        }

        .cities-row {
          display: flex;
          justify-content: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .city-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1.1rem;
          background: var(--glass-bg);
          backdrop-filter: var(--glass-blur);
          border: 1px solid var(--glass-border);
          border-radius: 999px;
          font-size: 0.85rem;
          transition: all 0.3s ease;
        }

        .city-badge:hover {
          border-color: var(--accent-green);
          transform: translateY(-2px);
        }

        .city-badge__emoji { font-size: 1.1rem; }
        .city-badge__name { font-weight: 600; }
        .city-badge__count { color: var(--text-muted); font-size: 0.75rem; }

        @media (max-width: 640px) {
          .home-page { padding-top: 0; }
          .hero { padding: 2rem 0.75rem 1.5rem; }
          .hero__icon { width: 56px; height: 56px; border-radius: 16px; margin-bottom: 1rem; }
          .hero__subtitle { font-size: 0.95rem; padding: 0 0.25rem; }
          .hero__stats { gap: 0.35rem; }
          .hero__stat { padding: 0.3rem 0.6rem; font-size: 0.75rem; }
          .hero__stat-value { font-size: 0.8rem; }
          .features-grid { grid-template-columns: 1fr; padding: 0 0.5rem; }
          .feature-card { padding: 1.1rem; }
          .cta-btn { padding: 0.85rem 1.8rem; font-size: 1rem; }
          .cities-row { gap: 0.5rem; }
          .city-badge { padding: 0.4rem 0.8rem; font-size: 0.8rem; }
        }

        @media (max-width: 380px) {
          .hero__title { font-size: 1.8rem; }
          .hero__stat { padding: 0.25rem 0.5rem; }
          .hero__stat-value { font-size: 0.75rem; }
          .hero__stat-label { display: none; }
        }
      `}</style>
    </div>
  );
}
