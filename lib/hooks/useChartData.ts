import { useState, useEffect } from 'react';
import { Candle, Timeframe } from '@/lib/types';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const SPOT_API = 'https://api.binance.com/api/v3';
const FUTURES_API = 'https://fapi.binance.com/fapi/v1';
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
        '1h': '1h',
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
        // Spot: ETHUSDT. Futures: ETHUSDT (mostly same, but let's be safe). 
        // If coming from symbol like 'ETH', we append USDT. 
        // If symbol already has USDT, leave it.
        const baseSymbol = symbol.toUpperCase().replace('USDT', '') + 'USDT';
        const wsSymbol = baseSymbol.toLowerCase();

        // Select API
        const API_BASE = isFutures ? FUTURES_API : SPOT_API;
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
                // Spot uses /klines, Futures uses /klines so path is same, just base differs
                const response = await fetch(
                    `${API_BASE}/klines?symbol=${baseSymbol}&interval=${interval}&limit=${limit}`
                );

                if (!response.ok) {
                    throw new Error(`Failed to fetch klines: ${response.statusText}`);
                }

                const data = await response.json();

                if (!isMounted) return;

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
                    timestamp: Date.now()
                });

                setCandles(parsedCandles);
            } catch (err) {
                if (isMounted) {
                    // Futures might return 400 for invalid symbol if not available on futures
                    setError(err instanceof Error ? err.message : 'Unknown error');
                    console.error('Error fetching chart data:', err);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
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

                    setCandles(prev => {
                        if (prev.length === 0) return [newCandle];
                        const lastCandle = prev[prev.length - 1];

                        // If update to current candle
                        if (lastCandle.time === newCandle.time) {
                            const newCandles = [...prev];
                            newCandles[prev.length - 1] = newCandle;
                            return newCandles;
                        }

                        // If new candle started
                        if (newCandle.time > lastCandle.time) {
                            return [...prev, newCandle];
                        }

                        return prev;
                    });
                }
            };

            ws.onerror = (e) => {
                console.error('WebSocket error:', e);
            };
        });

        return () => {
            isMounted = false;
            if (ws) ws.close();
        };
    }, [symbol, timeframe, limit, isFutures]);

    return { candles, isLoading, error };
}
