import { useMemo } from 'react';
import { Candle, StrategyName } from '@/lib/types';
import { executeStrategy } from '@/lib/engine/strategies';
import type { SeriesMarker, Time } from 'lightweight-charts';

/**
 * Hook to calculate strategy markers for lightweight-charts
 */
export function useStrategyMarkers(
    candles: Candle[],
    strategyName: StrategyName | null
): { markers: SeriesMarker<Time>[]; strategyStatus: string } {

    return useMemo(() => {
        if (!strategyName || candles.length === 0) {
            return { markers: [], strategyStatus: 'IDLE' };
        }

        const markers: SeriesMarker<Time>[] = [];

        // Run strategy on rolling windows to detect all signals
        for (let i = 50; i < candles.length; i++) {
            const window = candles.slice(0, i + 1);
            const result = executeStrategy(strategyName, window);

            // Only create markers for significant status changes
            if (result.status === 'ENTRY' || result.status === 'EXIT') {
                const candle = candles[i];
                const isLong = (result.metadata?.side === 'LONG' || result.metadata?.type === 'BULLISH');

                let color: string;
                let shape: SeriesMarker<Time>['shape'];
                let position: SeriesMarker<Time>['position'];
                let text = '';

                if (result.status === 'ENTRY') {
                    if (isLong) {
                        color = '#10b981'; // Green
                        shape = 'arrowUp';
                        position = 'belowBar';
                        text = '↑ LONG';
                    } else {
                        color = '#ef4444'; // Red
                        shape = 'arrowDown';
                        position = 'aboveBar';
                        text = '↓ SHORT';
                    }
                } else { // EXIT
                    color = '#f59e0b'; // Orange
                    shape = 'circle';
                    position = 'inBar';
                    text = '⊗ EXIT';
                }

                markers.push({
                    time: (candle.time / 1000) as Time, // Convert to seconds for lightweight-charts
                    position,
                    color,
                    shape,
                    text
                });
            }
        }

        // Get final strategy status from last candle
        const finalResult = executeStrategy(strategyName, candles);
        const statusText = finalResult.reason || finalResult.status;

        return { markers, strategyStatus: statusText };
    }, [candles, strategyName]);
}
