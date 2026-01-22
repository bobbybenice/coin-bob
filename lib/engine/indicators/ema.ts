import { EMA } from 'technicalindicators';
import { Candle, IndicatorResult } from '../../types';

export function calculateEMA(candles: Candle[], period: number): IndicatorResult {
    if (candles.length < period) {
        return { value: NaN, signal: 'neutral' };
    }

    const closes = candles.map(c => c.close);
    const emaValues = EMA.calculate({ period, values: closes });
    const currentEMA = emaValues[emaValues.length - 1];
    const currentPrice = closes[closes.length - 1];

    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    if (currentPrice > currentEMA) signal = 'buy'; // Simple trend following
    else if (currentPrice < currentEMA) signal = 'sell';

    return {
        value: currentEMA,
        signal,
        metadata: { period }
    };
}
