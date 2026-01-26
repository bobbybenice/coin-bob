import { Candle, IndicatorResult } from '../../types';

export function calculateATR(candles: Candle[], period: number = 14): IndicatorResult<number> {
    if (candles.length < period + 1) {
        return { value: 0, signal: 'neutral' };
    }

    const trs: number[] = [];

    // Calculate True Range for available windows
    for (let i = 1; i < candles.length; i++) {
        const high = candles[i].high;
        const low = candles[i].low;
        const prevClose = candles[i - 1].close;

        const tr = Math.max(
            high - low,
            Math.abs(high - prevClose),
            Math.abs(low - prevClose)
        );
        trs.push(tr);
    }

    // First ATR is SMA of TR
    let atr = trs.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

    // Smoothed ATR (Wilder's Smoothing)
    // ATR = ((Prior ATR * (period - 1)) + Current TR) / period
    for (let i = period; i < trs.length; i++) {
        atr = ((atr * (period - 1)) + trs[i]) / period;
    }

    return {
        value: atr,
        signal: 'neutral',
        metadata: { period }
    };
}
