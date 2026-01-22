import { useMemo } from 'react';
import { Candle, StrategyName, ActiveZone } from '@/lib/types';
import { executeStrategy } from '@/lib/engine/strategies';
import type { SeriesMarker, Time } from 'lightweight-charts';

/**
 * Hook to calculate strategy markers for lightweight-charts
 */
export function useStrategyMarkers(
    candles: Candle[],
    strategyName: StrategyName | null
): { markers: SeriesMarker<Time>[]; strategyStatus: string; activeZones: ActiveZone[]; sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' } {

    return useMemo(() => {
        if (!strategyName || candles.length === 0) {
            return { markers: [], strategyStatus: 'IDLE', activeZones: [], sentiment: 'NEUTRAL' };
        }

        const markers: SeriesMarker<Time>[] = [];

        // Run strategy on rolling windows to detect all signals
        for (let i = 50; i < candles.length; i++) {
            const window = candles.slice(0, i + 1);
            const result = executeStrategy(strategyName, window);

            // Only create markers for significant status changes
            if (result.status === 'ENTRY' || result.status === 'EXIT') {
                const candle = candles[i];
                const isLong = (result.metadata?.side === 'LONG' || result.metadata?.sweep === 'BULLISH' || (result.metadata?.fvg && result.metadata.fvg === 'BULLISH'));

                let color: string;
                let shape: SeriesMarker<Time>['shape'];
                let position: SeriesMarker<Time>['position'];
                let text = '';

                // Unified Marker Logic (User request: "Remove 'Exit' marker and only use 'LONG' and 'SHORT'")
                // We treat both ENTRY and EXIT as directional signals derived from metadata.

                if (isLong) {
                    color = '#10b981'; // Green
                    shape = 'arrowUp';
                    position = 'belowBar';
                    text = 'LONG';
                } else {
                    color = '#ef4444'; // Red
                    shape = 'arrowDown';
                    position = 'aboveBar';
                    text = 'SHORT';
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
        const activeZones = (finalResult.metadata?.activeZones || []) as ActiveZone[];

        // Determine sentiment (BULLISH, BEARISH, NEUTRAL)
        let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';

        // Only calculate sentiment if we have an active signal or relevant state
        if (finalResult.status !== 'IDLE' && finalResult.status !== 'WAIT' && finalResult.status !== 'WATCH') {
            const meta = finalResult.metadata;
            if (meta) {
                if (meta.side === 'LONG' || meta.sweep === 'BULLISH' || meta.fvg === 'BULLISH') {
                    sentiment = 'BULLISH';
                } else if (meta.side === 'SHORT' || meta.sweep === 'BEARISH' || meta.fvg === 'BEARISH') {
                    sentiment = 'BEARISH';
                }
            }
        }

        return { markers, strategyStatus: statusText, activeZones, sentiment };
    }, [candles, strategyName]);
}
