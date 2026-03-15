import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';

export default function CandlestickChart({ data, indicators = {}, height = 450 }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        if (!chartRef.current || !data?.ohlcv) return;

        // Clear previous chart
        if (chartInstance.current) {
            try {
                chartInstance.current.remove();
            } catch (e) { /* Ignore if already disposed */ }
            chartInstance.current = null;
        }

        const chart = createChart(chartRef.current, {
            height,
            layout: {
                background: { color: '#111827' },
                textColor: '#94a3b8',
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
            },
            grid: {
                vertLines: { color: 'rgba(255,255,255,0.03)' },
                horzLines: { color: 'rgba(255,255,255,0.03)' },
            },
            crosshair: {
                mode: 0,
                vertLine: { color: 'rgba(99,102,241,0.4)', width: 1, style: 2 },
                horzLine: { color: 'rgba(99,102,241,0.4)', width: 1, style: 2 },
            },
            timeScale: {
                borderColor: 'rgba(255,255,255,0.06)',
                timeVisible: false,
            },
            rightPriceScale: {
                borderColor: 'rgba(255,255,255,0.06)',
            },
        });

        chartInstance.current = chart;

        // Candlestick series
        const timestamps = data.timestamps;
        const candleData = timestamps.map((t, i) => {
            // Ensure time is formatted correctly for lightweight-charts
            const timeObj = typeof t === 'string' && t.includes('T') ? t.split('T')[0] : t;
            return {
                time: timeObj,
                open: data.ohlcv.open[i],
                high: data.ohlcv.high[i],
                low: data.ohlcv.low[i],
                close: data.ohlcv.close[i],
            };
        });

        // Lightweight charts now uses createChart directly, but series must be added via chart
        let candleSeries;
        try {
            candleSeries = chart.addSeries(CandlestickSeries, {
                upColor: '#10b981',
                downColor: '#ef4444',
                borderUpColor: '#10b981',
                borderDownColor: '#ef4444',
                wickUpColor: '#10b981',
                wickDownColor: '#ef4444',
            });
            candleSeries.setData(candleData);
        } catch (err) { console.error("Error drawing candlestick:", err); }

        // Volume histogram
        const volumeData = timestamps.map((t, i) => {
            const timeObj = typeof t === 'string' && t.includes('T') ? t.split('T')[0] : t;
            return {
                time: timeObj,
                value: data.ohlcv.volume[i],
                color: data.ohlcv.close[i] >= data.ohlcv.open[i]
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'rgba(239, 68, 68, 0.2)',
            };
        });

        const volumeSeries = chart.addSeries(HistogramSeries, {
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
        });
        chart.priceScale('volume').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });
        volumeSeries.setData(volumeData);

        // Overlay indicators
        const overlayColors = {
            sma_20: '#f59e0b',
            sma_50: '#3b82f6',
            ema_12: '#a78bfa',
            ema_26: '#ec4899',
            bb_upper: 'rgba(99,102,241,0.5)',
            bb_middle: 'rgba(99,102,241,0.3)',
            bb_lower: 'rgba(99,102,241,0.5)',
        };

        Object.entries(indicators).forEach(([key, values]) => {
            if (!values || !overlayColors[key]) return;

            const lineData = timestamps
                .map((t, i) => {
                    const timeObj = typeof t === 'string' && t.includes('T') ? t.split('T')[0] : t;
                    return { time: timeObj, value: values[i] };
                })
                .filter(d => d.value != null);

            if (lineData.length === 0) return;

            try {
                const series = chart.addSeries(LineSeries, {
                    color: overlayColors[key],
                    lineWidth: key.startsWith('bb_') ? 1 : 2,
                    lineStyle: key.startsWith('bb_') ? 2 : 0,
                    crosshairMarkerVisible: false,
                    priceLineVisible: false,
                    lastValueVisible: false,
                });
                series.setData(lineData);
            } catch (e) { console.warn("Could not draw overlay", key, e); }
        });

        chart.timeScale().fitContent();

        const handleResize = () => {
            chart.applyOptions({ width: chartRef.current.clientWidth });
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            try {
                chart.remove();
            } catch (e) { /* ignore */ }
            chartInstance.current = null;
        };
    }, [data, indicators, height]);

    return (
        <div className="chart-container" ref={chartRef} />
    );
}
