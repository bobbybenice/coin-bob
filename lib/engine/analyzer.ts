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

    // --- Scorer Logic (0 = Strong Short | 50 = Neutral | 100 = Strong Long) ---
    let score = 50;
    const currentPrice = candles[candles.length - 1]?.close || 0;

    // 1. Trend Context (+/- 25)
    // Bullish Trend
    if (ema200.value && currentPrice > ema200.value) score += 15;
    if (ema50.value && ema200.value && ema50.value > ema200.value) score += 10;

    // Bearish Trend
    if (ema200.value && currentPrice < ema200.value) score -= 15;
    if (ema50.value && ema200.value && ema50.value < ema200.value) score -= 10;

    // 2. Momentum / Exhaustion (+/- 25)
    // Oversold (Bullish Reversal / Dip Buy)
    if (!isNaN(rsi.value)) {
        if (rsi.value < 30) score += 20;
        else if (rsi.value < 45) score += 10;

        // Overbought (Bearish Reversal / Top Short)
        if (rsi.value > 70) score -= 20;
        else if (rsi.value > 55) score -= 10;
    }

    // Bollinger Band Interaction
    if (bb.value.lower && currentPrice < bb.value.lower) score += 5;
    if (bb.value.upper && currentPrice > bb.value.upper) score -= 5;

    // 3. Triggers (ICT) (+/- 25)
    const sweep = ict.metadata?.sweep; // BULLISH | BEARISH
    const fvg = ict.metadata?.fvg; // BULLISH | BEARISH

    if (sweep === 'BULLISH') score += 15;
    if (sweep === 'BEARISH') score -= 15;

    if (fvg === 'BULLISH') score += 10;
    if (fvg === 'BEARISH') score -= 10;

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
