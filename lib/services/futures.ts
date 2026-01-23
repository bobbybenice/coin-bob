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
}


// CACHE STATE
let fundingCache: { data: PremiumIndex[], timestamp: number } | null = null;
let fundingPromise: Promise<PremiumIndex[]> | null = null;
const FUNDING_TTL = 60 * 1000; // 60 Seconds (Safe, as funding updates every 8h)

let tickerCache: { data: FuturesTicker[], timestamp: number } | null = null;
let tickerPromise: Promise<FuturesTicker[]> | null = null;
const TICKER_TTL = 1000; // 1 Second (Dedups simultaneous calls from multiple components)

// Batch fetch 24h ticker for all symbols (lightweight)
export async function fetchFuturesDailyStats(): Promise<FuturesTicker[]> {
    const now = Date.now();

    // 1. Return Cache if valid
    if (tickerCache && (now - tickerCache.timestamp < TICKER_TTL)) {
        return tickerCache.data;
    }

    // 2. Return In-Flight Promise to dedup simultaneous calls
    if (tickerPromise) return tickerPromise;

    // 3. Fetch New Data
    tickerPromise = (async () => {
        try {
            const res = await fetch(`${FAPI_BASE}/fapi/v1/ticker/24hr`, {
                // cache: 'no-store', // Optional: standard fetch cache control if needed, but defaults are usually fine for real-time
                // header moved to default
            });
            if (!res.ok) throw new Error('Failed to fetch futures ticker');
            const data = await res.json();

            tickerCache = { data, timestamp: Date.now() };
            return data;
        } catch (error) {
            console.error('Futures Ticker Error:', error);
            return [];
        } finally {
            tickerPromise = null;
        }
    })();

    return tickerPromise;
}

// Batch fetch Premium Index (contains Funding Rate)
export async function fetchFundingRates(): Promise<PremiumIndex[]> {
    const now = Date.now();

    // 1. Return Cache if valid (Aggressive caching for static-like data)
    if (fundingCache && (now - fundingCache.timestamp < FUNDING_TTL)) {
        return fundingCache.data;
    }

    if (fundingPromise) return fundingPromise;

    fundingPromise = (async () => {
        try {
            const res = await fetch(`${FAPI_BASE}/fapi/v1/premiumIndex`, {
                // header moved to default
            });
            if (!res.ok) throw new Error('Failed to fetch funding rates');
            const data = await res.json();

            fundingCache = { data, timestamp: Date.now() };
            return data;
        } catch (error) {
            console.error('Funding Rate Error:', error);
            return [];
        } finally {
            fundingPromise = null;
        }
    })();

    return fundingPromise;
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
            // header moved to default
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

// Map for Spot symbols -> Futures symbols (Binance uses 1000 prefix for meme coins)
const FUTURES_SYMBOL_MAP: Record<string, string> = {
    'BONKUSDT': '1000BONKUSDT',
    'PEPEUSDT': '1000PEPEUSDT',
    'SHIBUSDT': '1000SHIBUSDT',
    'FLOKIUSDT': '1000FLOKIUSDT',
    'LUNCUSDT': '1000LUNCUSDT',
    'XECUSDT': '1000XECUSDT',
    'SATSUSDT': '1000SATSUSDT',
    'RATSUSDT': '1000RATSUSDT'
};

export async function fetchFuturesKlines(symbol: string, interval: string = '1h', limit: number = 100) {
    try {
        const querySymbol = FUTURES_SYMBOL_MAP[symbol] || symbol;
        const res = await fetch(`${FAPI_BASE}/fapi/v1/klines?symbol=${querySymbol}&interval=${interval}&limit=${limit}`, {
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
