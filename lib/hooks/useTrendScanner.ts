'use client';

import { useEffect, useRef } from 'react';
import { Asset, TrendDirection } from '../types';
import { useUserStore } from '../store';
import { fetchHistoricalData } from '../services/market';
import { EMA } from 'technicalindicators';

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
                const idx = indexRef.current % assets.length;
                const asset = assets[idx];
                indexRef.current = (indexRef.current + 1) % assets.length;

                // Check cache validity (1 hour)
                const cached = trends[asset.symbol];
                const now = Date.now();
                if (cached && cached.lastUpdated && (now - cached.lastUpdated < 3600000)) {
                    // Valid cache, skip fetch logic but continue loop
                    processingRef.current = false;
                    return;
                }

                // Fetch 4H (Most important for God Mode)
                // We normalize symbols? Asset symbol is usually like 'BTC' or 'BTCUSDT'
                // Our fetch service expects 'BTCUSDT'
                const symbol = asset.symbol.toUpperCase().endsWith('USDT') ? asset.symbol : `${asset.symbol}USDT`;

                // Fetch 4h
                const h4 = await fetchHistoricalData(symbol, '4h');
                // Fetch 1h
                const h1 = await fetchHistoricalData(symbol, '1h');
                // Fetch 15m
                const m15 = await fetchHistoricalData(symbol, '15m');

                if (h4 && h1 && m15) {
                    const t4h = getTrend(h4.map(c => c.close));
                    const t1h = getTrend(h1.map(c => c.close));
                    const t15m = getTrend(m15.map(c => c.close));

                    updateAssetTrend(asset.symbol, { t4h, t1h, t15m });
                }

            } catch (e) {
                console.error("Scanner Error", e);
            } finally {
                processingRef.current = false;
            }
        };

        const interval = setInterval(processNextAsset, 1000); // 1 asset per second
        return () => clearInterval(interval);
    }, [assets, trends, updateAssetTrend]);
}
