import { Candle, IndicatorResult } from '../../types';
import { RSI } from 'technicalindicators';

export function calculateRSI(candles: Candle[], period: number = 14): IndicatorResult {
    // Need at least period + 1 data points for stable calculation
    if (candles.length < period + 1) {
        return { value: NaN, signal: 'neutral' };
    }

    try {
        const closes = candles.map(c => c.close);

        // techind RSI expects array of numbers
        const rsiValues = RSI.calculate({
            values: closes,
            period: period
        });

        // Get the last value
        const lastValue = rsiValues[rsiValues.length - 1];

        if (lastValue === undefined || isNaN(lastValue)) {
            return { value: NaN, signal: 'neutral' };
        }

        let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
        if (lastValue < 30) signal = 'buy';
        if (lastValue > 70) signal = 'sell';

        return {
            value: lastValue,
            signal,
            metadata: { period }
        };
    } catch (e) {
        console.warn('RSI Calculation Failed', e);
        return { value: NaN, signal: 'neutral' };
    }
}
