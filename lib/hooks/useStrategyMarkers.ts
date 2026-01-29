import { useMemo } from 'react';
import { Candle, StrategyName, ActiveZone } from '@/lib/types';
import { executeStrategy } from '@/lib/engine/strategies';
import type { SeriesMarker, Time } from 'lightweight-charts';

/**
 * Hook to calculate strategy markers for lightweight-charts
 */
export function useStrategyMarkers(
    candles: Candle[],
    strategyName: StrategyName | null,
    multiTimeframeCandles?: Record<string, Candle[]>
): { markers: SeriesMarker<Time>[]; strategyStatus: string; activeZones: ActiveZone[]; sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' } {

    return useMemo(() => {
        if (!strategyName || candles.length === 0) {
            return { markers: [], strategyStatus: 'IDLE', activeZones: [], sentiment: 'NEUTRAL' };
        }

        const markers: SeriesMarker<Time>[] = [];

        // Track last signal to prevent overlapping markers for strategies like Continuation POI
        let lastSignalIndex = -1;
        let lastSignalSide = '';

        for (let i = 50; i < candles.length; i++) {
            const window = candles.slice(0, i + 1);
            const result = executeStrategy(strategyName, window, { multiTimeframeCandles });

            // Only create markers for significant status changes
            if (result.status === 'ENTRY' || result.status === 'EXIT') {
                const candle = candles[i];
                const isLong = (result.metadata?.side === 'LONG' || result.metadata?.sweep === 'BULLISH' || (result.metadata?.fvg && result.metadata.fvg === 'BULLISH'));
                const currentSide = isLong ? 'LONG' : 'SHORT';

                // Clutter Prevention:
                // If we are Continuation POI, we only want the FIRST signal in a sequence.
                // If the previous candle (i-1) was also a signal of the same side, skip this one.
                if (strategyName === 'CONTINUATION_POI') {
                    // Check if we just fired a signal recently
                    if (lastSignalIndex === i - 1 && lastSignalSide === currentSide) {
                        lastSignalIndex = i; // Update index to track continuity but DON'T push marker
                        continue;
                    }
                }

                const isConvergence = !!result.metadata?.convergenceOB;
                const isContinuation = strategyName === 'CONTINUATION_POI';

                let color: string;
                let shape: SeriesMarker<Time>['shape'];
                let position: SeriesMarker<Time>['position'];
                let text = '';

                if (isConvergence) {
                    // Convergence-OB Strategy
                    if (isLong) {
                        color = '#00ff9d'; // Neon Green
                        shape = 'circle';
                        position = 'belowBar';
                        text = 'DIAMOND';
                    } else {
                        color = '#ff0055'; // Neon Red
                        shape = 'circle';
                        position = 'aboveBar';
                        text = 'DIAMOND';
                    }
                } else if (isContinuation) {
                    // Continuation POI
                    // Shortened text to reduce clutter
                    if (isLong) {
                        color = '#3b82f6'; // Blue
                        shape = 'arrowUp';
                        position = 'belowBar';
                        text = 'PB LONG';
                    } else {
                        color = '#f97316'; // Orange
                        shape = 'arrowDown';
                        position = 'aboveBar';
                        text = 'PB SHORT';
                    }
                } else if (isLong) {
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

                lastSignalIndex = i;
                lastSignalSide = currentSide;
            }
        }

        // Get final strategy status from last candle
        const finalResult = executeStrategy(strategyName, candles, { multiTimeframeCandles });
        const statusText = finalResult.reason || finalResult.status;
        const activeZones = (finalResult.metadata?.activeZones || []) as ActiveZone[];

        // Determine sentiment (BULLISH, BEARISH, NEUTRAL)
        let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';

        if (finalResult.status !== 'IDLE' && finalResult.status !== 'WAIT') {
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
    }, [candles, strategyName, multiTimeframeCandles]);
}
