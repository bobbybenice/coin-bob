import { Candle, IndicatorResult } from '../../types';

interface MACDResult {
    MACD?: number;
    signal?: number;
    histogram?: number;
}

// Helper for arrays
function calculateArrayEMA(values: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const emaArray: number[] = new Array(values.length).fill(0);

    // Initial SMA
    let sum = 0;
    for (let i = 0; i < period; i++) sum += values[i];
    emaArray[period - 1] = sum / period;

    // EMA Loop
    for (let i = period; i < values.length; i++) {
        emaArray[i] = (values[i] * k) + (emaArray[i - 1] * (1 - k));
    }

    return emaArray;
}

export function calculateMACD(candles: Candle[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): IndicatorResult<MACDResult> {
    if (candles.length < slowPeriod + signalPeriod) {
        return { value: {}, signal: 'neutral' };
    }

    const closes = candles.map(c => c.close);

    const fastEMA = calculateArrayEMA(closes, fastPeriod);
    const slowEMA = calculateArrayEMA(closes, slowPeriod);

    // MACD Line = Fast - Slow
    const macdLine: number[] = [];
    // We can only calculate MACD where both EMAs exist (from index = slowPeriod - 1)
    for (let i = 0; i < closes.length; i++) {
        if (i < slowPeriod - 1) {
            macdLine.push(0);
        } else {
            macdLine.push(fastEMA[i] - slowEMA[i]);
        }
    }

    // Signal Line = EMA(MACD Line, signalPeriod)
    // IMPORTANT: TechnicalIndicators library might calculate Signal Line on the *valid* portion of MACD only.
    // Standard approach: Calculate EMA of the MACD series.
    // However, the first part of MACD series is 0 or invalid.
    // We should treat the MACD series starting from slowPeriod-1 as the dataset for Signal Line.

    const validMACD = macdLine.slice(slowPeriod - 1);
    const signalLineValues = calculateArrayEMA(validMACD, signalPeriod);

    // Pad signal line back to original length
    // The signal line is valid after slowPeriod-1 + signalPeriod-1

    const currentMACD = macdLine[macdLine.length - 1];
    const currentSignal = signalLineValues[signalLineValues.length - 1];
    const histogram = currentMACD - currentSignal;

    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    if (histogram > 0) signal = 'buy';
    else if (histogram < 0) signal = 'sell';

    return {
        value: {
            MACD: currentMACD,
            signal: currentSignal,
            histogram: histogram
        },
        signal,
        metadata: { fastPeriod, slowPeriod, signalPeriod }
    };
}
