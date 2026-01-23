import { useState, useEffect } from 'react';
import { Candle, Timeframe } from '@/lib/types';
import { fetchHistoricalData } from '@/lib/services/market';
import { FUTURES_SYMBOL_MAP } from '@/lib/services/futures';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const SPOT_WS = 'wss://stream.binance.com:9443/ws';
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
 * Hook to fetch and cache chart data (klines) from Binance (Spot or Futures)
 */
export function useChartData(symbol: string, timeframe: Timeframe, isFutures: boolean, limit: number = 500) {
    const [candles, setCandles] = useState<Candle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Cache Key needs to include futures flag
        const cacheKey = `${isFutures ? 'F_' : 'S_'}${symbol}_${timeframe}_${limit}`;

        // Symbol formatting
        const baseSymbol = symbol.toUpperCase().replace('USDT', '') + 'USDT';

        let wsSymbol = baseSymbol.toLowerCase();
        if (isFutures) {
            const mapped = FUTURES_SYMBOL_MAP[baseSymbol];
            if (mapped) wsSymbol = mapped.toLowerCase();
        }

        // Select API
        const WS_BASE = isFutures ? FUTURES_WS : SPOT_WS;

        let ws: WebSocket | null = null;
        let isMounted = true;

        // Check cache first
        const cached = cache.get(cacheKey);
        const now = Date.now();

        if (cached && now - cached.timestamp < CACHE_DURATION) {
            setCandles(cached.data);
            setIsLoading(false);
        }

        // Fetch fresh historical data
        const fetchData = async () => {
            // Only set loading if we didn't have cache, or if cache is old
            if (!cached || now - cached.timestamp >= CACHE_DURATION) {
                setIsLoading(true);
            }
            setError(null);

            try {
                const interval = convertTimeframe(timeframe);

                // Use Server Action with multiple fallbacks (Binance Global -> Coinbase -> Binance US)
                // This replaces the direct client-side fetch which was brittle
                const fetchedCandles = await fetchHistoricalData(baseSymbol, interval, isFutures);

                if (!isMounted) return;

                if (!fetchedCandles || fetchedCandles.length === 0) {
                    throw new Error('No Data Found (Check Network/Symbol)');
                }

                // Update cache
                cache.set(cacheKey, {
                    data: fetchedCandles,
                    timestamp: Date.now()
                });

                setCandles(fetchedCandles);
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
                if (prev.length === 0) return [bufferedCandle];
                const lastCandle = prev[prev.length - 1];

                // Check if it's an update to the current candle
                if (lastCandle.time === bufferedCandle.time) {
                    // Only update if something changed (optimization)
                    if (lastCandle.close === bufferedCandle.close &&
                        lastCandle.volume === bufferedCandle.volume &&
                        lastCandle.high === bufferedCandle.high &&
                        lastCandle.low === bufferedCandle.low) {
                        return prev;
                    }

                    const newCandles = [...prev];
                    newCandles[prev.length - 1] = bufferedCandle;
                    return newCandles;
                }

                // New candle started
                if (bufferedCandle.time > lastCandle.time) {
                    return [...prev, bufferedCandle];
                }

                return prev;
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
    }, [symbol, timeframe, limit, isFutures]);

    return { candles, isLoading, error };
}
