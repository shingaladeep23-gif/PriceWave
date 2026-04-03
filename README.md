# PriceWave: Dynamic Pricing & Personalization Engine

PriceWave is a production-grade e-commerce full-stack system that leverages real-time user behavior to dynamically adjust product prices and provide personalized shopping experiences.

## 🏗️ Architecture Overview

```text
[ Frontend (React + Vite) ] <--> [ Backend (FastAPI) ] <--> [ SQLite / Redis ]
       |                                |                      |
       |-- User View (Products, Cart)   |-- Pricing Engine     |-- Persistence
       |-- Admin View (Dashboards)      |-- Recommend Engine   |-- Feature Cache
```

## 🚀 Quick Start (Local)

### 1. Infrastructure (Redis)
Ensure Docker is installed and run:
`docker-compose up -d`

### 2. Backend Setup
`pip install -r requirements.txt`
`python data/generate_data.py`  # Seeds 1000 products & 2000 users
`uvicorn backend.main:app --reload`

### 3. Frontend Setup
`cd frontend`
`npm install`
`npm run dev`

---

## 👤 User Role Experience
- **Personalized Home**: Recommendations "Users who viewed X also viewed Y".
- **Dynamic Catalog**: Browse 1000+ products in real-time.
- **Shopping Cart**: Fully functional add/remove/checkout flow.
- **Event Tracking**: Transparently logs clicks and views to influence the pricing engine.

## 🛠️ Admin Role Experience
- **Real-Time Dashboard**: Charts showing demand signals (clicks vs views).
- **Pricing Control**: Trigger recalculations based on current surge metrics.
- **Analytics**: Table-view of every product's base vs surge price.
- **Engine Logic**: `price = base * (1 + demand - decay)`

---

## ⚙️ Tech Stack
- **Backend**: FastAPI, Async SQLAlchemy, Redis, Pydantic, JWT.
- **Frontend**: React, Vite, Recharts, Lucide-React, CSS Variables.
- **Data**: Pandas (for analysis), SQLite (for local portability).

## 🛡️ Role-Based System
- **ADMIN**: login as `admin@pricewave.com` / `admin123`.
- **USER**: login as `user0@example.com` / `password123`.
