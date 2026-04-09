# 🌊 PriceWave

**PriceWave** is a production-grade, AI-powered e-commerce platform built for the **Tic Tac Toe Hackathon**. It features a state-of-the-art dynamic pricing and personalization engine that actively adjusts product prices based on real-time user engagement and inventory metrics.

---

## ✨ Features

- **🤖 AI-Powered Dynamic Pricing Engine**
  - Uses a **Machine Learning model (Random Forest)** trained on synthetic demand data to calculate real-time price multipliers.
  - Considers metrics such as **clicks**, **views**, and **stock levels** to apply scarcity markups or clearance discounts.
  - Automatically bounds price fluctuations between **0.23x to 2.00x** of the base price.

- **⚡ Real-Time Price Updates**
  - Employs **WebSockets** and **Redis Pub/Sub** to broadcast live price adjustments to all connected clients instantly.
  - A continuous background ticker analyzes product demand and pushes price updates without needing manual page refreshes.

- **🛒 Full E-Commerce Experience**
  - **Dynamic Catalog**: Browse a rich catalog of dynamically priced products with sleek UI.
  - **Shopping Cart & Checkout**: Add/remove items and experience a full transactional flow.
  - **AI Personalization**: "Users who viewed this also viewed..." recommendations driven by behavioral data.
  - **Event Tracking**: Implicit logging of clicks and views feeds directly into the AI pricing model.

- **🔐 Authentication & RBAC**
  - **Google OAuth Integration**: Offers seamless and secure one-click sign-in via Google.
  - **Role-Based Access Control**: Differentiated views for regular users vs. administrators.

- **📊 Admin Dashboard**
  - Access to real-time visual charts powered by **Recharts**.
  - Monitor click-through rates (CTR), demand pressure, and live base vs. surge price comparisons.

---

## 🛠️ Technology Stack

PriceWave uses a modern, high-performance tech stack designed for speed and scalability:

### Frontend
- **React.js (v18)** + **Vite**: For a lightning-fast development and user experience.
- **React Router Dom**: For declarative client-side routing.
- **Recharts**: For rendering intuitive data visualizations in the Admin Dashboard.
- **Tailwind-Merge / clsx / Lucide-React**: For a modern, glassmorphic, and stunning UI.
- **@react-oauth/google**: For enterprise-grade authentication.

### Backend
- **FastAPI**: A high-performance async Python framework.
- **SQLAlchemy (Async)**: For non-blocking database queries.
- **Redis (via redis.asyncio)**: Used for WebSocket pub/sub broadcasting and ultra-fast user metric caching.

### Machine Learning & Data
- **Scikit-Learn**: For training the `RandomForestRegressor` model.
- **Pandas & NumPy**: For efficient feature extraction and dataset manipulation.
- **Joblib**: For persisting and loading the trained ML model.

### Infrastructure
- **SQLite**: Local persistence and portability.
- **Docker & Docker Compose**: Used to spin up the Redis infrastructure effortlessly.

---

## 🚀 Quick Start (Local Setup)

To run PriceWave on your local machine:

### 1. Infrastructure (Redis)
Ensure you have Docker installed. Spin up the Redis container:
```bash
docker-compose up -d
```

### 2. Backend Setup
Navigate to the root directory, install dependencies, and start the FastAPI server:
```bash
pip install -r requirements.txt
python data/generate_data.py  # (Optional) Seeds products & users
python -m uvicorn backend.main:app --reload --port 8000
```
> Note: If you need to retrain the ML model at any point, simply run `python -m backend.services.ml_trainer`.

### 3. Frontend Setup
In a new terminal window, navigate to the `frontend` directory:
```bash
cd frontend
npm install
npm run dev
```
The application will be hot-loaded at **http://localhost:3000/**.

---

## 👤 User & Admin Access

To test role-based features without Google OAuth, you can use these default seed credentials:

- **Admin Account**: 
  - Email: `admin@pricewave.com` 
  - Password: `admin123`
- **User Account**: 
  - Email: `user0@example.com` 
  - Password: `password123`
