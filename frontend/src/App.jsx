import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Market from './pages/Market';
import StockDetail from './pages/StockDetail';
import Portfolio from './pages/Portfolio';
import Strategies from './pages/Strategies';
import Backtest from './pages/Backtest';
import StockFetcher from './pages/StockFetcher';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
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
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
