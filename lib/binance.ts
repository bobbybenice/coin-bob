import { Asset, Candle, Timeframe } from './types';
import { WATCHLIST, SYMBOL_MAP } from './constants';
import { fetchHistoricalData, fetchHistoricalDataBatch } from '@/lib/services/market';
import { fetchFuturesDailyStats, fetchFundingRates, fetchFuturesKlines } from '@/lib/services/futures';
import { analyzeAsset } from '@/lib/engine/analyzer';

// [Helper functions safeSetItem, pruneCache omitted, assuming they are unchanged or I should include them if replace_file_content needs full context or line ranges. 
// Since I am replacing the top part up to fetchHistoryBatch, I will include imports and the function.]

// ... (helpers are fine, I'll target fetchHistoryBatch specifically if I can, but imports need update)

// Let's replace from Imports down to end of fetchHistoryBatch to be safe and clean.

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
async function fetchHistoryBatch(symbols: string[], timeframe: Timeframe, isFutures: boolean) {
    // Check which symbols are missing from cache or stale
    const symbolsToFetch: string[] = [];
    const now = Date.now();

    symbols.forEach(symbol => {
        const storageKey = `indicators_${isFutures ? 'F_' : ''}${symbol}_${timeframe}`;
        try {
            const cached = localStorage.getItem(storageKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                const ageValid = (now - parsed.timestamp) < 5 * 60 * 1000;
                if (ageValid && parsed.data.length > 0) {
                    assetHistory[symbol] = parsed.data;
                    return;
                }
            }
        } catch { /* ignore */ }
        symbolsToFetch.push(symbol);
    });

    if (symbolsToFetch.length === 0) return;

    // Call Server Action or Client Fetch for Batch
    try {
        let batchResults: Record<string, Candle[]> = {};

        if (isFutures) {
            // Client-side loop for Futures (No Batch Endpoint, but parallel fetch is fine here)
            // Limit concurrency? 50 symbols might be heavy.
            // Let's do it in chunks of 5
            const CHUCK_SIZE = 5;
            for (let i = 0; i < symbolsToFetch.length; i += CHUCK_SIZE) {
                const chunk = symbolsToFetch.slice(i, i + CHUCK_SIZE);
                await Promise.all(chunk.map(async (sym) => {
                    const klines = await fetchFuturesKlines(sym, timeframe, 100); // 100 limit enough for indicators
                    if (klines.length > 0) {
                        batchResults[sym] = klines;
                    }
                }));
            }
        } else {
            // Server Action for Spot (Batched)
            batchResults = await fetchHistoricalDataBatch(symbolsToFetch, timeframe, false);
        }

        Object.entries(batchResults).forEach(([symbol, history]) => {
            if (history && history.length > 0) {
                assetHistory[symbol] = history;
                safeSetItem(`indicators_${isFutures ? 'F_' : ''}${symbol}_${timeframe}`, JSON.stringify({
                    data: history,
                    timestamp: now
                }));
            } else {
                if (!assetHistory[symbol]) assetHistory[symbol] = [];
            }
        });
    } catch (e) {
        console.error("Batch history fetch failed", e);
    }
}

export async function fetchHistory(symbol: string, timeframe: Timeframe) {
    // 1. Try LocalStorage first
    const storageKey = `indicators_${symbol}_${timeframe}`;
    try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
            const parsed: { data: Candle[], timestamp: number } = JSON.parse(cached);
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
        // Defaults to Spot history
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
let activeFuturesMode: boolean = false; // Track mode

export function subscribeToBinanceStream(timeframe: Timeframe, isFuturesMode: boolean, callback: (assets: Asset[]) => void) {
    // Reset history if timeframe changed
    if (activeTimeframe !== timeframe || activeFuturesMode !== isFuturesMode) {
        activeTimeframe = timeframe;
        activeFuturesMode = isFuturesMode;
        // Fetch history for Spot or Futures
        fetchHistoryBatch(WATCHLIST, timeframe, isFuturesMode);
    }

    if (!isFuturesMode) {
        // SPOT MODE: Use WebSocket
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
                            history[history.length - 1] = currentCandle;
                        } else {
                            history.push(currentCandle);
                        }

                        // Indicators & Strategies via Engine
                        const change24h = parseFloat(t.P);
                        const analysis = analyzeAsset(history, change24h);
                        // DEBUG: Check breakdown
                        if (analysis.score > 60 && (!analysis.scoreBreakdown || analysis.scoreBreakdown.length === 0)) {
                            console.warn(`[Binance] High Score ${analysis.score} but NO Breakdown!`, analysis);
                        }


                        // Bob Score Integration
                        let score = analysis.score;
                        // Manual boost removed (handled in analyzer)
                        score = Math.min(100, Math.max(0, score));

                        const ictResult = analysis.strategies['ICT'];
                        const ictMetadata = ictResult?.metadata as {
                            sweep?: string;
                            fvg?: string;
                            killzone?: 'LONDON' | 'NEW_YORK';
                            isHighProbability?: boolean;
                        } | undefined;

                        let oldSignal: 'NONE' | 'BULLISH_SWEEP' | 'BEARISH_SWEEP' | 'BULLISH_FVG' | 'BEARISH_FVG' = 'NONE';
                        if (ictMetadata?.sweep === 'BULLISH') oldSignal = 'BULLISH_SWEEP';
                        else if (ictMetadata?.sweep === 'BEARISH') oldSignal = 'BEARISH_SWEEP';
                        else if (ictMetadata?.fvg === 'BULLISH') oldSignal = 'BULLISH_FVG';
                        else if (ictMetadata?.fvg === 'BEARISH') oldSignal = 'BEARISH_FVG';

                        const ictAnalysis = {
                            signal: oldSignal,
                            fvg: ictMetadata?.fvg ? { type: ictMetadata.fvg as 'BULLISH' | 'BEARISH' } : undefined,
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
                            ictAnalysis: ictAnalysis,
                            trigger: analysis.trigger,
                            scoreBreakdown: analysis.scoreBreakdown
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
            ws.close();
        };

    } else {
        // PERPS MODE: Polling
        let isRunning = true;

        const fetchFuturesData = async () => {
            if (!isRunning) return;

            const [tickers, fundingRates] = await Promise.all([
                fetchFuturesDailyStats(),
                fetchFundingRates()
            ]);

            // Map funding rates for O(1) lookup
            const fundingMap = new Map<string, { rate: string, nextTime: number }>();
            fundingRates.forEach(f => {
                fundingMap.set(f.symbol, { rate: f.lastFundingRate, nextTime: f.nextFundingTime });
            });

            // Process Tickers
            const newAssets: Asset[] = [];

            for (const t of tickers) {
                if (WATCHLIST.includes(t.symbol) || WATCHLIST.includes(t.symbol.replace('USDT', '') + 'USDT')) { // Match our watchlist
                    const cleanSymbol = t.symbol.replace('USDT', '');
                    const info = SYMBOL_MAP[t.symbol] || { id: cleanSymbol.toLowerCase(), name: cleanSymbol };

                    const price = parseFloat(t.lastPrice);
                    const funding = fundingMap.get(t.symbol);
                    const fRate = funding ? parseFloat(funding.rate) * 100 : 0; // Convert to %

                    // Get History for Indicators (Futures History)
                    // Note: symbol might need to be adjusted if assetHistory keys differ
                    if (!assetHistory[cleanSymbol] && !assetHistory[t.symbol]) assetHistory[cleanSymbol] = [];
                    const history = assetHistory[t.symbol] || assetHistory[cleanSymbol] || [];

                    // Indicators & Strategies via Engine
                    const change24h = parseFloat(t.priceChangePercent);
                    const analysis = analyzeAsset(history, change24h);

                    // Bob Score Integration
                    let score = analysis.score;
                    // Manual boost removed (handled in analyzer)
                    score = Math.min(100, Math.max(0, score));

                    const ictMetadata = analysis.strategies['ICT']?.metadata as {
                        sweep?: string;
                        fvg?: string;
                        killzone?: 'LONDON' | 'NEW_YORK';
                        isHighProbability?: boolean;
                    };

                    let oldSignal: 'NONE' | 'BULLISH_SWEEP' | 'BEARISH_SWEEP' | 'BULLISH_FVG' | 'BEARISH_FVG' = 'NONE';
                    if (ictMetadata?.sweep === 'BULLISH') oldSignal = 'BULLISH_SWEEP';
                    else if (ictMetadata?.sweep === 'BEARISH') oldSignal = 'BEARISH_SWEEP';
                    else if (ictMetadata?.fvg === 'BULLISH') oldSignal = 'BULLISH_FVG';
                    else if (ictMetadata?.fvg === 'BEARISH') oldSignal = 'BEARISH_FVG';

                    const ictAnalysis = {
                        signal: oldSignal,
                        fvg: ictMetadata?.fvg ? { type: ictMetadata.fvg as 'BULLISH' | 'BEARISH' } : undefined,
                        killzone: ictMetadata?.killzone,
                        isHighProbability: ictMetadata?.isHighProbability || false
                    };

                    newAssets.push({
                        id: info.id,
                        symbol: cleanSymbol,
                        name: info.name,
                        price: price,
                        change24h: parseFloat(t.priceChangePercent),
                        volume24h: parseFloat(t.quoteVolume),
                        marketCap: 0,
                        rsi: analysis.indicators.rsi.value,
                        bobScore: score, // DYNAMIC SCORE
                        ema20: analysis.indicators.ema20.value,
                        ema50: analysis.indicators.ema50.value,
                        ema200: analysis.indicators.ema200.value,
                        macd: analysis.indicators.macd.value,
                        bb: analysis.indicators.bb.value,
                        ictAnalysis: ictAnalysis,
                        trigger: analysis.trigger,
                        isPerpetual: true,
                        fundingRate: fRate,
                        openInterest: 0,
                        nextFundingTime: funding?.nextTime
                    });
                }
            }

            // Order by BobScore desc
            newAssets.sort((a, b) => b.bobScore - a.bobScore);

            callback(newAssets);
        };

        fetchFuturesData();
        const interval = setInterval(fetchFuturesData, 5000);

        return () => {
            isRunning = false;
            clearInterval(interval);
        };
    }
}
