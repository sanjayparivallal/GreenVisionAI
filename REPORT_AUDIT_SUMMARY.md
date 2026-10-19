# GREENVISION AI — CODEBASE AUDIT & TECHNICAL EVIDENCE SUMMARY

## 1. Executive Summary & Audit Scope

This document provides a comprehensive technical audit of the **GreenVision AI** codebase (`https://github.com/sanjayparivallal/GreenVisionAI.git`), conducted to verify actual architectural components, machine learning models, database schemas, APIs, and client-side modules. The findings in this document serve as the technical ground-truth for the generation of the formal academic project report.

---

## 2. Inspected Files & Directory Inventory

The audit examined every critical layer of the repository, including:

| Layer | Directories & Key Files Inspected | Verified Implementation Status |
| :--- | :--- | :--- |
| **Backend Core & Config** | `backend/main.py`, `backend/core/config.py`, `backend/core/dependencies.py`, `backend/core/security.py` | FastAPI application with async lifespan, CORS middleware, JWT authentication, bcrypt password hashing, and Pydantic Settings. |
| **Database & ORM** | `backend/db/schema.sql`, `backend/db/pool.py`, `backend/db/queries/*.py` (`reports.py`, `users.py`, `rewards.py`, `organic.py`, `schedule.py`, `feedback.py`) | Async PostgreSQL connection pool (`asyncpg`), raw parameterized SQL execution, table creation scripts with foreign keys, checks, and B-tree indexes. |
| **ML Inference & Pipeline** | `backend/ml/local_model.py`, `backend/ml/predictor.py`, `backend/ml/weights/greenvision.pt` | Custom PyTorch `GreenVisionNet` dual-head MobileNetV2 architecture, lazy-loaded singleton, deterministic scoring engine (`_scores_from_fill`), end-to-end native edge execution. |
| **ML Training Pipeline** | `backend/ml/training/model.py`, `backend/ml/training/train.py`, `backend/ml/training/dataset.py`, `backend/ml/training/config.py`, `backend/ml/training/data/labels.csv` | Two-stage transfer learning (warm-up heads, fine-tune backbone), dual Cross-Entropy with inverse-sqrt class weighting, PyTorch AMP (`GradScaler`), dataset integration (`overflow_hf`). |
| **API Routers** | `backend/routers/` (`auth.py`, `reports.py`, `rewards.py`, `schedule.py`, `feedback.py`, `organic.py`, `stats.py`) | 7 RESTful API modules mapped under `/api` prefix with role-based access control (`admin`, `resident`). |
| **Frontend UI & State** | `frontend/src/App.tsx`, `frontend/src/main.tsx`, `frontend/src/pages/*.tsx`, `frontend/src/components/*.tsx`, `frontend/src/api/*.ts`, `frontend/src/context/AuthContext.tsx` | React 19 SPA, TypeScript, Vite 6, TailwindCSS v4, React Router DOM v7, TanStack React Query v5, Motion animations, Axios API client. |
| **DevOps & Containers** | `docker-compose.yml`, `backend/Dockerfile`, `backend/.dockerignore`, `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/.dockerignore` | Multi-container Docker setup (PostgreSQL 16 DB with persistent storage volume, FastAPI ASGI backend on port 8000, and Nginx reverse proxy frontend on port 80 with 50MB payload limits and health checks). |

---

## 3. Verified System Architecture

GreenVision AI implements a decoupled, modern multi-tier microservice-ready architecture powered natively by its custom multi-task deep neural network:

```
[ Resident / Admin Client (React 19 + Vite + TailwindCSS) ]
                           │ (HTTPS / JSON REST API)
                           ▼
              [ FastAPI Backend Engine (Port 8000) ]
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
 [ Auth & Routers ]  [ AsyncPG Pool ]  [ GreenVisionNet ML Engine ]
       │                   │                   │
       ▼                   ▼                   ├── [ Feature Backbone: MobileNetV2 ]
[ JWT / Roles ]      [ PostgreSQL ]            ├── [ Head 1: Waste Type Classifier ]
                                               ├── [ Head 2: Fill Level Classifier ]
                                               └── [ Deterministic Scoring Engine ]
```

1. **Client Tier**: React 19 single-page application built with Vite and TypeScript. Communicates via asynchronous Axios clients with JWT bearer authentication.
2. **Application Tier**: FastAPI 0.115 asynchronous ASGI server utilizing `uvicorn`, routing requests across modular sub-routers, validating payloads using Pydantic v2 schemas.
3. **Data Tier**: PostgreSQL relational database connected via `asyncpg` connection pool. Handles transactional state, geo-coordinates, reward ledgers, collection routes, and organic waste listings.
4. **Machine Learning Tier**: Deep Convolutional Neural Network (`GreenVisionNet`) hosted directly within the backend environment, utilizing PyTorch on CUDA/CPU for instant, on-premise edge inference.

---

## 4. Machine Learning Implementation Findings

### 4.1 Architecture & Design
- **Base Backbone**: MobileNetV2 feature extractor (`models.mobilenet_v2(weights=None).features`), utilizing inverted residual blocks with depthwise separable convolutions to maintain low latency and compact memory footprint.
- **Feature Pooling**: Adaptive Average Pooling (`nn.AdaptiveAvgPool2d(1)`) compressing spatial dimensions to a 1D feature tensor of dimension $d = 1280$.
- **Dual Classification Heads**: Multi-task learning framework comprising two independent linear classification heads:
  1. `type_head`: `nn.Sequential(nn.Dropout(0.3), nn.Linear(1280, 4))` -> Predicts waste classification among 4 classes: `organic`, `recyclable`, `general`, `hazardous`.
  2. `fill_head`: `nn.Sequential(nn.Dropout(0.3), nn.Linear(1280, 4))` -> Predicts bin volume status among 4 classes: `empty`, `half-full`, `full`, `overflowing`.

### 4.2 Training Pipeline & Methodology
- **Dataset**: `backend/ml/training/data/labels.csv` containing 1,500 labeled image records.
  - Class distribution for waste types: `general` (515), `hazardous` (433), `recyclable` (280), `organic` (272).
  - Class distribution for fill levels: `overflowing` (764), `empty` (601), `full` (103), `half-full` (32).
- **Data Augmentation**: Training pipeline implements `RandomResizedCrop(224, scale=(0.7, 1.0))`, `RandomHorizontalFlip()`, `ColorJitter(0.3, 0.3, 0.3, 0.05)`, and `RandomRotation(10)` followed by ImageNet mean/standard deviation normalization.
- **Loss Formulation**: Dual Cross-Entropy Loss with dynamic inverse-square-root class weighting:
  $$w_c = \frac{1}{\sqrt{\max(N_c, 1)}} \bigg/ \text{mean}(w)$$
  $$\mathcal{L}_{\text{total}} = \mathcal{L}_{\text{CE}}(\hat{y}_{\text{type}}, y_{\text{type}}; w_{\text{type}}) + \mathcal{L}_{\text{CE}}(\hat{y}_{\text{fill}}, y_{\text{fill}}; w_{\text{fill}})$$
- **Optimization Strategy**: Two-stage progressive transfer learning:
  - Stage 1: Warm-up (5 epochs, LR = $1 \times 10^{-3}$, backbone frozen).
  - Stage 2: Fine-tuning (12 epochs, LR = $1 \times 10^{-4}$, full network unfrozen, AdamW optimizer, weight decay $1 \times 10^{-4}$, PyTorch AMP with `GradScaler`, early stopping patience = 4).

### 4.3 Verified Model Performance (Checkpoint Validation Evidence)
Direct inspection of the saved model weights checkpoint at `backend/ml/weights/greenvision.pt` verified the following metrics stored under `val_acc`:
- **Waste Type Classification Accuracy**: **74.29%** ($0.742857$)
- **Fill Level Classification Accuracy**: **95.24%** ($0.952381$)
- **Mean Multi-Task Validation Accuracy**: **84.76%** ($0.847619$)

---

## 5. Machine Learning Prediction & Scoring Pipeline

The prediction workflow in GreenVision AI is executed entirely by the native `GreenVisionNet` model:

```
                       [ Incoming Image (Base64) ]
                                    │
                                    ▼
                      [ analyze_waste_image() ]
                                    │
                                    ▼
                      [ predict_from_base64() ]
                                    │
                  ├── Loads greenvision.pt (Lazy Singleton)
                  ├── Decodes Base64 to RGB PIL Image
                  ├── Normalizes Tensor (224x224, ImageNet μ/σ)
                  ├── Dual-Head Forward Pass (Type & Fill Logits)
                  ├── Argmax Class Extraction
                  └── Deterministic Post-Processing Scoring
                                    │
                                    ▼
                     [ Return AnalysisResult ]
```

### Deterministic Post-Processing & Scoring Formulas
In `backend/ml/local_model.py`, business logic is strictly decoupled from neural network inference:
1. **Nominal Weight Assignment**:
   $$\text{Weight (kg)} \in \{\text{empty}: 2.0, \text{half-full}: 12.0, \text{full}: 40.0, \text{overflowing}: 120.0\}$$
2. **Severity Score Calculation** ($1.0 \le S \le 10.0$):
   $$S_{\text{base}} = \text{lookup}(\text{fill\_level}) \in \{1.5, 3.5, 6.0, 8.0\}$$
   $$S = S_{\text{base}} + (1.5 \text{ if hazardous}) + (0.5 \text{ if organic } \land \text{fill} \in \{\text{full}, \text{overflowing}\})$$
3. **Environmental Impact Score** ($10.0 \le E \le 100.0$):
   $$E = \min(100.0, \max(10.0, S \times 9.5 + (12.0 \text{ if hazardous})))$$
4. **Priority Level Mapping**:
   $$\text{Priority} = \begin{cases} \text{critical}, & S \ge 8.5 \lor (\text{hazardous} \land S \ge 6.0) \\ \text{high}, & S \ge 6.5 \\ \text{medium}, & S \ge 4.0 \\ \text{low}, & S < 4.0 \end{cases}$$

---

## 6. Identified Modules & Functional Capabilities

1. **Authentication & Identity Access Management (`/api/auth`)**:
   - Role separation: `admin` and `resident`.
   - Security: Password hashing with `passlib[bcrypt]`, stateless JWT tokens with expiration.
2. **Municipal Waste Reporting & Diagnosis (`/api/reports`)**:
   - Geolocation ingestion (latitude, longitude, textual landmark).
   - Base64 image intake, automated GreenVisionNet multi-task classification, dispatch action recommendation.
   - Administrative review lifecycle: `pending` -> `approved` / `rejected` -> `in_progress` -> `collected`.
3. **Eco-Reward Tokenomics (`/api/rewards`)**:
   - Points earned upon administrative approval equal to $\max(10, \text{round}(\text{environmental\_impact\_score}))$.
   - Transaction ledger with double-entry style verification (`earned` vs `redeemed`).
4. **Municipal Route Scheduling (`/api/schedule`)**:
   - Zone-based sanitation truck scheduling (`scheduled`, `completed`, `delayed`).
   - Admin route creation, status modification, and resident schedule visibility.
5. **Circular Economy Organic Waste Marketplace (`/api/organic`)**:
   - Listing organic waste batches for agricultural composting or bio-gas recovery.
   - Automated hourly background expiry loop (`_organic_expiry_loop`).
   - Claim tracking with quota decrements and concurrency safety.
6. **Civic Feedback & Grievance Redressal (`/api/feedback`)**:
   - Citizen ticketing system (`open`, `in_progress`, `resolved`) with administrative responses.
7. **Municipal Analytics & Key Performance Indicators (`/api/stats`)**:
   - Real-time aggregation of total reports, tonnage diverted, active cleanups, and priority heat distributions.

---

## 7. Evidence Inventory & Verification Matrix

| Claim / Component | Evidence Location in Codebase | Verification Status |
| :--- | :--- | :--- |
| Custom PyTorch Model | `backend/ml/local_model.py:41-55`, `backend/ml/weights/greenvision.pt` | **VERIFIED** |
| Dual-Head Multi-Tasking | `backend/ml/training/model.py:20-25` | **VERIFIED** |
| MobileNetV2 Backbone | `backend/ml/local_model.py:44-47` | **VERIFIED** |
| Val Accuracies (74.3% / 95.2%) | Extracted directly from `greenvision.pt` state dict (`val_acc`) | **VERIFIED** |
| Training Dataset (1500 samples) | `backend/ml/training/data/labels.csv` | **VERIFIED** |
| Native Edge Inference Pipeline | `backend/ml/local_model.py:161-211` | **VERIFIED** |
| Asynchronous Connection Pool | `backend/db/pool.py:18-30` (`asyncpg.create_pool`) | **VERIFIED** |
| React 19 Client SPA | `frontend/package.json:19` | **VERIFIED** |
| Containerized Deployment | `docker-compose.yml:1-26` | **VERIFIED** |
| Verified GitHub Repo | `https://github.com/sanjayparivallal/GreenVisionAI.git` | **VERIFIED** |

---

## 8. Final Audit Conclusion

The codebase represents a fully implemented, production-architected municipal waste surveillance and dispatch ecosystem. The machine learning subsystem is powered natively by the custom PyTorch `GreenVisionNet` dual-head model, backed by real training scripts, verified weight checkpoints, and clear multi-task learning formulations. All sections of the academic report strictly adhere to these verified architectural and experimental realities without external API dependencies.
