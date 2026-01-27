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
const FUNDING_TTL = 5 * 60 * 1000; // 5 Minutes (Funding updates every 8h, so this is very safe)

let tickerCache: { data: FuturesTicker[], timestamp: number } | null = null;
let tickerPromise: Promise<FuturesTicker[]> | null = null;
const TICKER_TTL = 30 * 1000; // 30 Seconds (Prevents excessive polling)

// Klines Cache - Prevents duplicate requests for same data
const klinesCache = new Map<string, { data: any[], timestamp: number }>();
const klinesPromises = new Map<string, Promise<any[]>>();
const KLINES_TTL = 60 * 1000; // 1 Minute - Historical data doesn't change rapidly

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

            if (!res.ok) {
                console.warn(`Futures ticker fetch failed: ${res.status} ${res.statusText}`);
                return [];
            }

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

// Map for Base symbols -> Futures symbols (Binance uses 1000 prefix for meme coins)
// We keep this specific list for hard overrides if needed, but dynamic resolution is preferred.
export const FUTURES_SYMBOL_MAP: Record<string, string> = {
    'BONKUSDT': '1000BONKUSDT',
    'PEPEUSDT': '1000PEPEUSDT',
    'SHIBUSDT': '1000SHIBUSDT',
    'FLOKIUSDT': '1000FLOKIUSDT',
    'LUNCUSDT': '1000LUNCUSDT',
    'XECUSDT': '1000XECUSDT',
    'SATSUSDT': '1000SATSUSDT',
    'RATSUSDT': '1000RATSUSDT',
    'MOGUSDT': '1000MOGUSDT',
    'CATUSDT': '1000CATUSDT',
    'POPCATUSDT': '1000POPCATUSDT'
    // Dynamic fallback added below
};

// Check if a symbol exists in the valid futures list, or determine if it needs a prefix.
export async function resolveFuturesSymbol(symbol: string): Promise<string> {
    // 1. Static Map (Fastest)
    if (FUTURES_SYMBOL_MAP[symbol]) return FUTURES_SYMBOL_MAP[symbol];

    // 2. Direct check (maybe it works as is) or try prefixes
    try {
        const tickers = await fetchFuturesDailyStats(); // Uses cache internally
        const validSymbols = new Set(tickers.map(t => t.symbol));

        // Case A: Symbol exists exactly (e.g. BTCUSDT)
        if (validSymbols.has(symbol)) return symbol;

        // Case B: Symbol needs 1000 prefix (e.g. PEPEUSDT -> 1000PEPEUSDT)
        // Try adding 1000
        const prefixed = `1000${symbol}`;
        if (validSymbols.has(prefixed)) {
            // Cache it for next time
            FUTURES_SYMBOL_MAP[symbol] = prefixed;
            return prefixed;
        }

        // Case C: Maybe the input was bare symbol "ETH" and needs "USDT" (unlikely in this app flow, but safe)
        if (!symbol.includes('USDT')) {
            const withUsdt = `${symbol}USDT`;
            if (validSymbols.has(withUsdt)) return withUsdt;
            const with1000Usdt = `1000${symbol}USDT`;
            if (validSymbols.has(with1000Usdt)) return with1000Usdt;
        }

        // Return original as fail-safe
        return symbol;
    } catch {
        // Fallback to original if check fails or cached list missing
        return symbol;
    }
}

// Fetch Historical Klines (Candles) with aggressive caching
export async function fetchFuturesKlines(symbol: string, interval: string, limit: number = 500): Promise<any[]> {
    try {
        // Dynamic Symbol Resolution
        const querySymbol = await resolveFuturesSymbol(symbol);
        const cacheKey = `${querySymbol}_${interval}_${limit}`;
        const now = Date.now();

        // Check cache first
        const cached = klinesCache.get(cacheKey);
        if (cached && (now - cached.timestamp < KLINES_TTL)) {
            console.log(`[Cache HIT] ${cacheKey} (age: ${Math.round((now - cached.timestamp) / 1000)}s)`);
            return cached.data;
        }

        // Check for in-flight request
        const inFlight = klinesPromises.get(cacheKey);
        if (inFlight) {
            console.log(`[Cache DEDUP] ${cacheKey} - reusing in-flight request`);
            return inFlight;
        }

        console.log(`[Cache MISS] ${cacheKey} - fetching fresh data`);

        // Create new request
        const promise = (async () => {
            try {
                const res = await fetch(`${FAPI_BASE}/fapi/v1/klines?symbol=${querySymbol}&interval=${interval}&limit=${limit}`);
                if (!res.ok) {
                    console.warn(`Futures Klines Error: ${res.status} ${res.statusText} for ${querySymbol}`);
                    return [];
                }
                const data = await res.json();

                const candles = Array.isArray(data) ? data.map((d: any[]) => ({
                    time: d[0],
                    open: parseFloat(d[1]),
                    high: parseFloat(d[2]),
                    low: parseFloat(d[3]),
                    close: parseFloat(d[4]),
                    volume: parseFloat(d[5])
                })) : [];

                // Cache the result
                klinesCache.set(cacheKey, { data: candles, timestamp: Date.now() });
                console.log(`[Cache STORE] ${cacheKey} - stored ${candles.length} candles`);
                return candles;
            } finally {
                klinesPromises.delete(cacheKey);
            }
        })();

        klinesPromises.set(cacheKey, promise);
        return promise;
    } catch (error) {
        console.error('Futures Klines Error:', error);
        return [];
    }
}
