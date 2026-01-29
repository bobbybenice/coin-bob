import { Candle, StrategyResponse } from '../../types';
import { calculateEMA } from '../indicators/ema';
import { detectFVGs } from './ict';

/**
 * Continuation POI Strategy
 * 
 * Concept:
 * 1. Trend Filter (HTF): Price > EMA 200 (1H/4H/1D depending on context)
 * 2. Structure (LTF): Recent BOS (Break of Structure)
 * 3. Entry (LTF): Retracement into the FVG that caused the BOS
 */
export function strategyContinuationPOI(
    candles: Candle[],
    options?: Record<string, unknown> & { multiTimeframeCandles?: Record<string, Candle[]> }
): StrategyResponse {
    if (candles.length < 200) {
        return { status: 'IDLE', priceLevels: {}, reason: 'Insufficient data' };
    }

    // 1. Determine Trend Context (HTF or Current if no MTF provided)
    // We try to grab a higher timeframe. If we are on 15m, we want 1h or 4h.
    let trendCandles = candles;
    let trendTimeframe = 'Current';

    // Simple heuristic to pick HTF
    if (options?.multiTimeframeCandles) {
        const mtf = options.multiTimeframeCandles;
        // If current is < 1h (guessing by candle count or passed knowledge? We don't know current TF name here easily without passing it)
        // Assume candles passed are the "Primary" timeframe. 
        // We will look for 4h or 1d relative to implicit hierarchy?
        // Actually, let's just use the largest available that is reasonably 'HTF'
        if (mtf['4h']) {
            trendCandles = mtf['4h'];
            trendTimeframe = '4H';
        } else if (mtf['1h']) {
            trendCandles = mtf['1h'];
            trendTimeframe = '1H';
        } else if (mtf['1d']) {
            trendCandles = mtf['1d'];
            trendTimeframe = '1D';
        }
    }

    // Calculate EMA 200 on Trend Context
    const ema200Result = calculateEMA(trendCandles, 200);
    const lastTrendCandle = trendCandles[trendCandles.length - 1];

    // Trend Bias
    const isBullishTrend = lastTrendCandle.close > ema200Result.value;
    const isBearishTrend = lastTrendCandle.close < ema200Result.value;

    const reasonParts: string[] = [`Trend (${trendTimeframe}): ${isBullishTrend ? 'BULLISH' : 'BEARISH'}`];

    // 2. Identify POI (FVGs) on Current Timeframe
    // We are looking for UNMITIGATED FVGs
    const allFVGs = detectFVGs(candles);
    const activeFVGs = allFVGs.filter(fvg => !fvg.mitigated);

    // Sort by recency?
    // We only care about specific alignment:
    // Bullish Trend -> Bullish FVG
    // Bearish Trend -> Bearish FVG
    const alignedFVGs = activeFVGs.filter(fvg =>
        (isBullishTrend && fvg.type === 'BULLISH') ||
        (isBearishTrend && fvg.type === 'BEARISH')
    );

    if (alignedFVGs.length === 0) {
        return {
            status: 'IDLE',
            priceLevels: {},
            reason: reasonParts.join(', ')
        };
    }

    // 3. Current Price Action
    const current = candles[candles.length - 1];
    let signal: StrategyResponse['status'] = 'IDLE';
    let targetFVG = null;

    // Check if price is INSIDE or approaching an aligned FVG
    // For Bullish: Price dips into FVG
    // For Bearish: Price rallies into FVG

    for (const fvg of alignedFVGs) {
        // Skip really old FVGs? Maybe last 50 candles?
        if (current.time - fvg.start > 50 * 60 * 1000 * 15) { // Rough check, assume not super old
            // keep checking, maybe it's valid support
        }

        if (isBullishTrend) {
            // Price effectively testing the zone?
            // High >= Bottom && Low <= Top
            if (current.low <= fvg.top && current.high >= fvg.bottom) {
                signal = 'ENTRY'; // Touching POI
                targetFVG = fvg;
                reasonParts.push('Price in Bullish POI');
                break;
            } else if (current.low > fvg.top && (current.low - fvg.top) / fvg.top < 0.005) {
                // Approaching (0.5% away)
                signal = 'WATCH';
                reasonParts.push('Approaching Bullish POI');
                targetFVG = fvg;
            }
        } else {
            // Bearish
            if (current.high >= fvg.bottom && current.low <= fvg.top) {
                signal = 'ENTRY';
                targetFVG = fvg;
                reasonParts.push('Price in Bearish POI');
                break;
            } else if (current.high < fvg.bottom && (fvg.bottom - current.high) / current.high < 0.005) {
                signal = 'WATCH';
                reasonParts.push('Approaching Bearish POI');
                targetFVG = fvg;
            }
        }
    }

    return {
        status: signal,
        priceLevels: {
            entry: targetFVG ? (isBullishTrend ? targetFVG.top : targetFVG.bottom) : undefined,
            stopLoss: targetFVG ? (isBullishTrend ? targetFVG.bottom : targetFVG.top) : undefined
        },
        reason: reasonParts.join(', '),
        metadata: {
            side: isBullishTrend ? 'LONG' : 'SHORT',
            targetFVG,
            trendTimeframe,
            activeZones: alignedFVGs // Visualize these on chart
        }
    };
}
