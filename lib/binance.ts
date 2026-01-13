import { Asset, Candle, Timeframe } from './types';
import { WATCHLIST, SYMBOL_MAP } from './constants';
import { fetchHistoricalData } from '@/lib/services/market';
import { analyzeAsset } from '@/lib/engine/analyzer';

interface BinanceTicker {
    s: string;
    c: string;
    o: string;
    h: string;
    l: string;
    P: string;
    v: string;
}

const assetHistory: Record<string, Candle[]> = {};
const latestAssets: Asset[] = [];

// 2. Batch Loader for History
async function fetchHistoryBatch(symbols: string[], timeframe: Timeframe) {
    // Process in chunks of 5 to avoid browser connection limits
    const CHUNK_SIZE = 5;
    for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
        const chunk = symbols.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(s => fetchHistory(s, timeframe)));
        // Add slight delay between chunks
        await new Promise(r => setTimeout(r, 200));
    }
}

// Helper to safely set item in LS with pruning if quota exceeded
function safeSetItem(key: string, value: string) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
            console.warn("LocalStorage Quota Exceeded. Pruning old cache...");
            pruneCache();
            try {
                localStorage.setItem(key, value);
            } catch (retryError) {
                console.error("Failed to set item even after pruning", retryError);
            }
        } else {
            console.error("LocalStorage Error", e);
        }
    }
}

function pruneCache() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('indicators_')) {
            keys.push(key);
        }
    }

    if (keys.length === 0) return;

    // Sort by timestamp (we need to read them to know age, which is expensive but necessary)
    // Or simpler approach: Just delete random 50% or all of them.
    // "Smart Cache" implies we shouldn't delete everything. 
    // Let's decode them and sort by timestamp.
    const items = keys.map(k => {
        try {
            const item = localStorage.getItem(k);
            if (!item) return { key: k, time: 0 };
            const parsed = JSON.parse(item);
            return { key: k, time: parsed.timestamp || 0 };
        } catch {
            return { key: k, time: 0 };
        }
    });

    // Sort oldest first
    items.sort((a, b) => a.time - b.time);

    // Delete oldest 20%
    const deleteCount = Math.max(1, Math.floor(items.length * 0.2));
    for (let i = 0; i < deleteCount; i++) {
        localStorage.removeItem(items[i].key);
    }
}

async function fetchHistory(symbol: string, timeframe: Timeframe) {
    // 1. Try LocalStorage first
    const storageKey = `indicators_${symbol}_${timeframe}`;
    try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
            const parsed: { data: Candle[], timestamp: number } = JSON.parse(cached);
            // Validity check: 15 minutes cache for candles might be okay for 1d, but for 1m it's too stale.
            // Actually, for "technical data", the prompt says: "When switching timeframe, immediately re-fetch/update".
            // But also: "Prioritize existing data in LocalStorage if it's within the valid time-window."
            // Let's define valid window: 5 minutes? Or just if we have it, use it, and maybe background refresh.
            // Prompt says: "High Refresh ... immediately re-fetch... Isolation: Store...".
            // Prompt 4: "Always prioritize existing data in LocalStorage if it's within the valid time-window."

            // Let's use a 5-minute validity window for now to prevent spamming API on rapid switches
            const ageValid = (Date.now() - parsed.timestamp) < 5 * 60 * 1000;
            if (ageValid && parsed.data.length > 0) {
                assetHistory[symbol] = parsed.data;
                return;
            }
        }
    } catch (e) {
        console.warn('Failed to parse LS cache', e);
    }

    // 2. Fetch from API if cache miss or stale
    try {
        const history = await fetchHistoricalData(symbol, timeframe);
        if (history && history.length > 0) {
            assetHistory[symbol] = history;
            // Save to LS
            safeSetItem(storageKey, JSON.stringify({
                data: history,
                timestamp: Date.now()
            }));
        } else {
            if (!assetHistory[symbol]) assetHistory[symbol] = [];
        }
    } catch (e) {
        console.error(`Failed to load history for ${symbol}`, e);
        if (!assetHistory[symbol]) assetHistory[symbol] = [];
    }
}

// Flag to prevent double-fetching in React Strict Mode
let activeTimeframe: Timeframe | null = null;

export function subscribeToBinanceStream(timeframe: Timeframe, callback: (assets: Asset[]) => void) {
    // Reset history if timeframe changed
    if (activeTimeframe !== timeframe) {
        activeTimeframe = timeframe;
        // Check if we need to clear assetHistory. 
        // Technically, modifying the reference object in place is safer strictly for the keyed access, 
        // but we want to reload data.
        // We will just let fetchHistoryBatch overwrite the keys.
        // But for cleaner state, we could reset it. 
        // However, invalidating all keys might cause a flash of empty data.
        // Let's just trigger the fetch.
        fetchHistoryBatch(WATCHLIST, timeframe);
    }

    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
    let hasUpdates = false;

    ws.onmessage = (event) => {
        try {
            const tickers: BinanceTicker[] = JSON.parse(event.data);

            tickers.forEach(t => {
                if (WATCHLIST.includes(t.s)) {
                    const price = parseFloat(t.c);
                    const open = parseFloat(t.o);
                    const high = parseFloat(t.h);
                    const low = parseFloat(t.l);
                    const volume = parseFloat(t.v);

                    const info = SYMBOL_MAP[t.s];

                    if (!assetHistory[t.s]) assetHistory[t.s] = [];

                    const history = assetHistory[t.s];

                    // Current candle (Snapshot of today)
                    const currentCandle: Candle = {
                        time: Date.now(), // Approximate for the live candle
                        open,
                        high,
                        low,
                        close: price,
                        volume
                    };

                    if (history.length > 0) {
                        // Update the last candle
                        // In a real app we'd check timestamps to see if it's a new day,
                        // but since we fetch '1d' candles, we treat this stream as updates to the "current daily candle"
                        history[history.length - 1] = currentCandle;
                    } else {
                        history.push(currentCandle);
                    }



                    // Indicators & Strategies via Engine
                    const analysis = analyzeAsset(history);

                    // Bob Score Integration (add ticker-specific score)
                    let score = analysis.score;
                    const change24h = parseFloat(t.P);
                    if (change24h > 5) score += 10;
                    score = Math.min(100, Math.max(0, score));

                    // Map Engine Output to Legacy Asset Structure for UI Compatibility
                    const ictMetadata = analysis.strategies.ict.metadata as {
                        sweep?: string;
                        fvg?: string;
                        killzone?: string;
                        isHighProbability?: boolean;
                    };

                    // Reconstruct old ICTAnalysis format for UI
                    let oldSignal: 'NONE' | 'BULLISH_SWEEP' | 'BEARISH_SWEEP' | 'BULLISH_FVG' | 'BEARISH_FVG' = 'NONE';
                    if (ictMetadata?.sweep === 'BULLISH') oldSignal = 'BULLISH_SWEEP';
                    else if (ictMetadata?.sweep === 'BEARISH') oldSignal = 'BEARISH_SWEEP';
                    else if (ictMetadata?.fvg === 'BULLISH') oldSignal = 'BULLISH_FVG';
                    else if (ictMetadata?.fvg === 'BEARISH') oldSignal = 'BEARISH_FVG';

                    const ictAnalysis = {
                        signal: oldSignal,
                        fvg: ictMetadata?.fvg ? { type: ictMetadata.fvg as 'BULLISH' | 'BEARISH' } : undefined, // Approximation
                        killzone: ictMetadata?.killzone,
                        isHighProbability: ictMetadata?.isHighProbability || false
                    };

                    const existingIndex = latestAssets.findIndex(a => a.symbol === t.s.replace('USDT', ''));

                    const newAsset: Asset = {
                        id: info.id,
                        symbol: t.s.replace('USDT', ''),
                        name: info.name,
                        price: price,
                        change24h: change24h,
                        volume24h: parseFloat(t.v),
                        marketCap: 0,
                        rsi: analysis.indicators.rsi.value,
                        bobScore: score,
                        ema20: analysis.indicators.ema20.value,
                        ema50: analysis.indicators.ema50.value,
                        ema200: analysis.indicators.ema200.value,
                        macd: analysis.indicators.macd.value,
                        bb: analysis.indicators.bb.value,
                        ictAnalysis: ictAnalysis

                    };

                    if (existingIndex >= 0) {
                        latestAssets[existingIndex] = newAsset;
                    } else {
                        latestAssets.push(newAsset);
                    }

                    hasUpdates = true;
                }
            });
        } catch (e) {
            console.error("Binance WS Parse Error", e);
        }
    };

    const interval = setInterval(() => {
        if (hasUpdates) {
            callback([...latestAssets]);
            hasUpdates = false;
        }
    }, 1000);

    return () => {
        clearInterval(interval);
        ws.onmessage = null;
        ws.onerror = null;
        try {
            ws.close();
        } catch {
            // ignore 
        }
    };
}
