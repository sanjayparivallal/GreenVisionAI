# sona-final-year-mini-it-aids-d-sanjay-c-p-692
StartupFair hackathon: Solo Participant 24 (Final year mini project (IT / AIDS Dept))

---

# GreenVision AI 🌿
### Edge-Intelligent Multi-Task Deep Learning for Municipal Solid Waste Monitoring, Dynamic Hazard Triage, and Circular Resource Recovery

GreenVision AI is an end-to-end municipal solid waste surveillance, diagnosis, and civic engagement platform. Powered by an edge-optimized PyTorch deep neural network (**GreenVisionNet** - MobileNetV2 dual-head architecture) and an asynchronous FastAPI + React 19 stack, it replaces slow schedule-based collection with intelligent, automated dispatch and community incentives.

---

## Key Capabilities

1. **Dual-Head Multi-Task AI Vision:**
   - **Waste Classification:** Categorizes waste into `organic`, `recyclable`, `general`, and `hazardous`.
   - **Volumetric Surveillance:** Detects bin occupancy across `empty`, `half-full`, `full`, and `overflowing`.
   - **Edge Inference:** Sub-50ms inference latency on commodity CPU/GPU hardware.

2. **Multi-Factor Dynamic Priority Triage:**
   - **Vulnerable Facility Proximity:** Prioritizes dumps near hospitals, clinics, schools, and daycare centers to protect public health.
   - **Vector & Pest Attraction Rule:** Detects rapid anaerobic decay in overflowing organic waste attracting rodents, stray animals, and disease vectors.
   - **Odor & Decomposition Severity:** Ingests citizen stench indicators to detect toxic gas ($H_2S$, methane) buildup.
   - **Urban Infrastructure Blockage:** Flags storm drain/gutter blockages (flash flood mitigation) and roadway/sidewalk spills.
   - **Dynamic Stagnation Auto-Escalation:** Uncollected reports automatically escalate from Low/Medium to High after 24 hours, and to Critical after 48 hours.

3. **Civic Eco-Reward Tokenomics:**
   - Citizens earn verifiable eco-tokens upon municipal approval of geotagged cleanups, redeemable for local municipal incentives.

4. **Circular Economy Organic Marketplace:**
   - Connects verified organic waste batches with local farms and compost processors prior to landfill contamination.

---

## Tech Stack

- **Machine Learning:** PyTorch, MobileNetV2 Dual-Head Architecture, Torchvision
- **Backend:** Python 3.13, FastAPI (ASGI), AsyncPG connection pooling, Pydantic v2, Python-Jose (JWT)
- **Database:** PostgreSQL / Supabase with raw parameterized async queries
- **Frontend:** React 19, Vite, TypeScript, TailwindCSS v4, TanStack React Query v5, Lucide Icons, Motion

---

## Quickstart Guide

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Team & Project Context
- **Candidate:** Sanjay C P
- **Department:** Information Technology / Artificial Intelligence & Data Science
- **Institution:** Sona College of Technology
- **Submission:** Final Year Mini Project / StartupFair Hackathon
