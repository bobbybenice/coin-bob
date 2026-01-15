'use server';

/* eslint-disable @typescript-eslint/no-explicit-any */

const FAPI_BASE = 'https://fapi.binance.com';

export interface FuturesTicker {
    symbol: string;
    lastPrice: string;
    priceChangePercent: string;
    quoteVolume: string; // Volume in USDT
}

export interface PremiumIndex {
    symbol: string;
    lastFundingRate: string;
    nextFundingTime: number;
}

export interface OpenInterest {
    symbol: string;
    openInterest: string; // In base asset
    // We usually need to convert to USD using price, or use a different endpoint if available.
    // simpler: fetch ticker price * OI
}

// Batch fetch 24h ticker for all symbols (lightweight)
export async function fetchFuturesDailyStats(): Promise<FuturesTicker[]> {
    try {
        const res = await fetch(`${FAPI_BASE}/fapi/v1/ticker/24hr`, {
            next: { revalidate: 10 }, // 10 seconds cache
            headers: { 'User-Agent': 'CoinBob/1.0' }
        });
        if (!res.ok) throw new Error('Failed to fetch futures ticker');
        return await res.json();
    } catch (error) {
        console.error('Futures Ticker Error:', error);
        return [];
    }
}

// Batch fetch Premium Index (contains Funding Rate)
export async function fetchFundingRates(): Promise<PremiumIndex[]> {
    try {
        const res = await fetch(`${FAPI_BASE}/fapi/v1/premiumIndex`, {
            next: { revalidate: 60 }, // 1 min cache
            headers: { 'User-Agent': 'CoinBob/1.0' }
        });
        if (!res.ok) throw new Error('Failed to fetch funding rates');
        return await res.json();
    } catch (error) {
        console.error('Funding Rate Error:', error);
        return [];
    }
}

// Fetch Open Interest for a SPECIFIC symbol (Binance doesn't have a lightweight "ALL" OI endpoint public easily)
// Actually, /fapi/v1/openInterest is Symbol required.
// We can't loop 50 times on server every refresh easily.
// Strategy: Only fetch OI for the *active* asset, or fetch top assets.
// OR: Use a separate endpoint or Aggregation if possible.
// For the Screener, ignoring OI column for ALL assets might be wise to avoid rate limits, 
// OR we just show Funding Rate in the screener table, and OI only in the specific Analyis view.
// Let's implement single fetch for now.
export async function fetchOpenInterest(symbol: string): Promise<number> {
    try {
        const res = await fetch(`${FAPI_BASE}/fapi/v1/openInterest?symbol=${symbol}`, {
            next: { revalidate: 60 },
            headers: { 'User-Agent': 'CoinBob/1.0' }
        });
        if (!res.ok) return 0;
        const data = await res.json();
        // data.openInterest is in Base Asset (e.g. BTC). data.openInterest * price ~ Notional Value usually provided?
        // Actually response is { symbol, openInterest, time }
        // We might need to multiply by price to get USD value if needed, but raw is fine.
        return parseFloat(data.openInterest);
    } catch {
        return 0;
    }
}

export async function fetchFuturesKlines(symbol: string, interval: string = '1h', limit: number = 100) {
    try {
        const res = await fetch(`${FAPI_BASE}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`, {
            cache: 'no-store'
        });
        if (!res.ok) return [];
        const json = await res.json();
        if (!Array.isArray(json)) return [];

        return json.map((d: any[]) => ({
            time: d[0],
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
            volume: parseFloat(d[5])
        }));
    } catch (error) {
        console.error(`Futures Klines Error for ${symbol}:`, error);
        return [];
    }
}
