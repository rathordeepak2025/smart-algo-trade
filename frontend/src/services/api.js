import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// ── Market / Stocks ──
export const fetchStocks = () => api.get('/stocks').then(r => r.data);
export const fetchStock = (symbol) => api.get(`/stocks/${symbol}`).then(r => r.data);
export const fetchStockPrices = (symbol, limit = 180) =>
  api.get(`/stocks/${symbol}/prices`, { params: { limit } }).then(r => r.data);
export const fetchStockIndicators = (symbol, limit = 180) =>
  api.get(`/stocks/${symbol}/indicators`, { params: { limit } }).then(r => r.data);

// ── Portfolios ──
export const fetchPortfolios = () => api.get('/portfolios').then(r => r.data);
export const fetchPortfolio = (id) => api.get(`/portfolios/${id}`).then(r => r.data);
export const createPortfolio = (data) => api.post('/portfolios', data).then(r => r.data);
export const addHolding = (portfolioId, data) =>
  api.post(`/portfolios/${portfolioId}/holdings`, data).then(r => r.data);
export const deletePortfolio = (id) => api.delete(`/portfolios/${id}`).then(r => r.data);

// ── Strategies ──
export const fetchStrategies = () => api.get('/strategies').then(r => r.data);
export const fetchStrategy = (id) => api.get(`/strategies/${id}`).then(r => r.data);
export const createStrategy = (data) => api.post('/strategies', data).then(r => r.data);
export const deleteStrategy = (id) => api.delete(`/strategies/${id}`).then(r => r.data);

// ── Backtesting ──
export const runBacktest = (strategyId, data) =>
  api.post(`/strategies/${strategyId}/backtest`, data).then(r => r.data);
export const fetchBacktestResult = (id) => api.get(`/backtests/${id}`).then(r => r.data);

export default api;
