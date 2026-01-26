import { Candle, IndicatorResult } from '../../types';

export function calculateRSI(candles: Candle[], period: number = 14): IndicatorResult {
    if (candles.length < period + 1) {
        return { value: NaN, signal: 'neutral' };
    }

    const closes = candles.map(c => c.close);

    // Wilder's RSI Calculation
    let gains = 0;
    let losses = 0;

    // 1. First Average (Simple Moving Average)
    for (let i = 1; i <= period; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff;
        else losses += Math.abs(diff);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // 2. Smoothed Averages
    // We start from index = period + 1
    for (let i = period + 1; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        const currentGain = diff > 0 ? diff : 0;
        const currentLoss = diff < 0 ? Math.abs(diff) : 0;

        avgGain = ((avgGain * (period - 1)) + currentGain) / period;
        avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;
    }

    if (avgLoss === 0) {
        // If no losses, RSI is 100
        const val = avgGain === 0 ? 50 : 100;
        return {
            value: val,
            signal: val > 70 ? 'sell' : val < 30 ? 'buy' : 'neutral',
            metadata: { period }
        };
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    if (rsi < 30) signal = 'buy';
    if (rsi > 70) signal = 'sell';

    return {
        value: rsi,
        signal,
        metadata: { period }
    };
}
