import { Asset } from './types';
import { RSI, EMA, MACD, BollingerBands } from 'technicalindicators';
import { WATCHLIST, SYMBOL_MAP } from './constants';
import { fetchHistoricalData } from '@/lib/services/market';

interface BinanceTicker {
    s: string;
    c: string;
    P: string;
    v: string;
}

const assetHistory: Record<string, number[]> = {};
const latestAssets: Asset[] = [];

// 2. Batch Loader for History
async function fetchHistoryBatch(symbols: string[]) {
    // Process in chunks of 5 to avoid browser connection limits
    const CHUNK_SIZE = 5;
    for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
        const chunk = symbols.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(s => fetchHistory(s)));
        // Add slight delay between chunks
        await new Promise(r => setTimeout(r, 200));
    }
}



async function fetchHistory(symbol: string) {
    if (assetHistory[symbol] && assetHistory[symbol].length > 50) return;

    try {
        const history = await fetchHistoricalData(symbol);
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
let isHistoryFetching = false;

export function subscribeToBinanceStream(callback: (assets: Asset[]) => void) {
    // Start Batch Load in background, but only once
    if (!isHistoryFetching) {
        isHistoryFetching = true;
        fetchHistoryBatch(WATCHLIST);
    }

    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
    let hasUpdates = false;

    ws.onmessage = (event) => {
        try {
            const tickers: BinanceTicker[] = JSON.parse(event.data);

            tickers.forEach(t => {
                if (WATCHLIST.includes(t.s)) {
                    const price = parseFloat(t.c);
                    const info = SYMBOL_MAP[t.s];

                    if (!assetHistory[t.s]) assetHistory[t.s] = [price];

                    const history = assetHistory[t.s];

                    if (history.length > 0) {
                        history[history.length - 1] = price;
                    } else {
                        history.push(price);
                    }

                    // Indicators
                    let rsi = 0;
                    let ema20, ema50, ema200;
                    let macd, bb;

                    if (history.length > 50) {
                        // RSI
                        const rsiValues = RSI.calculate({ period: 14, values: history });
                        rsi = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : 0;

                        // EMAs
                        const ema20Values = EMA.calculate({ period: 20, values: history });
                        ema20 = ema20Values.length > 0 ? ema20Values[ema20Values.length - 1] : undefined;

                        const ema50Values = EMA.calculate({ period: 50, values: history });
                        ema50 = ema50Values.length > 0 ? ema50Values[ema50Values.length - 1] : undefined;

                        const ema200Values = EMA.calculate({ period: 200, values: history });
                        ema200 = ema200Values.length > 0 ? ema200Values[ema200Values.length - 1] : undefined;

                        // MACD (12, 26, 9)
                        const macdValues = MACD.calculate({
                            values: history,
                            fastPeriod: 12,
                            slowPeriod: 26,
                            signalPeriod: 9,
                            SimpleMAOscillator: false,
                            SimpleMASignal: false
                        });
                        macd = macdValues.length > 0 ? macdValues[macdValues.length - 1] : undefined;

                        // Bollinger Bands (20, 2)
                        const bbValues = BollingerBands.calculate({
                            period: 20,
                            stdDev: 2,
                            values: history
                        });
                        bb = bbValues.length > 0 ? bbValues[bbValues.length - 1] : undefined;
                    }

                    // Bob Score
                    const change24h = parseFloat(t.P);
                    let score = 50;
                    if (rsi > 0 && rsi < 30) score += 20;
                    if (rsi > 70) score -= 10;
                    if (change24h > 5) score += 10;
                    if (ema20 && price > ema20) score += 10;
                    if (ema50 && ema200 && ema50 > ema200) score += 20; // Golden Cross

                    // Advanced Score logic
                    if (macd && macd.histogram && macd.histogram > 0) score += 5; // Bullish momentum
                    if (bb && price < bb.lower) score += 15; // Deep Value Buy Zone

                    const existingIndex = latestAssets.findIndex(a => a.symbol === t.s.replace('USDT', ''));

                    const newAsset: Asset = {
                        id: info.id,
                        symbol: t.s.replace('USDT', ''),
                        name: info.name,
                        price: price,
                        change24h: change24h,
                        volume24h: parseFloat(t.v),
                        marketCap: 0,
                        rsi: Math.min(100, Math.max(0, rsi)),
                        bobScore: Math.min(100, Math.max(0, score)),
                        ema20,
                        ema50,
                        ema200,
                        macd,
                        bb
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
        ws.close();
    };
}
