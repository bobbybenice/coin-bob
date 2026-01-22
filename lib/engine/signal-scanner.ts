import { Candle, StrategyFunction } from '../types';

export interface Signal {
    time: number;
    price: number;
    type: 'LONG' | 'SHORT' | 'WATCH';
    label: string;
    reason: string;
    metadata?: Record<string, unknown>;
}

export function scanSignals(strategy: StrategyFunction, candles: Candle[]): Signal[] {
    const signals: Signal[] = [];
    const MIN_CANDLES = 50; // Minimum history needed for most strategies

    if (candles.length < MIN_CANDLES) return [];

    // sliding window approach
    // We start from MIN_CANDLES and go to the end
    for (let i = MIN_CANDLES; i < candles.length; i++) {
        const window = candles.slice(0, i + 1);
        const currentCandle = candles[i];

        // Run strategy on this window
        const response = strategy(window);

        if (response.status === 'ENTRY') {
            const meta = response.metadata as { side?: 'LONG' | 'SHORT' };
            const side = meta?.side || 'LONG';

            signals.push({
                time: currentCandle.time,
                price: currentCandle.close,
                type: side,
                label: 'ENTRY',
                reason: response.reason || 'Strategy Entry',
                metadata: response.metadata
            });
        }
    }

    return signals;
}
