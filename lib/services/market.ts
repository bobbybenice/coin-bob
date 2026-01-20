/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';
import { Candle } from '@/lib/types';

export async function fetchHistoricalData(symbol: string, interval: string = '1d', isFutures: boolean = false): Promise<Candle[]> {
    if (isFutures) {
        // Direct Futures Fetch (Single Source for now)
        const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=500`;
        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'CoinBob/1.0' }, cache: 'no-store' });
            if (res.ok) {
                const json = await res.json();
                return Array.isArray(json) ? json.map((d: any[]) => ({
                    time: d[0],
                    open: parseFloat(d[1]),
                    high: parseFloat(d[2]),
                    low: parseFloat(d[3]),
                    close: parseFloat(d[4]),
                    volume: parseFloat(d[5])
                })) : [];
            }
        } catch (e) {
            console.error(`Futures fetch failed for ${symbol}`, e);
            return [];
        }
    }

    const sources = [
        {
            name: 'Binance Global',
            url: `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=500`,
            adapter: (json: any): Candle[] => {
                return Array.isArray(json) ? json.map((d: any[]) => ({
                    time: d[0],
                    open: parseFloat(d[1]),
                    high: parseFloat(d[2]),
                    low: parseFloat(d[3]),
                    close: parseFloat(d[4]),
                    volume: parseFloat(d[5])
                })) : [];
            }
        },
        // ... (Coinbase and Binance US remain below)
        {
            name: 'Coinbase Public',
            url: (() => {
                // Map interval to Coinbase granularity
                const granularityMap: Record<string, number> = {
                    '1m': 60,
                    '5m': 300,
                    '15m': 900,
                    '1h': 3600,
                    '4h': 21600, // 6h closest, or calculate manually. Coinbase supports 1m, 5m, 15m, 1h, 6h, 1d
                    '1d': 86400
                };

                // Handle symbol mapping (BCHUSDT -> BCH-USD)
                // Remove USDT/USDC suffix and append -USD
                const baseSymbol = symbol.replace(/USDT$|USDC$/, '') + '-USD';

                const granularity = granularityMap[interval] || 900;
                return `https://api.exchange.coinbase.com/products/${baseSymbol}/candles?granularity=${granularity}`;
            })(),
            adapter: (json: any): Candle[] => {
                // Coinbase: [time, low, high, open, close, volume]
                // Time is seconds. Order is Newest First.
                return Array.isArray(json) ? json.map((d: any[]) => ({
                    time: d[0] * 1000,
                    low: d[1],
                    high: d[2],
                    open: d[3],
                    close: d[4],
                    volume: d[5]
                })).reverse() : []; // Reverse to match Binance (Oldest First)
            }
        },
        {
            name: 'Binance US', // Good for US IP addresses 
            url: `https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=500`,
            adapter: (json: any): Candle[] => {
                return Array.isArray(json) ? json.map((d: any[]) => ({
                    time: d[0],
                    open: parseFloat(d[1]),
                    high: parseFloat(d[2]),
                    low: parseFloat(d[3]),
                    close: parseFloat(d[4]),
                    volume: parseFloat(d[5])
                })) : [];
            }
        }
    ];

    for (const source of sources) {
        try {
            const res = await fetch(source.url, {
                // headers: { 'User-Agent': 'CoinBob/1.0' }, // Removed to bypass WAF
                cache: 'no-store' // Critical: We use LocalStorage for caching now
            });
            if (!res.ok) continue;

            const json = await res.json();
            const candles = source.adapter(json);

            if (Array.isArray(candles) && candles.length >= 100) {
                return candles;
            }
        } catch (e) {
            console.warn(`Failed to fetch history from ${source.name} for ${symbol}:`, e);
        }
    }

    return [];
}

export async function fetchHistoricalDataBatch(symbols: string[], interval: string = '1d', isFutures: boolean = false): Promise<Record<string, Candle[]>> {
    const results: Record<string, Candle[]> = {};

    // Process in parallel with a concurrency limit if needed, 
    // but Next.js Server Actions usually handle this fine. 
    // Let's do chunked parallel execution to be safe.
    const CHUNK_SIZE = 5;

    for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
        const chunk = symbols.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async (symbol) => {
            try {
                results[symbol] = await fetchHistoricalData(symbol, interval, isFutures);
            } catch (e) {
                console.error(`Batch fetch failed for ${symbol}`, e);
                results[symbol] = [];
            }
        }));
    }

    return results;
}
