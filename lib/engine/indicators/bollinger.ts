import { BollingerBands } from 'technicalindicators';
import { Candle, IndicatorResult } from '../types';

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
    const bbValues = BollingerBands.calculate({
        period,
        stdDev,
        values: closes
    });

    const currentBB = bbValues[bbValues.length - 1];

    if (!currentBB) {
        return { value: { middle: 0, upper: 0, lower: 0, pb: 0 }, signal: 'neutral' };
    }

    const currentPrice = closes[closes.length - 1];

    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    if (currentPrice < currentBB.lower) signal = 'buy'; // Over sold / mean reversion
    if (currentPrice > currentBB.upper) signal = 'sell'; // Over bought

    return {
        value: {
            middle: currentBB.middle,
            upper: currentBB.upper,
            lower: currentBB.lower,
            pb: currentBB.pb
        },
        signal,
        metadata: { period, stdDev }
    };
}
