<div align="center">

# 🌿 Pacha Cover

**AI-Powered Urban Canopy Restorer**

*Precision tree prescriptions, satellite heat mapping, and a Green Ledger that rewards every sapling you plant.*

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Gemini](https://img.shields.io/badge/Gemini_2.5_Flash-AI-4285F4?logo=google&logoColor=white)](https://ai.google.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 🎯 Problem Statement

Bengaluru has lost **78% of its tree cover** in the last two decades. Urban Heat Islands (UHIs) raise surface temperatures by 3–8°C in tree-deficient wards. Citizens want to plant trees but lack:
- **Which** species suits their exact microclimate & soil
- **Where** planting has maximum cooling impact
- **Proof** that saplings survive post-planting

## 💡 Solution

Pacha Cover combines **Gemini 2.5 Flash AI**, **Google Earth Engine satellite data**, and **Firestore** to create an end-to-end urban reforestation platform:

| Feature | What it does |
|---------|-------------|
| 🌡️ **Heat Map** | Ward-level NDVI, LST & heat-risk scores from Earth Engine |
| 🌳 **Precision Prescription** | AI recommends the best native tree for your exact GPS + soil |
| ✅ **Sapling Verification** | Gemini Vision verifies planted saplings from photos |
| 📒 **Green Ledger** | Citizen "Adopt a Spot" tracker with Green Points |
| 🏘️ **Community** | Ward-level leaderboards and geofenced communities |
| 🔗 **Green Corridors** | Auto-detects tree clusters forming wildlife corridors |
| 💨 **Carbon Simulator** | AI-powered CO₂ sequestration & BBMP tax rebate calculator |
| 🗣️ **Bhasha Voice** | Vernacular voice interface (Kannada, Hindi, Tamil, Telugu) |
| 📱 **Pacha Vision AR** | View recommended trees in AR before planting |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)               │
│  Home · Prescribe · Verify · Heatmap · Community · AR   │
│         Google OAuth · Glassmorphism Dark UI             │
└────────────────────────┬────────────────────────────────┘
                         │ /api/v1/*
┌────────────────────────▼────────────────────────────────┐
│                FastAPI Backend (Python 3.11+)            │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Services Layer                                    │  │
│  │  ├── GeminiService (prescribe + vision)            │  │
│  │  ├── PrescriptionCache (instant <50ms results)     │  │
│  │  ├── CarbonService (CO₂ simulation)                │  │
│  │  ├── EarthEngineService (NDVI + LST, 24h cache)    │  │
│  │  ├── CorridorService (O(N) grid clustering)        │  │
│  │  ├── CommunityService (geofenced wards)            │  │
│  │  ├── LedgerService (Firestore CRUD)                │  │
│  │  ├── SoilHealthService (multi-city soil lookup)    │  │
│  │  └── VoiceService (Bhasha vernacular)              │  │
│  └────────────────────────────────────────────────────┘  │
└────────────┬──────────────┬─────────────┬───────────────┘
             │              │             │
    ┌────────▼──────┐ ┌────▼─────┐ ┌────▼─────────┐
    │   Firestore   │ │  Gemini  │ │ Earth Engine  │
    │   (Database)  │ │ 2.5 Flash│ │  (Satellite)  │
    └───────────────┘ └──────────┘ └──────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** with `pip`
- **Node.js 18+** with `npm`
- **Firebase** project with Firestore enabled
- **Google Cloud** project with Gemini API access

### 1. Clone & Setup

```bash
git clone https://github.com/YOUR_USERNAME/Pacha-Cover.git
cd Pacha-Cover

# Backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd frontend
npm install
cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys and Firebase credentials
# Place your serviceAccountKey.json in the project root
```

### 3. Run Development Servers

```bash
# Terminal 1 — Backend (port 8000)
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend (port 5173)
cd frontend && npm run dev
```

Open **http://localhost:5173** in your browser.

### 4. Production Build

```bash
# Build frontend
cd frontend && npm run build

# Copy to static dir for FastAPI to serve
cp -r dist ../static

# Run production server
cd .. && uvicorn app.main:app --host 0.0.0.0 --port 8080 --workers 4
```

## 📁 Project Structure

```
Pacha-Cover/
├── app/                          # FastAPI backend
│   ├── api/v1/
│   │   ├── endpoints/            # Route handlers (10 modules)
│   │   └── router.py             # Central router
│   ├── core/
│   │   ├── auth.py               # Google OAuth + Firebase Auth
│   │   ├── config.py             # Pydantic settings
│   │   ├── firebase.py           # Firestore client init
│   │   └── logging.py            # Structured logging (structlog)
│   ├── models/
│   │   ├── schemas.py            # Pydantic request/response models
│   │   └── firestore_collections.py
│   ├── services/                 # Business logic (11 services)
│   │   ├── base_ai_service.py    # Shared Gemini config
│   │   ├── gemini_service.py     # AI prescription + vision
│   │   ├── prescription_cache.py # Instant prescriptions (<50ms)
│   │   ├── carbon_service.py     # Carbon credit simulation
│   │   ├── earth_engine_service.py
│   │   ├── corridor_service.py   # O(N) spatial clustering
│   │   ├── community_service.py
│   │   ├── ledger_service.py     # Firestore CRUD
│   │   ├── soil_health_service.py
│   │   ├── ar_service.py
│   │   └── voice_service.py
│   └── main.py                   # App factory + middleware
├── frontend/                     # React + Vite + TypeScript
│   ├── src/
│   │   ├── pages/                # 8 page components
│   │   ├── components/           # Dock, Toast, Skeleton, LiquidEther
│   │   ├── context/              # AuthContext (Google OAuth)
│   │   └── api.ts                # Typed API client
│   └── vite.config.ts
├── firestore.rules               # Firestore security rules
├── firestore.indexes.json        # Composite indexes
├── Dockerfile                    # Production container
├── requirements.txt              # Python dependencies
├── .env.example                  # Environment template
└── README.md
```

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | — | Health check |
| GET | `/api/v1/heatmap` | Optional | Ward heat + NDVI data |
| POST | `/api/v1/prescribe` | Required | AI tree prescription (instant) |
| POST | `/api/v1/verify-growth` | Required | Sapling photo verification |
| POST | `/api/v1/ledger/adopt` | Required | Adopt a planting spot |
| GET | `/api/v1/ledger/community` | Optional | Public community map |
| GET | `/api/v1/ledger/my-spots` | Required | User's adopted spots |
| GET | `/api/v1/communities` | Optional | Geofenced communities |
| GET | `/api/v1/corridors` | Optional | Green corridor clusters |
| POST | `/api/v1/carbon/simulate` | Required | Carbon credit simulation |
| GET | `/api/v1/assets/ar-models` | Optional | AR model catalogue |

## 🛡️ Security

- **Authentication**: Google OAuth 2.0 + Firebase Auth
- **Firestore Rules**: 114-line rule set with per-collection access control
- **Server-side validation**: All inputs validated via Pydantic
- **Secrets management**: Environment variables, never committed
- **Immutable audit trail**: Verifications cannot be updated or deleted

## 🌍 Supported Cities

| City | Wards | Soil Data | Tree Species |
|------|-------|-----------|--------------|
| Bengaluru | 198 BBMP wards | ✅ Red laterite zones | 12 native species |
| Mysuru | 65 wards | ✅ Black cotton soil | 4 curated species |
| Mandya | 7 taluks | ✅ Agricultural zones | 4 agroforestry species |

## 🏆 Built For

- **Build for Bengaluru** Hackathon
- **Rotary International** — Environment Area of Focus
- **UN Sustainable Development Goals** — SDG 11 (Sustainable Cities), SDG 13 (Climate Action), SDG 15 (Life on Land)

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Made with 🌱 for Bengaluru's urban forest**

</div>
