# Nexus — Algo Trading Platform

Nexus is a powerful, real-time algorithmic trading platform designed for NSE/BSE securities. It provides traders with the tools to analyze market trends, track portfolios, and automate strategies with precision.

## 🚀 Key Features

- **Real-time Market Feed**: Live stock price updates delivered via WebSockets for instantaneous analysis.
- **Technical Analysis**: Integrated technical indicators (RSI, Moving Averages, etc.) to identify market opportunities.
- **Portfolio Management**: Comprehensive tracking of holdings, performance metrics, and asset allocation.
- **Strategy Engine**: Create, backtest, and refine trading strategies using historical and real-time data.
- **Modern Dashboard**: A sleek, responsive React-based interface with high-performance charting.

## 🛠️ Tech Stack

- **Frontend**: React.js, Vite, Tailwind CSS, Lightweight Charts, Recharts.
- **Backend**: Python, FastAPI, SQLAlchemy, WebSockets.
- **Database**: SQLite (SQLAlchemy ORM).

## 🏁 Getting Started

### Prerequisites

- **Python**: 3.8 or higher
- **Node.js**: 18.x or higher
- **Package Manager**: `pip` (Python) and `npm` (Node.js)

---

### 📦 Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the FastAPI server**:
   ```bash
   uvicorn main:app --reload
   ```
   *The API will be available at `http://localhost:8000`.*

---

### 💻 Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   *The application will be accessible at `http://localhost:5173`.*

---

## 🏗️ Project Structure

- `backend/`: FastAPI application, database models, and trading logic.
- `frontend/`: React source code and UI components.
- `rules.md`: Project-specific architectural guidelines.

## 📝 License

This project is licensed under the MIT License.
