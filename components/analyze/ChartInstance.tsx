'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickData, Time, CandlestickSeries, ISeriesApi, createSeriesMarkers, SeriesMarker, IPriceLine } from 'lightweight-charts';
import { Timeframe, StrategyName } from '@/lib/types';
import { useChartData } from '@/lib/hooks/useChartData';
import { useStrategyMarkers } from '@/lib/hooks/useStrategyMarkers';
import { useKeyLevels } from '@/lib/hooks/useKeyLevels';
import { getAllStrategyNames, getStrategy } from '@/lib/engine/strategies';
import { runBacktest } from '@/lib/engine/backtester';
import { BacktestResult } from '@/lib/types'; // Import BacktestResult type
import { useUserStore } from '@/lib/store';
import { Trophy, ChevronDown } from 'lucide-react';

interface ChartInstanceProps {
    symbol: string;
    initialTimeframe?: Timeframe;
    initialStrategy?: StrategyName | null; // For uncontrolled mode
    strategy?: StrategyName | null;        // For controlled mode
    timeframe?: Timeframe;                 // For controlled mode (Scalp Mode)
    onZoomReset?: number;
    onStrategyChange?: (strategy: StrategyName | null) => void;
}

/**
 * Individual chart instance with independent timeframe and strategy
 */
export function ChartInstance({
    symbol,
    initialTimeframe = '1h',
    initialStrategy = null,
    strategy, // controlled prop
    timeframe: controlledTimeframe, // controlled prop
    onZoomReset = 0,
    onStrategyChange
}: ChartInstanceProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const markerPluginRef = useRef<ReturnType<typeof createSeriesMarkers<Time>> | null>(null);

    const [internalTimeframe, setInternalTimeframe] = useState<Timeframe>(initialTimeframe);

    // Determine effective timeframe: Controlled Prop > Internal State
    const timeframe = controlledTimeframe ?? internalTimeframe;
    // Internal state mainly for uncontrolled usage
    const [internalStrategy, setInternalStrategy] = useState<StrategyName | null>(initialStrategy);

    // Determine effective strategy: Controlled Prop > Internal State
    const selectedStrategy = strategy ?? internalStrategy;

    // Key Levels & Settings
    const { isBacktestMode, backtestOptions, settings } = useUserStore();
    const { levels } = useKeyLevels(symbol);
    const priceLinesRef = useRef<IPriceLine[]>([]); // Store price line references to remove them

    const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
    const [backtestMarkers, setBacktestMarkers] = useState<SeriesMarker<Time>[]>([]);

    const { candles, isLoading, error } = useChartData(symbol, timeframe);
    const { markers: liveMarkers, strategyStatus, sentiment } = useStrategyMarkers(candles, selectedStrategy);

    // Calculate Backtest Results when in mode
    useEffect(() => {
        if (isBacktestMode && selectedStrategy && candles.length > 0) {
            const strategyConfig = getStrategy(selectedStrategy);
            if (strategyConfig) {
                const result = runBacktest(strategyConfig.execute, candles, backtestOptions);
                setBacktestResult(result);

                // Convert trades to markers
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const newMarkers: any[] = [];
                result.trades.forEach(trade => {
                    // Entry Marker
                    newMarkers.push({
                        time: trade.entryTime / 1000 as Time,
                        position: trade.side === 'LONG' ? 'belowBar' : 'aboveBar',
                        shape: trade.side === 'LONG' ? 'arrowUp' : 'arrowDown',
                        color: trade.side === 'LONG' ? '#10b981' : '#ef4444',
                        text: `ENTRY ${trade.side}`,
                        size: 2
                    });

                    // Exit Marker
                    newMarkers.push({
                        time: trade.exitTime / 1000 as Time,
                        position: trade.side === 'LONG' ? 'aboveBar' : 'belowBar',
                        shape: 'circle',
                        color: trade.pnl > 0 ? '#fbbf24' : '#ef4444', // Gold for win, Red for loss
                        text: `EXIT ${trade.pnl > 0 ? 'WIN' : 'LOSS'}`,
                        size: 2
                    });
                });
                setBacktestMarkers(newMarkers);
            }
        } else {
            setBacktestResult(null);
            setBacktestMarkers([]);
        }
    }, [isBacktestMode, selectedStrategy, candles, backtestOptions]);

    // effective markers
    const markers = isBacktestMode ? backtestMarkers : liveMarkers;

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
                visible: true,
            },
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#ef4444',
            borderVisible: true,
            wickVisible: true,
            borderColor: '#10b981', // Match up color for green borders
            borderUpColor: '#10b981',
            borderDownColor: '#ef4444',
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
        });

        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;

        // Handle resize with ResizeObserver
        const resizeObserver = new ResizeObserver((entries) => {
            if (entries.length === 0 || !entries[0].target) return;

            const newRect = entries[0].contentRect;
            chart.applyOptions({
                width: newRect.width,
                height: newRect.height,
            });

            // Optional: Request animation frame to ensure fitContent happens after layout update
            requestAnimationFrame(() => {
                chart.timeScale().fitContent();
            });
        });

        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
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

        // ONLY fit content if this is the initial load (chart thinks it's empty or we explicitly want to)
        // We use a separate effect for explicit resets now, so we don't need to force it here every time.
        // However, on FIRST load of a new symbol/timeframe, we likely want to fit.
        // But since 'candles' updates every second, we MUST NOT fitContent every time.
    }, [candles]);

    // Initial Fit Content when data creates
    useEffect(() => {
        if (candleSeriesRef.current && candles.length > 0 && chartRef.current && !isLoading) {
            chartRef.current.timeScale().fitContent();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, symbol, timeframe]); // Re-fit when symbol/timeframe changes and finishes loading

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

    // FVG Visualization Layer
    const { activeZones } = useStrategyMarkers(candles, selectedStrategy);
    const fvgSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

    useEffect(() => {
        if (!chartRef.current || !activeZones || candles.length === 0) return;

        // Initialize Series if needed
        if (!fvgSeriesRef.current) {
            fvgSeriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
                upColor: 'rgba(34, 197, 94, 0.15)', // Smooth Green
                downColor: 'rgba(239, 68, 68, 0.15)', // Smooth Red
                borderVisible: false, // Critical fix: Remove grid effect
                wickVisible: false,
            });
        }

        // Project Zones Forward
        // We iterate and map time -> closest zone (most recent)
        const zoneMap = new Map<number, CandlestickData>();
        const lastCandleTime = candles[candles.length - 1]?.time / 1000;

        activeZones.forEach(zone => {
            const startTime = zone.start / 1000;
            const endTime = zone.end ? zone.end / 1000 : lastCandleTime;

            candles.forEach(c => {
                const t = c.time / 1000;
                if (t >= startTime && t <= endTime) {
                    // Logic: Overwrite with this zone.
                    // This creates a "Solid" strip. 
                    zoneMap.set(t, {
                        time: t as Time,
                        open: zone.top,
                        high: zone.top,
                        low: zone.bottom,
                        close: zone.bottom,
                        color: zone.type === 'BULLISH' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    });
                }
            });
        });

        const fvgData = Array.from(zoneMap.values()).sort((a, b) => (a.time as number) - (b.time as number));
        fvgSeriesRef.current.setData(fvgData);

    }, [activeZones, candles]);

    // Plot Key Levels
    useEffect(() => {
        if (!candleSeriesRef.current) return;

        // Clear existing lines
        priceLinesRef.current.forEach(line => {
            candleSeriesRef.current?.removePriceLine(line);
        });
        priceLinesRef.current = [];

        // If enabled and data exists, draw new lines
        if (settings.showKeyLevels && levels) {
            const createLine = (price: number, color: string, title: string) => {
                const line = candleSeriesRef.current?.createPriceLine({
                    price: price,
                    color: color,
                    lineWidth: 1,
                    lineStyle: 2, // Dashed
                    axisLabelVisible: true,
                    title: title,
                });
                if (line) priceLinesRef.current.push(line);
            };

            createLine(levels.r2, '#f43f5e', 'R2');
            createLine(levels.r1, '#fb7185', 'R1');
            createLine(levels.p, '#fbbf24', 'Pivot');
            createLine(levels.s1, '#34d399', 'S1');
            createLine(levels.s2, '#10b981', 'S2');
        }

    }, [settings.showKeyLevels, levels]);

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
                    <div className="relative group">
                        <select
                            value={timeframe}
                            onChange={(e) => {
                                if (!controlledTimeframe) {
                                    setInternalTimeframe(e.target.value as Timeframe);
                                }
                            }}
                            disabled={!!controlledTimeframe}
                            className={`appearance-none pl-3 pr-9 py-1.5 text-xs font-medium bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/50 hover:border-emerald-500/50 transition-colors cursor-pointer ${controlledTimeframe ? 'opacity-50 cursor-not-allowed bg-muted' : ''}`}
                        >
                            <option value="1m">1m</option>
                            <option value="5m">5m</option>
                            <option value="15m">15m</option>
                            <option value="30m">30m</option>
                            <option value="1h">1h</option>
                            <option value="2h">2h</option>
                            <option value="4h">4h</option>
                            <option value="1d">1d</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none group-hover:text-emerald-500 transition-colors" />
                    </div>

                    {/* Strategy Selector */}
                    <div className="relative group">
                        <select
                            value={selectedStrategy || ''}
                            onChange={(e) => {
                                const newStrategy = e.target.value as StrategyName || null;
                                // Only update internal state if NOT controlled (or update it anyway to keep in sync, but rely on prop)
                                if (strategy === undefined) {
                                    setInternalStrategy(newStrategy);
                                }
                                onStrategyChange?.(newStrategy);
                            }}
                            className="appearance-none pl-3 pr-9 py-1.5 text-xs font-medium bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/50 hover:border-emerald-500/50 transition-colors cursor-pointer min-w-[140px]"
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
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none group-hover:text-emerald-500 transition-colors" />
                    </div>
                </div>
            </div>

            {/* Strategy Status */}
            {selectedStrategy && (
                <div className="px-3 py-2 bg-muted/20 border-b border-border flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                        <span className="font-semibold">Status:</span>{' '}
                        {isLoading ? (
                            <span className="text-emerald-500 animate-pulse">Analyzing...</span>
                        ) : error ? (
                            <span className="text-rose-500">Data Error</span>
                        ) : (
                            strategyStatus
                        )}
                    </div>
                    {/* Status Indicator Dot */}
                    {!isLoading && !error && (
                        <div className={`w-2 h-2 rounded-full ${sentiment === 'BULLISH' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                            sentiment === 'BEARISH' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' :
                                'bg-zinc-500'
                            }`} />
                    )}
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

                {/* Backtest Overlay Summary */}
                {isBacktestMode && backtestResult && (
                    <div className="absolute top-4 left-4 z-20 bg-background/90 backdrop-blur border border-emerald-500/30 rounded-lg p-3 shadow-xl animate-in fade-in zoom-in-95 duration-200 min-w-[180px]">
                        <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
                            <Trophy className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Backtest Result</span>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Trades</span>
                                <span className="font-mono font-bold text-foreground">{backtestResult.totalTrades}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Win Rate</span>
                                <span className={`font-mono font-bold ${backtestResult.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {backtestResult.winRate.toFixed(1)}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Est. PnL</span>
                                <span className={`font-mono font-bold ${backtestResult.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    ${backtestResult.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Pos Size</span>
                                <span className="font-mono font-bold text-foreground">$1,000</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
