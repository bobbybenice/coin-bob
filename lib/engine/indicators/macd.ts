import { MACD } from 'technicalindicators';
import { Candle, IndicatorResult } from '../../types';

interface MACDResult {
    MACD?: number;
    signal?: number;
    histogram?: number;
}

export function calculateMACD(candles: Candle[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): IndicatorResult<MACDResult> {
    if (candles.length < slowPeriod) {
        return { value: {}, signal: 'neutral' };
    }

    const closes = candles.map(c => c.close);
    const macdValues = MACD.calculate({
        values: closes,
        fastPeriod,
        slowPeriod,
        signalPeriod,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    });

    const currentMACD = macdValues[macdValues.length - 1];

    if (!currentMACD) {
        return { value: {}, signal: 'neutral' };
    }

    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    if (currentMACD.histogram && currentMACD.histogram > 0) signal = 'buy';
    else if (currentMACD.histogram && currentMACD.histogram < 0) signal = 'sell';

    return {
        value: currentMACD,
        signal,
        metadata: { fastPeriod, slowPeriod, signalPeriod }
    };
}
