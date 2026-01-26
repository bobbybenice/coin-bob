import { Candle, IndicatorResult } from '../../types';

interface BBResult {
    middle: number;
    upper: number;
    lower: number;
    pb: number;
}

export function calculateBollingerBands(candles: Candle[], period: number = 20, stdDev: number = 2): IndicatorResult<BBResult> {
    if (candles.length < period) {
        return { value: { middle: 0, upper: 0, lower: 0, pb: 0 }, signal: 'neutral' };
    }

    const closes = candles.map(c => c.close);

    // We only strictly *need* the last value, but for completeness (and charts later) 
    // we could calc broad range. Here we optimize for just the current signal.

    // 1. Calculate SMA (Middle Band) for the last window
    const window = closes.slice(-period);
    const sum = window.reduce((a, b) => a + b, 0);
    const middle = sum / period;

    // 2. Calculate Standard Deviation
    const squaredDiffs = window.map(price => Math.pow(price - middle, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    const sd = Math.sqrt(avgSquaredDiff);

    // 3. Bands
    const upper = middle + (sd * stdDev);
    const lower = middle - (sd * stdDev);

    const currentPrice = closes[closes.length - 1];

    // %B Calculation
    // (Price - Lower) / (Upper - Lower)
    const pb = (currentPrice - lower) / (upper - lower);

    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    if (currentPrice < lower) signal = 'buy'; // Over sold / mean reversion
    if (currentPrice > upper) signal = 'sell'; // Over bought

    return {
        value: {
            middle,
            upper,
            lower,
            pb
        },
        signal,
        metadata: { period, stdDev }
    };
}
