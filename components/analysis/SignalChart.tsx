'use client';

import { createChart, ColorType, Time, CandlestickSeries, createSeriesMarkers, SeriesMarker } from 'lightweight-charts';
import { Signal } from '@/lib/engine/signal-scanner';
import React, { useEffect, useRef } from 'react';
import { Candle } from '@/lib/types';

interface SignalChartProps {
    data: Candle[];
    signals: Signal[];
}

export default function SignalChart({ data, signals }: SignalChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current!.clientWidth });
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#d1d5db',
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
            },
            timeScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
                timeVisible: true,
            },
        });

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
        });

        // Format data
        const chartData = data.map(d => ({
            time: (d.time / 1000) as Time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
        }));

        candlestickSeries.setData(chartData);

        // Generate Markers from Signals
        const markers: SeriesMarker<Time>[] = signals.map(signal => ({
            time: (signal.time / 1000) as Time,
            position: signal.type === 'LONG' ? 'belowBar' : 'aboveBar',
            color: signal.type === 'LONG' ? '#facc15' : '#e879f9', // Yellow for Long, Purple for Short
            shape: signal.type === 'LONG' ? 'arrowUp' : 'arrowDown',
            text: signal.label,
            size: 2
        }));

        // Sort markers by time
        markers.sort((a, b) => (a.time as number) - (b.time as number));

        createSeriesMarkers(candlestickSeries, markers);

        // Risk/Reward Overlay for the latest signal
        if (signals.length > 0) {
            const latestSignal = signals[signals.length - 1];
            const entryPrice = latestSignal.price;

            // Heuristic for SL: Recent Swing Low/High (lookback 10 candles)
            const idx = data.findIndex(d => d.time === latestSignal.time);
            let stopLoss = 0;

            if (latestSignal.type === 'LONG') {
                // Find lowest low in last 10 candles relative to signal
                const lookback = data.slice(Math.max(0, idx - 10), idx + 1);
                const lowestLow = Math.min(...lookback.map(c => c.low));
                stopLoss = lowestLow;

                // Ensure SL is at least 0.5% away to avoid tight chop
                if (stopLoss > entryPrice * 0.995) stopLoss = entryPrice * 0.995;

                const risk = entryPrice - stopLoss;
                const takeProfit = entryPrice + (risk * 2); // 2R

                candlestickSeries.createPriceLine({
                    price: stopLoss,
                    color: '#ef4444',
                    lineWidth: 2,
                    lineStyle: 0, // Solid
                    axisLabelVisible: true,
                    title: 'STOP LOSS',
                });
                candlestickSeries.createPriceLine({
                    price: entryPrice,
                    color: '#3b82f6',
                    lineWidth: 1,
                    lineStyle: 2, // Dashed
                    axisLabelVisible: true,
                    title: 'ENTRY',
                });
                candlestickSeries.createPriceLine({
                    price: takeProfit,
                    color: '#10b981',
                    lineWidth: 2,
                    lineStyle: 0,
                    axisLabelVisible: true,
                    title: 'TARGET (2R)',
                });
            } else {
                // SHORT
                const lookback = data.slice(Math.max(0, idx - 10), idx + 1);
                const highestHigh = Math.max(...lookback.map(c => c.high));
                stopLoss = highestHigh;

                // Buffer
                if (stopLoss < entryPrice * 1.005) stopLoss = entryPrice * 1.005;

                const risk = stopLoss - entryPrice;
                const takeProfit = entryPrice - (risk * 2);

                candlestickSeries.createPriceLine({
                    price: stopLoss,
                    color: '#ef4444',
                    lineWidth: 2,
                    lineStyle: 0,
                    axisLabelVisible: true,
                    title: 'STOP LOSS',
                });
                candlestickSeries.createPriceLine({
                    price: entryPrice,
                    color: '#3b82f6',
                    lineWidth: 1,
                    lineStyle: 2,
                    axisLabelVisible: true,
                    title: 'ENTRY',
                });
                candlestickSeries.createPriceLine({
                    price: takeProfit,
                    color: '#10b981',
                    lineWidth: 2,
                    lineStyle: 0,
                    axisLabelVisible: true,
                    title: 'TARGET (2R)',
                });
            }
        }

        chart.timeScale().fitContent();

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, signals]);

    return (
        <div
            ref={chartContainerRef}
            className="w-full h-full min-h-[400px]"
        />
    );
}
