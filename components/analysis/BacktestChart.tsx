'use client';

import { createChart, ColorType, ISeriesApi, Time, CandlestickSeries, createSeriesMarkers } from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';
import { Candle } from '@/lib/types';

interface TradeMarker {
    time: Time;
    position: 'aboveBar' | 'belowBar' | 'inBar';
    color: string;
    shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
    text: string;
}

interface BacktestChartProps {
    data: Candle[];
    trades: any[]; // using any for now to match flexible trade object structure
}

export default function BacktestChart({ data, trades }: BacktestChartProps) {
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

        // Format data for lightweight-charts
        // Time needs to be in seconds
        const chartData = data.map(d => ({
            time: (d.time / 1000) as Time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
        }));

        candlestickSeries.setData(chartData);

        // Generate Markers from Trades
        const markers: TradeMarker[] = [];

        trades.forEach(trade => {
            // Entry Marker
            markers.push({
                time: (trade.entryTime / 1000) as Time,
                position: trade.side === 'LONG' ? 'belowBar' : 'aboveBar',
                color: '#facc15', // Yellow for entry
                shape: trade.side === 'LONG' ? 'arrowUp' : 'arrowDown',
                text: `ENTER ${trade.side} @ ${trade.entryPrice}`
            });

            // Exit Marker
            markers.push({
                time: (trade.exitTime / 1000) as Time,
                position: trade.side === 'LONG' ? 'aboveBar' : 'belowBar',
                color: trade.pnl > 0 ? '#10b981' : '#ef4444', // Green/Red based on PnL
                shape: trade.side === 'LONG' ? 'arrowDown' : 'arrowUp',
                text: `EXIT (${trade.pnl > 0 ? '+' : ''}${trade.pnlPercent.toFixed(2)}%)`
            });
        });

        // markers must be sorted by time
        markers.sort((a, b) => (a.time as number) - (b.time as number));

        // Use createSeriesMarkers for v5
        createSeriesMarkers(candlestickSeries, markers);

        chart.timeScale().fitContent();

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, trades]);

    return (
        <div
            ref={chartContainerRef}
            className="w-full h-[400px] bg-card/50 rounded-xl overflow-hidden"
        />
    );
}
