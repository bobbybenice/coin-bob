'use client';

import { useEffect, useRef } from 'react';
import { Asset, TrendDirection } from '../types';
import { useTrendsStore } from '../store';
import { fetchHistoricalData } from '../services/market';
import { EMA, RSI } from 'technicalindicators';
import { executeStrategy, getAllStrategyNames } from '../engine/strategies';

// Helper to calculate trend
function getTrend(closes: number[]): TrendDirection {
    if (closes.length < 200) return 'NEUTRAL';
    const period = 50; // Use EMA50 for quick trend check
    const ema = EMA.calculate({ period, values: closes });
    const lastEma = ema[ema.length - 1];
    const lastClose = closes[closes.length - 1];

    // Simple logic: Price > EMA50 = UP
    return lastClose > lastEma ? 'UP' : 'DOWN';
}

function getRSI(closes: number[]): number {
    if (closes.length < 14) return 50;
    const rsi = RSI.calculate({ values: closes, period: 14 });
    return rsi[rsi.length - 1] || 50;
}

// Robust MFI Calculation (Manual implementation to avoid Library edge cases)
function getMFI(high: number[], low: number[], close: number[], volume: number[]): number {
    if (close.length < 15) return 50;

    try {
        const period = 14;
        const typicalPrices: number[] = [];
        const moneyFlows: { pos: number, neg: number }[] = [];

        // 1. Calculate Typical Prices
        for (let i = 0; i < close.length; i++) {
            typicalPrices.push((high[i] + low[i] + close[i]) / 3);
        }

        // 2. Calculate Flows
        for (let i = 1; i < typicalPrices.length; i++) {
            const currentTP = typicalPrices[i];
            const prevTP = typicalPrices[i - 1];
            const rawFlow = currentTP * volume[i];

            if (currentTP > prevTP) {
                moneyFlows.push({ pos: rawFlow, neg: 0 });
            } else if (currentTP < prevTP) {
                moneyFlows.push({ pos: 0, neg: rawFlow });
            } else {
                moneyFlows.push({ pos: 0, neg: 0 });
            }
        }

        // 3. Sum last 14 periods
        // moneyFlows has length N-1.
        // We want the last 14 flows.
        if (moneyFlows.length < period) return 50;

        const recentFlows = moneyFlows.slice(-period);
        const totalPos = recentFlows.reduce((sum, f) => sum + f.pos, 0);
        const totalNeg = recentFlows.reduce((sum, f) => sum + f.neg, 0);

        // 4. Calculate Ratio
        // If Negative Flow is 0 -> Infinite Ratio -> MFI 100
        if (totalNeg === 0) {
            if (totalPos === 0) return 50; // Zero volume flatline
            return 100;
        }

        const mfr = totalPos / totalNeg;
        const mfi = 100 - (100 / (1 + mfr));

        // Clamping to sane 0-100 (though math ensures it)
        return Math.max(0, Math.min(100, mfi));

    } catch (e) {
        console.warn('MFI Calculation Failed', e);
        return 50;
    }
}

export function useTrendScanner(assets: Asset[]) {
    // NOTE: We do NOT destructure scanProgress here to avoid re-renders when it updates
    // We only need the update actions
    const { updateAssetTrend, trends, updateScanProgress } = useTrendsStore();

    // Internal state refs to managing scanning logic without triggering re-renders
    const processingRef = useRef<boolean>(false);
    const scannedAssetsRef = useRef<Set<string>>(new Set());
    const errorCountRef = useRef<number>(0);
    const lastErrorTimeRef = useRef<number>(0);
    const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialScanRef = useRef<boolean>(true);
    const isInitializedRef = useRef<boolean>(false);

    useEffect(() => {
        if (assets.length === 0) return;

        // Initialize scan progress once per mount
        if (!isInitializedRef.current) {
            updateScanProgress({ total: assets.length, isInitialScan: true, scanned: 0 });
            isInitializedRef.current = true;
        }

        const processAssetBatch = async (batchAssets: Asset[]) => {
            if (processingRef.current) return;
            processingRef.current = true;

            try {
                // Process batch in parallel
                await Promise.all(batchAssets.map(async (asset) => {
                    try {
                        // Check cache validity - 2 minutes for balance between freshness and rate limiting
                        const cached = trends[asset.symbol];
                        const now = Date.now();

                        // During initial scan, skip recently cached assets
                        // During maintenance, refresh stale cache
                        if (cached?.lastUpdated) {
                            const cacheAge = now - cached.lastUpdated;
                            const cacheLimit = 2 * 60 * 1000;
                            if (cacheAge < cacheLimit) {
                                // Mark as scanned even if using cache
                                if (isInitialScanRef.current && !scannedAssetsRef.current.has(asset.symbol)) {
                                    scannedAssetsRef.current.add(asset.symbol);
                                    updateScanProgress({ scanned: scannedAssetsRef.current.size });
                                }
                                return;
                            }
                        }

                        // Fetch concurrent
                        const symbol = asset.symbol.toUpperCase().endsWith('USDT') ? asset.symbol : `${asset.symbol}USDT`;

                        // Fetch 6 timeframes
                        const isFutures = asset.isPerpetual ?? false;
                        const [d1, h4, h1, m30, m15, m5] = await Promise.all([
                            fetchHistoricalData(symbol, '1d', isFutures),
                            fetchHistoricalData(symbol, '4h', isFutures),
                            fetchHistoricalData(symbol, '1h', isFutures),
                            fetchHistoricalData(symbol, '30m', isFutures),
                            fetchHistoricalData(symbol, '15m', isFutures),
                            fetchHistoricalData(symbol, '5m', isFutures)
                        ]);

                        // Map results for easy access
                        const tfMap = {
                            '1d': d1,
                            '4h': h4,
                            '1h': h1,
                            '30m': m30,
                            '15m': m15,
                            '5m': m5
                        };

                        // Legacy Calcs
                        let legacyData: Record<string, unknown> = {};
                        if (h4.length > 50 && h1.length > 50 && m15.length > 50) {
                            const c4h = h4.map(c => c.close);
                            const c1d = d1.map(c => c.close);
                            const c1h = h1.map(c => c.close);
                            const c15m = m15.map(c => c.close);

                            const t4h = getTrend(c4h);
                            const t1d = getTrend(c1d);
                            const t1h = getTrend(c1h);
                            const t15m = getTrend(c15m);

                            const rsi4h = getRSI(c4h);
                            const rsi1h = getRSI(c1h);
                            const rsi15m = getRSI(c15m);

                            const mfi4h = getMFI(h4.map(c => c.high), h4.map(c => c.low), c4h, h4.map(c => c.volume));
                            const mfi1h = getMFI(h1.map(c => c.high), h1.map(c => c.low), c1h, h1.map(c => c.volume));
                            const mfi15m = getMFI(m15.map(c => c.high), m15.map(c => c.low), c15m, m15.map(c => c.volume));

                            legacyData = { t4h, t1d, t1h, t15m, rsi4h, rsi1h, rsi15m, mfi4h, mfi1h, mfi15m };
                        }

                        // Strategy Scan
                        const strategyResults: Record<string, Record<string, 'LONG' | 'SHORT' | null>> = {};
                        const strategies = getAllStrategyNames();

                        strategies.forEach(strategyName => {
                            strategyResults[strategyName] = {};

                            Object.entries(tfMap).forEach(([tf, candles]) => {
                                if (candles.length < 50) return;

                                const result = executeStrategy(strategyName, candles);

                                if (result.status === 'ENTRY' || result.status === 'WATCH') {
                                    const side = result.metadata?.side;
                                    if (side === 'LONG' || side === 'SHORT') {
                                        strategyResults[strategyName][tf] = side;
                                    } else {
                                        if (strategyName === 'ICT' && result.metadata?.sweep) {
                                            strategyResults[strategyName][tf] = result.metadata.sweep === 'BULLISH' ? 'LONG' : 'SHORT';
                                        } else if (strategyName === 'ICT' && result.metadata?.fvg) {
                                            strategyResults[strategyName][tf] = result.metadata.fvg === 'BULLISH' ? 'LONG' : 'SHORT';
                                        }
                                    }
                                } else {
                                    strategyResults[strategyName][tf] = null;
                                }
                            });
                        });

                        updateAssetTrend(asset.symbol, { ...legacyData, strategies: strategyResults });

                        // Track progress
                        if (isInitialScanRef.current && !scannedAssetsRef.current.has(asset.symbol)) {
                            scannedAssetsRef.current.add(asset.symbol);
                            updateScanProgress({ scanned: scannedAssetsRef.current.size });
                        }

                        errorCountRef.current = 0;

                    } catch (e) {
                        console.error('Failed to scan asset', asset.symbol, e);
                        errorCountRef.current++;
                        lastErrorTimeRef.current = Date.now();
                    }
                }));

            } finally {
                processingRef.current = false;
            }
        };

        const runScanner = async () => {
            // Check if initial scan is complete
            const isInitialComplete = scannedAssetsRef.current.size >= assets.length;

            if (isInitialComplete && isInitialScanRef.current) {
                isInitialScanRef.current = false;
                updateScanProgress({ isInitialScan: false });
                console.log('[TrendScanner] Initial scan complete. Switching to maintenance mode.');

                // IMPORTANT: Restart interval with slower speed
                if (intervalIdRef.current) {
                    clearInterval(intervalIdRef.current);
                    intervalIdRef.current = setInterval(runScanner, 10000);
                }
            }

            // Adaptive batch size
            const batchSize = isInitialScanRef.current ? 5 : 1;

            // Error backoff
            const timeSinceError = Date.now() - lastErrorTimeRef.current;
            const hasRecentErrors = errorCountRef.current > 0 && timeSinceError < 60000;

            if (hasRecentErrors) {
                const backoffDelay = Math.min(30000, 1000 * Math.pow(2, errorCountRef.current));
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }

            // Select assets to process
            let assetsToProcess: Asset[];

            if (isInitialScanRef.current) {
                assetsToProcess = assets
                    .filter(a => !scannedAssetsRef.current.has(a.symbol))
                    .slice(0, batchSize);
            } else {
                const sortedByAge = [...assets].sort((a, b) => {
                    const ageA = trends[a.symbol]?.lastUpdated || 0;
                    const ageB = trends[b.symbol]?.lastUpdated || 0;
                    return ageA - ageB; // Oldest first
                });
                assetsToProcess = sortedByAge.slice(0, batchSize);
            }

            if (assetsToProcess.length > 0) {
                await processAssetBatch(assetsToProcess);
            }
        };

        // Start scanning
        const initialInterval = 500;

        // Run immediately
        runScanner();

        // Start interval
        intervalIdRef.current = setInterval(runScanner, initialInterval);

        return () => {
            if (intervalIdRef.current) {
                clearInterval(intervalIdRef.current);
                intervalIdRef.current = null;
            }
        };

        // CRITICAL: Empty dependency array implicitly (conceptually) or minimally
        // We do NOT include `scanProgress` or `trends` because used via Refs or Setters
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assets, updateAssetTrend, updateScanProgress]);
}
