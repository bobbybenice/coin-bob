'use client';

import { useEffect, useRef } from 'react';
import { Asset, TrendDirection } from '../types';
import { useTrendsStore } from '../store';
import { fetchHistoricalData } from '../services/market';
import { EMA, RSI } from 'technicalindicators';

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
    const { updateAssetTrend, trends } = useTrendsStore();
    const processingRef = useRef<boolean>(false);
    const indexRef = useRef<number>(0);

    useEffect(() => {
        if (assets.length === 0) return;

        const processNextAsset = async () => {
            if (processingRef.current) return;
            processingRef.current = true;

            try {
                // Round robin selection
                if (assets.length === 0) return;
                const idx = indexRef.current % assets.length;
                const asset = assets[idx];
                indexRef.current = (indexRef.current + 1) % assets.length;

                // Check cache validity (15 mins)
                const cached = trends[asset.symbol];
                const now = Date.now();
                if (cached && cached.lastUpdated && (now - cached.lastUpdated < 900000)) {
                    processingRef.current = false;
                    return;
                }

                // Fetch concurrent
                const symbol = asset.symbol.toUpperCase().endsWith('USDT') ? asset.symbol : `${asset.symbol}USDT`;

                const [h4, h1, m15] = await Promise.all([
                    fetchHistoricalData(symbol, '4h'),
                    fetchHistoricalData(symbol, '1h'),
                    fetchHistoricalData(symbol, '15m')
                ]);

                // Ensure we have enough data (at least 50 candles for stable RSI/EMA)
                if (h4.length > 50 && h1.length > 50 && m15.length > 50) {
                    const c4h = h4.map(c => c.close);
                    const c1h = h1.map(c => c.close);
                    const c15m = m15.map(c => c.close);

                    const t4h = getTrend(c4h);
                    const t1h = getTrend(c1h);
                    const t15m = getTrend(c15m);

                    const rsi4h = getRSI(c4h);
                    const rsi1h = getRSI(c1h);
                    const rsi15m = getRSI(c15m);

                    const mfi4h = getMFI(h4.map(c => c.high), h4.map(c => c.low), c4h, h4.map(c => c.volume));
                    const mfi1h = getMFI(h1.map(c => c.high), h1.map(c => c.low), c1h, h1.map(c => c.volume));
                    const mfi15m = getMFI(m15.map(c => c.high), m15.map(c => c.low), c15m, m15.map(c => c.volume));

                    updateAssetTrend(asset.symbol, { t4h, t1h, t15m, rsi4h, rsi1h, rsi15m, mfi4h, mfi1h, mfi15m });
                }

            } catch {
                console.error('Failed to parse scan timestamp');
            } finally {
                processingRef.current = false;
            }
        };

        const interval = setInterval(processNextAsset, 250); // 4 assets/sec
        return () => clearInterval(interval);
    }, [assets, trends, updateAssetTrend]);
}
