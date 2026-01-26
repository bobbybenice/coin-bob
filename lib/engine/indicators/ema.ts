import { Candle, IndicatorResult } from '../../types';

export function calculateEMA(candles: Candle[], period: number): IndicatorResult {
    if (candles.length < period) {
        return { value: NaN, signal: 'neutral' };
    }

    const closes = candles.map(c => c.close);
    const k = 2 / (period + 1);

    // Initial SMA
    let ema = 0;
    for (let i = 0; i < period; i++) {
        ema += closes[i];
    }
    ema /= period;

    // EMA Loop
    for (let i = period; i < closes.length; i++) {
        ema = (closes[i] * k) + (ema * (1 - k));
    }

    const currentPrice = closes[closes.length - 1];

    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    if (currentPrice > ema) signal = 'buy'; // Simple trend following
    else if (currentPrice < ema) signal = 'sell';

    return {
        value: ema,
        signal,
        metadata: { period }
    };
}
