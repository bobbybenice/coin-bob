import { Candle, IndicatorResult } from '../../types';
import { MFI } from 'technicalindicators';

export function calculateMFI(candles: Candle[], period: number = 14): IndicatorResult {
    // Need at least period + 1 data points
    if (candles.length < period + 1) {
        return { value: NaN, signal: 'neutral' };
    }

    try {
        const high = candles.map(c => c.high);
        const low = candles.map(c => c.low);
        const close = candles.map(c => c.close);
        const volume = candles.map(c => c.volume);

        const mfiValues = MFI.calculate({
            high,
            low,
            close,
            volume,
            period
        });

        // Get the last value
        const lastValue = mfiValues[mfiValues.length - 1];

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
        console.warn('MFI Calculation Failed', e);
        return { value: NaN, signal: 'neutral' };
    }
}
