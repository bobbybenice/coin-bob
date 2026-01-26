import { Candle, IndicatorResult } from '../../types';

export function calculateMFI(candles: Candle[], period: number = 14): IndicatorResult {
    if (candles.length < period + 1) { // Need at least period + 1 for diff
        return { value: NaN, signal: 'neutral' };
    }

    try {
        const high = candles.map(c => c.high);
        const low = candles.map(c => c.low);
        const close = candles.map(c => c.close);
        const volume = candles.map(c => c.volume);

        const typicalPrices: number[] = [];
        const moneyFlows: { pos: number, neg: number }[] = [];

        // 1. Calculate Typical Prices
        for (let i = 0; i < close.length; i++) {
            typicalPrices.push((high[i] + low[i] + close[i]) / 3);
        }

        // 2. Calculate Flows
        for (let i = 1; i < typicalPrices.length; i++) {
            const currentTP = typicalPrices[i];
            const prevTP = typicalPrices[i - 1];
            const rawFlow = currentTP * volume[i];

            if (currentTP > prevTP) {
                moneyFlows.push({ pos: rawFlow, neg: 0 });
            } else if (currentTP < prevTP) {
                moneyFlows.push({ pos: 0, neg: rawFlow });
            } else {
                moneyFlows.push({ pos: 0, neg: 0 }); // No change
            }
        }

        // 3. Sum flows for the LAST period window
        // The MFI is just for the current (last) candle usually.
        // But if we wanted array we'd iterate.
        // Implementation for single latest value:

        if (moneyFlows.length < period) return { value: 50, signal: 'neutral' };

        const recentFlows = moneyFlows.slice(-period);
        const totalPos = recentFlows.reduce((sum, f) => sum + f.pos, 0);
        const totalNeg = recentFlows.reduce((sum, f) => sum + f.neg, 0);

        // 4. Calculate Ratio
        let mfi = 50;
        if (totalNeg === 0) {
            mfi = totalPos === 0 ? 50 : 100;
        } else {
            const mfr = totalPos / totalNeg;
            mfi = 100 - (100 / (1 + mfr));
        }

        // Clamp
        mfi = Math.max(0, Math.min(100, mfi));

        // Signal Logic
        let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
        if (mfi < 30) signal = 'buy';
        if (mfi > 70) signal = 'sell';

        return {
            value: mfi,
            signal,
            metadata: { period }
        };

    } catch (e) {
        console.warn('MFI Calculation Failed', e);
        return { value: NaN, signal: 'neutral' };
    }
}
