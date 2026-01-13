/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';
import { Candle } from '@/lib/types';

export async function fetchHistoricalData(symbol: string, interval: string = '1d'): Promise<Candle[]> {
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
                headers: { 'User-Agent': 'CoinBob/1.0' },
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
