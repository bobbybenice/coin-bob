'use client';

import { useEffect, useRef } from 'react';
import { Asset, TrendDirection } from '../types';
import { useUserStore } from '../store';
import { fetchHistoricalData } from '../services/market';
import { EMA, RSI, MFI } from 'technicalindicators';

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

function getMFI(high: number[], low: number[], close: number[], volume: number[]): number {
    if (close.length < 14) return 50;
    try {
        const mfi = MFI.calculate({
            high,
            low,
            close,
            volume,
            period: 14
        });
        const lastValue = mfi[mfi.length - 1];

        // Validation and Clamping
        if (typeof lastValue !== 'number' || isNaN(lastValue)) return 50;
        return Math.max(0, Math.min(100, lastValue));
    } catch (e) {
        return 50;
    }
}

export function useTrendScanner(assets: Asset[]) {
    const { updateAssetTrend, trends } = useUserStore();
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

                // Check cache validity (60 mins)
                const cached = trends[asset.symbol];
                const now = Date.now();
                if (cached && cached.lastUpdated && (now - cached.lastUpdated < 3600000)) {
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

                // Ensure we have enough data (at least 30 candles)
                if (h4.length > 30 && h1.length > 30 && m15.length > 30) {
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

            } catch (e) {
                console.error("Scanner Error", e);
            } finally {
                processingRef.current = false;
            }
        };

        const interval = setInterval(processNextAsset, 250); // 4 assets/sec
        return () => clearInterval(interval);
    }, [assets, trends, updateAssetTrend]);
}
