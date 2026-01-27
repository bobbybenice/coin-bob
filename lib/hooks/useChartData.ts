import { useState, useEffect, useRef } from 'react';
import { Candle, Timeframe } from '@/lib/types';
import { fetchHistoricalData } from '@/lib/services/market';
import { FUTURES_SYMBOL_MAP } from '@/lib/services/futures';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const FUTURES_WS = 'wss://fstream.binance.com/ws';

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
        '15m': '15m',
        '30m': '30m',
        '1h': '1h',
        '2h': '2h',
        '4h': '4h',
        '1d': '1d'
    };
    return map[tf];
}

/**
 * Helper to deduplicate and sort candles by time
 * This prevents chart errors where timestamps must be unique and ascending
 */
function deduplicateAndSort(candles: Candle[]): Candle[] {
    if (!candles || candles.length === 0) return [];

    const map = new Map<number, Candle>();
    candles.forEach(c => map.set(c.time, c));

    return Array.from(map.values()).sort((a, b) => a.time - b.time);
}

/**
 * Hook to fetch and cache chart data (klines) from Binance (Futures Only)
 */
export function useChartData(symbol: string, timeframe: Timeframe, limit: number = 500) {
    const [candles, setCandles] = useState<Candle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Keep track of the latest candles ref to avoid stale closures in WS callbacks
    const candlesRef = useRef<Candle[]>([]);
    useEffect(() => {
        candlesRef.current = candles;
    }, [candles]);

    useEffect(() => {
        // Reset state when inputs change
        setCandles([]);
        setIsLoading(true);
        setError(null);

        // Cache Key needs to include futures flag
        const cacheKey = `F_${symbol}_${timeframe}_${limit}`;

        // Symbol formatting
        const baseSymbol = symbol.toUpperCase().replace('USDT', '') + 'USDT';

        let wsSymbol = baseSymbol.toLowerCase();
        const mapped = FUTURES_SYMBOL_MAP[baseSymbol];
        if (mapped) wsSymbol = mapped.toLowerCase();

        // Select API
        const WS_BASE = FUTURES_WS;

        let ws: WebSocket | null = null;
        let isMounted = true;

        // Check cache first
        const cached = cache.get(cacheKey);
        const now = Date.now();

        // Fetch fresh historical data
        const fetchData = async () => {
            if (cached && now - cached.timestamp < CACHE_DURATION) {
                setCandles(cached.data);
                setIsLoading(false);
                return;
            }

            try {
                const interval = convertTimeframe(timeframe);

                // Use Server Action with multiple fallbacks (Binance Global -> Coinbase -> Binance US)
                // isFutures is always true now
                const fetchedCandles = await fetchHistoricalData(baseSymbol, interval, true);

                if (!isMounted) return;

                if (!fetchedCandles || fetchedCandles.length === 0) {
                    throw new Error('No Data Found (Check Network/Symbol)');
                }

                // Ensure data is clean before using
                const cleanData = deduplicateAndSort(fetchedCandles);

                // Update cache
                cache.set(cacheKey, {
                    data: cleanData,
                    timestamp: Date.now()
                });

                setCandles(cleanData);
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Failed to load chart data');
                    console.error('Data Load Error:', err);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        // Buffer for throttling updates
        let pendingCandle: Candle | null = null;
        let throttleTimer: NodeJS.Timeout | null = null;

        const flushBuffer = () => {
            if (!pendingCandle || !isMounted) return;

            const bufferedCandle = pendingCandle;

            setCandles(prev => {
                const currentData = prev.length > 0 ? prev : candlesRef.current;

                if (currentData.length === 0) return [bufferedCandle];

                // Merge strategy:
                // 1. If timestamp exists, overwrite
                // 2. If timestamp is new, append
                // 3. Ensure strictly sorted

                const lastCandle = currentData[currentData.length - 1];

                // Optimization: Update in place if it's the same latest candle
                if (lastCandle.time === bufferedCandle.time) {
                    // Only update if values changed significantly or it's a live update
                    const updated = [...currentData];
                    updated[currentData.length - 1] = bufferedCandle;
                    return updated;
                }

                // If it's a new candle, append it
                if (bufferedCandle.time > lastCandle.time) {
                    return [...currentData, bufferedCandle];
                }

                // If it's older data (late arrival), we need to do a full sort join
                // This is rare for live streams but possible
                return deduplicateAndSort([...currentData, bufferedCandle]);
            });
            pendingCandle = null;
            throttleTimer = null;
        };

        fetchData().then(() => {
            if (!isMounted) return;

            // Start WebSocket for real-time updates
            const interval = convertTimeframe(timeframe);
            const wsUrl = `${WS_BASE}/${wsSymbol}@kline_${interval}`;

            ws = new WebSocket(wsUrl);

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.e === 'kline') {
                        const k = message.k;
                        const newCandle: Candle = {
                            time: k.t,
                            open: parseFloat(k.o),
                            high: parseFloat(k.h),
                            low: parseFloat(k.l),
                            close: parseFloat(k.c),
                            volume: parseFloat(k.v)
                        };

                        // Update local buffer
                        pendingCandle = newCandle;

                        // Schedule flush if not already scheduled
                        if (!throttleTimer) {
                            throttleTimer = setTimeout(flushBuffer, 200); // 200ms throttle
                        }
                    }
                } catch (e) {
                    console.error('WS Parse Error', e);
                }
            };

            ws.onerror = (e) => {
                console.error('WebSocket error:', e);
            };
        });

        return () => {
            isMounted = false;
            if (ws) ws.close();
            if (throttleTimer) clearTimeout(throttleTimer);
        };
    }, [symbol, timeframe, limit]);

    return { candles, isLoading, error };
}

