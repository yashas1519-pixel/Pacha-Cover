<div align="center">

# 🌿 Pacha Cover

**AI-Powered Urban Canopy Restorer**

*Precision tree prescriptions, satellite heat mapping, and a proactive intelligence engine that monitors the city's green cover.*

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Gemini](https://img.shields.io/badge/Gemini_2.5_Flash-AI-4285F4?logo=google&logoColor=white)](https://ai.google.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 🎯 Problem Statement

Bengaluru has lost **78% of its tree cover** in the last two decades. Urban Heat Islands (UHIs) raise surface temperatures by 3–8°C in tree-deficient wards. Traditional urban forestry apps rely on citizens to report where trees should be planted. We need an app that tells the city where trees *must* be planted.

## 💡 The Solution: Proactive Urban Forestry

Pacha Cover shifts the paradigm from reactive to proactive. By combining **Gemini 2.5 Flash AI**, **Google Earth Engine satellite data**, and **Firestore**, Pacha Cover acts as an autonomous intelligence engine for the city's green cover:

| Feature | What it does |
|---------|-------------|
| 🧠 **Proactive Intelligence** | An autonomous AI agent monitors all 198 wards, pulling live NDVI & LST from satellites, and pushes critical heat-risk alerts. |
| 💬 **Conversational Arborist** | Replace boring forms with a Gemini-powered chat interface. Citizens just describe their spot ("3x3 corner, gets afternoon sun"), and AI cross-references soil data to prescribe the exact native species. |
| 🌡️ **Live Heat Map** | Ward-level NDVI, LST & heat-risk scores generated via Google Earth Engine (Landsat 8 + MODIS). |
| ✅ **Sapling Verification** | Gemini Vision AI verifies planted saplings from photos to prevent fraud. |
| 💨 **Carbon Simulator** | Gamified CO₂ sequestration tracking. Calculates exactly how much carbon your trees capture. |
| 🔗 **Green Corridors** | Auto-detects tree clusters forming wildlife corridors using O(N) spatial clustering algorithms. |

## 🏗️ Architecture & Data Workflow

```text
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)              │
│  Home · Prescribe · Verify · Heatmap · Intelligence     │
│         Google OAuth · Glassmorphism Dark UI            │
└────────────────────────┬────────────────────────────────┘
                         │ REST API (/api/v1/*)
┌────────────────────────▼────────────────────────────────┐
│                FastAPI Backend (Python 3.11+)           │
│                                                         │
│  [ Controller Layer ]                                   │
│  Auth (Google/Firebase) · Rate Limiting · Request Val.  │
│                                                         │
│  [ AI Services ]                                        │
│  ├── IntelligenceService (Proactive Ward Alerts)        │
│  ├── GeminiService (Conversational Arborist + Vision)   │
│  └── CarbonService (CO₂ gamification logic)             │
│                                                         │
│  [ Core Services ]                                      │
│  ├── EarthEngineService (Landsat/MODIS Data + Cache)    │
│  ├── CorridorService (O(N) Spatial Grid Clustering)     │
│  └── LedgerService (Firestore CRUD & Geohashing)        │
└────────────┬──────────────┬─────────────┬───────────────┘
             │              │             │
    ┌────────▼──────┐ ┌────▼─────┐ ┌────▼─────────┐
    │   Firestore   │ │  Gemini  │ │ Earth Engine │
    │   (Database)  │ │ 2.5 Flash│ │  (Satellite) │
    └───────────────┘ └──────────┘ └──────────────┘
```

### ⚙️ Core Workflows

1. **The Intelligence Loop**:
   - `EarthEngineService` fetches Landsat 8 (NDVI) and MODIS (LST) imagery.
   - Computes normalized heat-risk scores for 198 wards.
   - `IntelligenceService` feeds this live data into Gemini 2.5 Flash to autonomously generate hyper-targeted, severity-ranked mitigation alerts.

2. **The Conversational Prescription**:
   - User opens the Chat UI and provides unstructured text ("I want to plant near the bus stop").
   - `GeminiService` intercepts the prompt, injects background context (the user's GPS coordinates, local soil type, pH, and climate data from the `SoilHealthService`).
   - Gemini returns a strictly typed JSON prescription (Native Species, Water needs, CO₂ estimates) seamlessly rendered in the UI.

3. **Sapling Verification Lifecycle**:
   - User uploads a photo of their newly planted sapling.
   - The image is streamed to Vertex AI / Gemini Vision.
   - The AI identifies if it's a valid sapling. If valid, the `LedgerService` credits "Green Points" to the user and increments the ward's adoption count in Firestore.

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** with `pip`
- **Node.js 18+** with `npm`
- **Firebase** project with Firestore enabled (Service Account Key)
- **Google AI Studio** API Key (for Gemini)

### 1. Clone & Setup

```bash
git clone https://github.com/YOUR_USERNAME/Pacha-Cover.git
cd Pacha-Cover

# Backend setup
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd frontend
npm install
cd ..
```

### 2. Configure Environment

Copy the example file and edit it with your keys:
```bash
cp .env.example .env
```
Ensure your `serviceAccountKey.json` from Firebase is placed in the root directory.

### 3. Run Development Servers

```bash
# Terminal 1 — Backend (runs on port 8000)
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend (runs on port 5173)
cd frontend && npm run dev
```

Open **http://localhost:5173** in your browser.

## 🔌 Core API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/intelligence/alerts` | Optional | Proactive AI-generated ward alerts |
| POST | `/api/v1/prescribe/chat` | Required | Conversational tree prescription assistant |
| POST | `/api/v1/verify-growth` | Required | Sapling photo AI verification |
| POST | `/api/v1/carbon/simulate` | Required | Gamified Carbon sequestration simulation |
| GET | `/api/v1/heatmap` | Optional | Ward heat + NDVI data from Earth Engine |
| POST | `/api/v1/ledger/adopt` | Required | Adopt a planting spot |

## 🛡️ Security & Best Practices

- **Authentication**: Strict Google OAuth 2.0 access token verification via FastAPI middleware. Invalid or expired sessions return `401 Unauthorized` and trigger an automatic frontend logout.
- **AI Rate Limiting**: Gracefully catches Google Gemini Free-Tier `429 Quota Exceeded` errors and surfaces a safe `503 Service Unavailable` to the frontend without crashing.
- **Server-Side Validation**: File size (max 10MB) and MIME type checks for image uploads before pinging Gemini Vision.
- **Database Rules**: Comprehensive Firestore security rules prevent unauthorized data access.

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
