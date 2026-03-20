import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Market from './pages/Market';
import StockDetail from './pages/StockDetail';
import Portfolio from './pages/Portfolio';
import Strategies from './pages/Strategies';
import Backtest from './pages/Backtest';
import StockFetcher from './pages/StockFetcher';
import TrackingInstrument from './pages/TrackingInstrument';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import './index.css';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check initial auth status
    axios.get('http://localhost:8000/api/auth/upstox/status')
      .then(res => {
        setIsAuthenticated(res.data.authenticated);
      })
      .catch(err => {
        console.error("Failed to check auth status:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Nexus...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
        <Route path="/auth/callback" element={<AuthCallback setIsAuthenticated={setIsAuthenticated} />} />

        {/* Protected Routes */}
        <Route path="/*" element={
          isAuthenticated ? (
            <div className="app-layout">
              <Sidebar />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/market" element={<Market />} />
                  <Route path="/stock/:symbol" element={<StockDetail />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/strategies" element={<Strategies />} />
                  <Route path="/backtest" element={<Backtest />} />
                  <Route path="/stock-fetcher" element={<StockFetcher />} />
                  <Route path="/tracking" element={<TrackingInstrument />} />
                </Routes>
              </main>
            </div>
          ) : (
            <Navigate to="/login" replace />
          )
        } />
      </Routes>
    </BrowserRouter>
  );
}
