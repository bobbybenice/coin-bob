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

        // Run strategy on rolling windows to detect all signals
        // Note: For MTF strategies, rolling window historical simulation is tricky because we'd need historical HTF candles aligned with LTF window.
        // Simplified approach: pass current full MTF map for context. This implies "look-ahead" bias for historical markers if the HTF candles are the "final" versions.
        // Ideally we'd slice MTF candles too, but for now we accept the limitation for visual markers or rely on strategy to handle it (strategy handles it by looking at latest usually).
        // Let's pass the MTF map as static context. The strategy is responsible for not peeking future if it cares, but mostly we care about live signals.

        for (let i = 50; i < candles.length; i++) {
            const window = candles.slice(0, i + 1);
            const result = executeStrategy(strategyName, window, { multiTimeframeCandles });

            // Only create markers for significant status changes
            if (result.status === 'ENTRY' || result.status === 'EXIT') {
                const candle = candles[i];
                const isLong = (result.metadata?.side === 'LONG' || result.metadata?.sweep === 'BULLISH' || (result.metadata?.fvg && result.metadata.fvg === 'BULLISH'));
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
                        text = 'DIAMOND LONG';
                    } else {
                        color = '#ff0055'; // Neon Red
                        shape = 'circle';
                        position = 'aboveBar';
                        text = 'DIAMOND SHORT';
                    }
                } else if (isContinuation) {
                    // Continuation POI
                    // Use Arrow but maybe different text
                    if (isLong) {
                        color = '#3b82f6'; // Blue
                        shape = 'arrowUp';
                        position = 'belowBar';
                        text = 'PULLBACK LONG';
                    } else {
                        color = '#f97316'; // Orange
                        shape = 'arrowDown';
                        position = 'aboveBar';
                        text = 'PULLBACK SHORT';
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
