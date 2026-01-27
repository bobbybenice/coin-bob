import { Asset, Candle, Timeframe } from './types';
import { WATCHLIST, SYMBOL_MAP } from './constants';
import { fetchFuturesDailyStats, fetchFundingRates, fetchFuturesKlines, FUTURES_SYMBOL_MAP } from '@/lib/services/futures';
import { analyzeAsset } from '@/lib/engine/analyzer';

const assetHistory: Record<string, Candle[]> = {};
const latestAssets: Asset[] = [];

// 2. Batch Loader for History (Always Fresh)
async function fetchHistoryBatch(symbols: string[], timeframe: Timeframe) {
    // Call Client Fetch for Batch (Futures)
    try {
        const batchResults: Record<string, Candle[]> = {};

        // Client-side loop for Futures (No Batch Endpoint, but parallel fetch is fine here)
        // Limit concurrency? 50 symbols might be heavy.
        // Let's do it in chunks of 5
        const CHUCK_SIZE = 5;
        for (let i = 0; i < symbols.length; i += CHUCK_SIZE) {
            const chunk = symbols.slice(i, i + CHUCK_SIZE);
            await Promise.all(chunk.map(async (sym) => {
                const klines = await fetchFuturesKlines(sym, timeframe, 500); // 500 limit for EMA 200 checks
                if (klines.length > 0) {
                    batchResults[sym] = klines;
                }
            }));
        }

        Object.entries(batchResults).forEach(([symbol, history]) => {
            if (history && history.length > 0) {
                assetHistory[symbol] = history;
            } else {
                if (!assetHistory[symbol]) assetHistory[symbol] = [];
            }
        });
    } catch (e) {
        console.error("Batch history fetch failed", e);
    }
}

export async function fetchHistory(symbol: string, timeframe: Timeframe) {
    // 1. Direct Fetch
    try {
        const history = await fetchFuturesKlines(symbol, timeframe, 500);
        if (history && history.length > 0) {
            assetHistory[symbol] = history;
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
        // Fetch history for Futures to prime the pump (FRESH)
        // Reset old history to avoid mixing 15m with 1h
        Object.keys(assetHistory).forEach(k => delete assetHistory[k]);
        fetchHistoryBatch(WATCHLIST, timeframe);
    }

    let ws: WebSocket | null = null;
    let isRunning = true;
    let hasUpdates = false;
    let retryCount = 0;
    const MAX_RETRIES = 5;

    // K-Line stream URL construction
    // Format: <symbol>@kline_<interval>
    // Max streams per connection is 1024 (we have ~50)

    // Correctly map symbols for Futures (e.g. PEPE -> 1000PEPE)
    const streams = WATCHLIST.map(s => {
        const symbol = FUTURES_SYMBOL_MAP[s] || s;
        return `${symbol.toLowerCase()}@kline_${timeframe}`;
    }).join('/');

    const baseURL = 'wss://fstream.binance.com';
    // Use /stream endpoint for multiplexing
    const wsUrl = `${baseURL}/stream?streams=${streams}`;

    const connect = () => {
        if (!isRunning) return;

        console.log(`[Binance WS] Connecting to Futures...`);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log(`[Binance WS] Connected (${timeframe})`);
            retryCount = 0; // Reset retry on success
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
                    // Start history with this candle (likely waiting for batch to finish)
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
                    isPerpetual: true,
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
            if (!isRunning) return; // Suppress errors if we have already cleaned up (e.g. Strict Mode double-mount)
            console.error("Binance WS Error", e);
            ws?.close();
        };

        ws.onclose = () => {
            if (isRunning) {
                if (retryCount < MAX_RETRIES) {
                    retryCount++;
                    const delay = 1000 * Math.pow(1.5, retryCount); // Backoff
                    console.log(`[Binance WS] Closed. Reconnecting in ${delay}ms... (Attempt ${retryCount}/${MAX_RETRIES})`);
                    setTimeout(connect, delay);
                } else {
                    console.error(`[Binance WS] Max retries exceeded. Connection failed.`);
                }
            }
        };
    };

    // Initialize Connection (Futures)
    connect();

    // Side-loop: We still might want 24h stats/funding rates for the UI columns (Change%, Vol, Funding)
    // We can poll this less frequently (e.g. every 5s) just to keep metadata fresh.
    const fetchMetadata = async () => {
        if (!isRunning) return;
        try {
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

            hasUpdates = true; // Force re-render with new metadata
        } catch (e) { console.warn("Meta fetch failed", e); }
    };

    // Fetch metadata every 10s (less frequent)
    // Fetch metadata every 10s (less frequent)
    fetchMetadata();
    const metaInterval = setInterval(fetchMetadata, 10000);

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
        clearInterval(metaInterval);
        ws?.close();
    };
}
