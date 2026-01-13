import { calculateRSI } from './indicators/rsi';
import { calculateEMA } from './indicators/ema';
import { calculateMACD } from './indicators/macd';
import { calculateBollingerBands } from './indicators/bollinger';
import { strategyICT } from './strategies/ict';
import { Candle, StrategyResponse, IndicatorResult } from './types';

export interface TechnicalAnalysis {
    indicators: {
        rsi: IndicatorResult;
        ema20: IndicatorResult;
        ema50: IndicatorResult;
        ema200: IndicatorResult;
        macd: IndicatorResult<{ MACD?: number; signal?: number; histogram?: number }>;
        bb: IndicatorResult<{ middle: number; upper: number; lower: number; pb: number }>;
    };
    strategies: {
        ict: StrategyResponse;
    };
    score: number; // calculated BobScore
}

export function analyzeAsset(candles: Candle[]): TechnicalAnalysis {
    const rsi = calculateRSI(candles, 14);
    const ema20 = calculateEMA(candles, 20);
    const ema50 = calculateEMA(candles, 50);
    const ema200 = calculateEMA(candles, 200);
    const macd = calculateMACD(candles, 12, 26, 9);
    const bb = calculateBollingerBands(candles, 20, 2);

    const ict = strategyICT(candles);

    // Score Calculation
    let score = 50;

    // RSI Scoring
    if (rsi.value > 0 && rsi.value < 30) score += 20;
    if (rsi.value > 70) score -= 10;

    // Trend Scoring
    const lastPrice = candles[candles.length - 1]?.close || 0;
    const change24h = ((lastPrice - (candles[0]?.open || lastPrice)) / (candles[0]?.open || 1)) * 100; // Approx if not passed in, but ideally passed in
    // Note: binance.ts passes change24h from ticker. Here we rely on candles or input. 
    // To keep this pure based on candles, we use candle data, but 24h change might strictly be Ticker data.
    // However, for modularity, let's assume we score based on indicators here, and external caller adds Ticker factors.
    // But existing logic used Ticker's P (change24h).
    // Let's stick to Technical score.

    if (ema20.value && lastPrice > ema20.value) score += 10;
    if (ema50.value && ema200.value && ema50.value > ema200.value) score += 20; // Golden Cross

    // Strategy Scoring
    if (ict.status === 'ENTRY') score += 15; // Sweep or Signal
    if (ict.metadata?.isHighProbability) score += 10;

    if (macd.value.histogram && macd.value.histogram > 0) score += 5;
    if (bb.value.lower && lastPrice < bb.value.lower) score += 15;

    return {
        indicators: {
            rsi,
            ema20,
            ema50,
            ema200,
            macd,
            bb
        },
        strategies: {
            ict
        },
        score: Math.min(100, Math.max(0, score))
    };
}
