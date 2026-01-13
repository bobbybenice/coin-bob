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
