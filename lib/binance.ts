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
                // FRESHNESS: 1 min
                const ageValid = (now - parsed.timestamp) < 60 * 1000;

                let gapCheck = true;
                if (parsed.data.length > 0) {
                    const lastCandle = parsed.data[parsed.data.length - 1];
                    const timeframeMsMap: Record<string, number> = {
                        '1m': 60 * 1000,
                        '5m': 5 * 60 * 1000,
                        '15m': 15 * 60 * 1000,
                        '1h': 60 * 60 * 1000,
                        '4h': 4 * 60 * 60 * 1000,
                        '1d': 24 * 60 * 60 * 1000,
                    };
                    const intervalMs = timeframeMsMap[timeframe] || 60 * 1000;
                    if ((now - lastCandle.time) > (3 * intervalMs)) {
                        gapCheck = false;
                    }
                }

                if (ageValid && gapCheck && parsed.data.length > 0) {
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
            // FRESHNESS CHECK: Strict 1 minute cache or dynamic based on timeframe?
            // For high frequency, 1 min is safe.
            const ageValid = (Date.now() - parsed.timestamp) < 60 * 1000;

            // GAP CHECK: Check if the last candle in data is reasonably fresh
            // If last candle time is older than 2 * interval, we have a gap.
            let gapCheck = true;
            if (parsed.data.length > 0) {
                const lastCandle = parsed.data[parsed.data.length - 1];
                // Approximate interval in ms
                const timeframeMsMap: Record<string, number> = {
                    '1m': 60 * 1000,
                    '5m': 5 * 60 * 1000,
                    '15m': 15 * 60 * 1000,
                    '1h': 60 * 60 * 1000,
                    '4h': 4 * 60 * 60 * 1000,
                    '1d': 24 * 60 * 60 * 1000,
                };
                const intervalMs = timeframeMsMap[timeframe] || 60 * 1000;

                // Allow 3 intervals of latency before forcing refetch
                if ((Date.now() - lastCandle.time) > (3 * intervalMs)) {
                    gapCheck = false;
                    // console.log(`Cache has gap for ${symbol}. Expiring.`);
                }
            }

            if (ageValid && gapCheck && parsed.data.length > 0) {
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
        // Fetch history for Spot or Futures to prime the pump
        fetchHistoryBatch(WATCHLIST, timeframe, isFuturesMode);
    }

    let ws: WebSocket | null = null;
    let isRunning = true;
    let hasUpdates = false;

    // K-Line stream URL construction
    // Format: <symbol>@kline_<interval>
    // Max streams per connection is 1024 (we have ~50)
    const streams = WATCHLIST.map(s => `${s.toLowerCase()}@kline_${timeframe}`).join('/');
    const baseURL = isFuturesMode ? 'wss://fstream.binance.com' : 'wss://stream.binance.com:9443';
    const wsUrl = `${baseURL}/stream?streams=${streams}`;

    const connect = () => {
        if (!isRunning) return;

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            // console.log(`Connected to ${isFuturesMode ? 'Futures' : 'Spot'} K-Line Stream (${timeframe})`);
        };

        ws.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                // Payload structure: { stream: 'btcusdt@kline_15m', data: { e: 'kline', s: 'BTCUSDT', k: { ... } } }
                const { s: symbol, k: candleData } = payload.data;

                if (!symbol || !candleData) return;

                // Extract Candle Data (K-Line)
                // k: { t: start, T: end, s: symbol, i: interval, f: firstId, L: lastId, o: open, c: close, h: high, l: low, v: volume, ... }
                const currentCandle: Candle = {
                    time: candleData.t,
                    open: parseFloat(candleData.o),
                    high: parseFloat(candleData.h),
                    low: parseFloat(candleData.l),
                    close: parseFloat(candleData.c),
                    volume: parseFloat(candleData.v)
                };

                // Update History
                // Note: Futures symbol might need normalization if 1000PEPE vs PEPE, but WATCHLIST should align.
                // Our WATCHLIST usually is standardized (e.g. BTCUSDT).
                // API returns strictly matching symbol.
                if (!assetHistory[symbol]) assetHistory[symbol] = [];
                const history = assetHistory[symbol];

                if (history.length > 0) {
                    const lastHistory = history[history.length - 1];
                    if (lastHistory.time === currentCandle.time) {
                        // Update current candle
                        history[history.length - 1] = currentCandle;
                    } else if (currentCandle.time > lastHistory.time) {
                        // Close candle, push new
                        history.push(currentCandle);
                        // Limit history size to prevent memory leak
                        if (history.length > 500) history.shift();
                    }
                } else {
                    history.push(currentCandle);
                }

                // Analyze Asset
                // Optimization: We could debounce this analysis if CPU spikes, but for 50 assets it is fine.
                const analysis = analyzeAsset(history);
                const info = SYMBOL_MAP[symbol] || { id: symbol.toLowerCase(), name: symbol };

                // ICT Integration
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

                // Construct Asset Object
                const cleanSymbol = symbol.replace('USDT', '');

                // For Change %, we don't get 24h change in K-Line stream unfortunately.
                // We only get current candle change.
                // Option:
                // 1. Fetch 24h ticker separately for just Change %.
                // 2. Calculate Change % for THIS candle (Open vs Close).
                // User expects 24h change usually? Or bar change?
                // Screener usually shows 24h Change.
                // COMPROMISE: We will keep the "Price" accurate. "Change" might be stale if we don't fetch tickers.
                // SOLUTION: We can calculate Change vs Open of the DAY if we have daily candle?
                // Or simply calculate Candle Change % (since user is looking at this timeframe).
                // Let's use Candle Change % for now as it aligns with the chart timeframe being watched.
                // OR: 0 if missing.

                // Let's stick to Candle Change for consistency with the view, or 0.
                const candleChange = ((currentCandle.close - currentCandle.open) / currentCandle.open) * 100;

                const existingIndex = latestAssets.findIndex(a => a.symbol === cleanSymbol);

                // Preserve previous 24h volume/change if available, or use basics
                const prevAsset = existingIndex >= 0 ? latestAssets[existingIndex] : null;

                const newAsset: Asset = {
                    id: info.id,
                    symbol: cleanSymbol,
                    name: info.name,
                    price: currentCandle.close,
                    change24h: prevAsset ? prevAsset.change24h : candleChange, // Keep stale 24h change or fallback
                    volume24h: prevAsset ? prevAsset.volume24h : currentCandle.volume, // 24h vol vs bar vol difference
                    marketCap: 0,
                    rsi: analysis.indicators.rsi.value,
                    ema20: analysis.indicators.ema20.value,
                    ema50: analysis.indicators.ema50.value,
                    ema200: analysis.indicators.ema200.value,
                    macd: analysis.indicators.macd.value,
                    bb: analysis.indicators.bb.value,
                    ictAnalysis: ictAnalysis,
                    trigger: analysis.trigger,
                    isPerpetual: isFuturesMode,
                    fundingRate: prevAsset?.fundingRate || 0, // Keep stale or fetch separately
                    openInterest: 0,
                    nextFundingTime: prevAsset?.nextFundingTime
                };

                if (existingIndex >= 0) {
                    latestAssets[existingIndex] = newAsset;
                } else {
                    latestAssets.push(newAsset);
                }

                hasUpdates = true;

            } catch (e) {
                console.error("Binance WS Parse Error", e);
            }
        };

        ws.onerror = (e) => {
            console.error("Binance WS Error", e);
            ws?.close();
        };

        ws.onclose = () => {
            if (isRunning) {
                // console.log("Reconnecting stream in 1s...");
                setTimeout(connect, 1000);
            }
        };
    };

    // Initialize Connection (Spot & Futures use same K-Line logic now!)
    connect();

    // Side-loop: We still might want 24h stats/funding rates for the UI columns (Change%, Vol, Funding)
    // We can poll this less frequently (e.g. every 5s) just to keep metadata fresh.
    let metaInterval: NodeJS.Timeout;
    const fetchMetadata = async () => {
        if (!isRunning) return;
        try {
            if (isFuturesMode) {
                const [tickers, fundingRates] = await Promise.all([
                    fetchFuturesDailyStats(),
                    fetchFundingRates()
                ]);
                // Update latestAssets with 24h stats only (preserve price/indicators from WS)
                tickers.forEach(t => {
                    const norm = t.symbol.replace(/^1000/, '').replace('USDT', '');
                    const asset = latestAssets.find(a => a.symbol === norm);
                    if (asset) {
                        asset.change24h = parseFloat(t.priceChangePercent);
                        asset.volume24h = parseFloat(t.quoteVolume);
                    }
                });
                // Update Funding
                const fundingMap = new Map<string, { rate: string, nextTime: number }>();
                fundingRates.forEach(f => fundingMap.set(f.symbol, { rate: f.lastFundingRate, nextTime: f.nextFundingTime }));
                latestAssets.forEach(a => {
                    // Try both raw and 1000 pre
                    const f = fundingMap.get(a.symbol + 'USDT') || fundingMap.get('1000' + a.symbol + 'USDT');
                    if (f) {
                        a.fundingRate = parseFloat(f.rate) * 100;
                        a.nextFundingTime = f.nextTime;
                    }
                });

            } else {
                // Spot Metadata? Not critical for now, relying on initial fetchHistoryBatch could populate it if we parsed it there?
                // Currently fetchHistoryBatch only gets Candles.
                // We could fetch ticker array once.
                // For now, let's leave Spot metadata as fallback.
            }
            hasUpdates = true; // Force re-render with new metadata
        } catch (e) { console.warn("Meta fetch failed", e); }
    };

    // Fetch metadata every 10s (less frequent)
    if (isFuturesMode) {
        fetchMetadata();
        metaInterval = setInterval(fetchMetadata, 10000);
    }

    const interval = setInterval(() => {
        if (hasUpdates) {
            // Sort by something distinctive? Or user setting? Default volume desc.
            latestAssets.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
            callback([...latestAssets]);
            hasUpdates = false;
        }
    }, 500);

    return () => {
        isRunning = false;
        clearInterval(interval);
        if (metaInterval) clearInterval(metaInterval);
        ws?.close();
    };
}
