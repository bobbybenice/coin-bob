'use client';

import useSWR from 'swr';
import { fetchHistoricalData } from '../services/market';
import { Candle } from '../types';

/**
 * useMultiTimeframeData Hook
 * 
 * Fetches higher timeframe data (1H, 4H, 1D) for the given symbol to support MTF strategies.
 * Used primarily in the Chart View (AnalysisEngine).
 */
export function useMultiTimeframeData(symbol: string) {
    const isFutures = symbol.includes('PERP') || true; // Simplification, assumption based on project moving to Futures only

    const fetcher = async (s: string) => {
        const [h1, h4, d1] = await Promise.all([
            fetchHistoricalData(s, '1h', isFutures),
            fetchHistoricalData(s, '4h', isFutures),
            fetchHistoricalData(s, '1d', isFutures)
        ]);
        return {
            '1h': h1,
            '4h': h4,
            '1d': d1
        };
    };

    // Refresh every 5 minutes
    const { data, error, isLoading } = useSWR(symbol ? `mtf-${symbol}` : null, () => fetcher(symbol), {
        refreshInterval: 5 * 60 * 1000,
        revalidateOnFocus: false
    });

    return {
        multiTimeframeCandles: data as Record<string, Candle[]> | undefined,
        isLoading,
        error
    };
}
