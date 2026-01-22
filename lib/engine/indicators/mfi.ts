import { MFI } from 'technicalindicators';
import { Candle, IndicatorResult } from '../../types';

export function calculateMFI(candles: Candle[], period: number = 14): IndicatorResult {
    if (candles.length < period) {
        return { value: NaN, signal: 'neutral' };
    }

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

    const currentMFI = mfiValues[mfiValues.length - 1];

    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    if (currentMFI < 30) signal = 'buy';
    if (currentMFI > 70) signal = 'sell';

    return {
        value: currentMFI,
        signal,
        metadata: { period }
    };
}
