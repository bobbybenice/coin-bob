import { RSI } from 'technicalindicators';
import { Candle, IndicatorResult } from '../types';

export function calculateRSI(candles: Candle[], period: number = 14): IndicatorResult {
    if (candles.length < period) {
        return { value: 0, signal: 'neutral' };
    }

    const closes = candles.map(c => c.close);
    const rsiValues = RSI.calculate({ period, values: closes });
    const currentRSI = rsiValues[rsiValues.length - 1];

    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    if (currentRSI < 30) signal = 'buy';
    if (currentRSI > 70) signal = 'sell';

    return {
        value: currentRSI,
        signal,
        metadata: { period }
    };
}
