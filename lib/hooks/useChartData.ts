import { useState, useEffect } from 'react';
import { Candle, Timeframe } from '@/lib/types';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const BINANCE_API_BASE = 'https://api.binance.com/api/v3';

interface CacheEntry {
    data: Candle[];
    timestamp: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Convert Binance timeframe format
 */
function convertTimeframe(tf: Timeframe): string {
    const map: Record<Timeframe, string> = {
        '1m': '1m',
        '5m': '5m',
        '1h': '1h',
        '4h': '4h',
        '1d': '1d'
    };
    return map[tf];
}

/**
 * Hook to fetch and cache chart data (klines) from Binance
 */
export function useChartData(symbol: string, timeframe: Timeframe, limit: number = 500) {
    const [candles, setCandles] = useState<Candle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const cacheKey = `${symbol}_${timeframe}_${limit}`;

        // Check cache first
        const cached = cache.get(cacheKey);
        const now = Date.now();

        if (cached && now - cached.timestamp < CACHE_DURATION) {
            setCandles(cached.data);
            setIsLoading(false);
            return;
        }

        // Fetch fresh data
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const binanceSymbol = symbol.replace('USDT', '') + 'USDT';
                const interval = convertTimeframe(timeframe);

                const response = await fetch(
                    `${BINANCE_API_BASE}/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`
                );

                if (!response.ok) {
                    throw new Error(`Failed to fetch klines: ${response.statusText}`);
                }

                const data = await response.json();

                const parsedCandles: Candle[] = data.map((k: unknown[]) => ({
                    time: k[0] as number,
                    open: parseFloat(k[1] as string),
                    high: parseFloat(k[2] as string),
                    low: parseFloat(k[3] as string),
                    close: parseFloat(k[4] as string),
                    volume: parseFloat(k[5] as string)
                }));

                // Update cache
                cache.set(cacheKey, {
                    data: parsedCandles,
                    timestamp: now
                });

                setCandles(parsedCandles);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
                console.error('Error fetching chart data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [symbol, timeframe, limit]);

    return { candles, isLoading, error };
}
