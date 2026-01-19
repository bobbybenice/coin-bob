'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickData, Time, CandlestickSeries, ISeriesApi, createSeriesMarkers } from 'lightweight-charts';
import { Timeframe, StrategyName } from '@/lib/types';
import { useChartData } from '@/lib/hooks/useChartData';
import { useStrategyMarkers } from '@/lib/hooks/useStrategyMarkers';
import { getAllStrategyNames, getStrategy } from '@/lib/engine/strategies';

interface ChartInstanceProps {
    symbol: string;
    initialTimeframe?: Timeframe;
    initialStrategy?: StrategyName | null;
    onZoomReset?: number; // Counter to trigger zoom reset
}

/**
 * Individual chart instance with independent timeframe and strategy
 */
export function ChartInstance({
    symbol,
    initialTimeframe = '1h',
    initialStrategy = null,
    onZoomReset = 0
}: ChartInstanceProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const markerPluginRef = useRef<ReturnType<typeof createSeriesMarkers<Time>> | null>(null);

    const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
    const [selectedStrategy, setSelectedStrategy] = useState<StrategyName | null>(initialStrategy);

    const { candles, isLoading, error } = useChartData(symbol, timeframe);
    const { markers, strategyStatus } = useStrategyMarkers(candles, selectedStrategy);

    // Initialize chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { color: '#09090b' },
                textColor: '#a1a1aa',
            },
            grid: {
                vertLines: { color: '#18181b' },
                horzLines: { color: '#18181b' },
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: '#27272a',
            },
            rightPriceScale: {
                borderColor: '#27272a',
            },
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
        });

        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;

        // Handle resize
        const handleResize = () => {
            if (chartContainerRef.current && chart) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    // Update chart data
    useEffect(() => {
        if (!candleSeriesRef.current || candles.length === 0) return;

        const formattedData: CandlestickData[] = candles.map(c => ({
            time: (c.time / 1000) as Time, // Convert to seconds
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        }));

        candleSeriesRef.current.setData(formattedData);

        // Auto-fit content
        if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
        }
    }, [candles]);

    // Update markers using createSeriesMarkers
    useEffect(() => {
        if (!candleSeriesRef.current || candles.length === 0) return;

        // Create marker plugin if it doesn't exist
        if (!markerPluginRef.current) {
            markerPluginRef.current = createSeriesMarkers(candleSeriesRef.current, markers);
        } else {
            // Update markers (including clearing them if empty array)
            markerPluginRef.current.setMarkers(markers);
        }
    }, [candles, markers]);

    // Reset zoom when chartCount changes
    useEffect(() => {
        if (onZoomReset > 0 && chartRef.current) {
            chartRef.current.timeScale().fitContent();
        }
    }, [onZoomReset]);

    const strategyNames = getAllStrategyNames();

    return (
        <div className="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden">
            {/* Header with controls */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                    {/* Timeframe Selector */}
                    <select
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                        className="px-3 py-1.5 text-xs font-medium bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                        <option value="1m">1m</option>
                        <option value="5m">5m</option>
                        <option value="1h">1h</option>
                        <option value="4h">4h</option>
                        <option value="1d">1d</option>
                    </select>

                    {/* Strategy Selector */}
                    <select
                        value={selectedStrategy || ''}
                        onChange={(e) => setSelectedStrategy(e.target.value as StrategyName || null)}
                        className="px-3 py-1.5 text-xs font-medium bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                        <option value="">No Strategy</option>
                        {strategyNames.map((name) => {
                            const config = getStrategy(name);
                            return (
                                <option key={name} value={name}>
                                    {config?.displayName || name}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div className="text-xs text-muted-foreground">
                    {symbol}
                </div>
            </div>

            {/* Strategy Status */}
            {selectedStrategy && (
                <div className="px-3 py-2 bg-muted/20 border-b border-border">
                    <div className="text-xs text-muted-foreground">
                        <span className="font-semibold">Status:</span> {strategyStatus}
                    </div>
                </div>
            )}

            {/* Chart Container */}
            <div className="flex-1 relative">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            <div className="text-xs text-muted-foreground">Loading {timeframe} data...</div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                        <div className="text-xs text-rose-500">Error: {error}</div>
                    </div>
                )}

                <div ref={chartContainerRef} className="w-full h-full" />
            </div>
        </div>
    );
}
