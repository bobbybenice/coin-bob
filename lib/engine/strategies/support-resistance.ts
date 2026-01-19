import { Candle, StrategyResponse } from '../types';

export interface SupportResistanceOptions {
    pivotLookback?: number;
    breakoutConfirmation?: number;
    levelTolerance?: number;
    minTouches?: number;
}

interface PriceLevel {
    price: number;
    touches: number;
    type: 'SUPPORT' | 'RESISTANCE';
}

/**
 * Support/Resistance Strategy
 * 
 * Identifies key support and resistance levels from pivot points
 * Enters on breakout with retest confirmation
 * 
 * @param candles - Array of OHLCV candles
 * @param options - Strategy parameters
 * @returns StrategyResponse with status, price levels, and metadata
 */
export function strategySupportResistance(candles: Candle[], options: SupportResistanceOptions = {}): StrategyResponse {
    const {
        pivotLookback = 20,
        breakoutConfirmation = 2,
        levelTolerance = 0.005, // 0.5% tolerance for level matching
        minTouches = 2
    } = options;

    // Need enough data
    if (candles.length < pivotLookback + breakoutConfirmation + 5) {
        return {
            status: 'IDLE',
            priceLevels: {},
            reason: 'Insufficient Data'
        };
    }

    const current = candles[candles.length - 1];
    const lookback = candles.slice(-pivotLookback - breakoutConfirmation);

    // Identify pivot highs and lows
    const pivotHighs: number[] = [];
    const pivotLows: number[] = [];

    for (let i = 2; i < lookback.length - 2; i++) {
        const candle = lookback[i];
        const isPivotHigh = candle.high > lookback[i - 1].high &&
            candle.high > lookback[i - 2].high &&
            candle.high > lookback[i + 1].high &&
            candle.high > lookback[i + 2].high;

        const isPivotLow = candle.low < lookback[i - 1].low &&
            candle.low < lookback[i - 2].low &&
            candle.low < lookback[i + 1].low &&
            candle.low < lookback[i + 2].low;

        if (isPivotHigh) pivotHighs.push(candle.high);
        if (isPivotLow) pivotLows.push(candle.low);
    }

    // Cluster pivots into levels
    const resistanceLevels = clusterLevels(pivotHighs, levelTolerance, minTouches);
    const supportLevels = clusterLevels(pivotLows, levelTolerance, minTouches);

    let status: StrategyResponse['status'] = 'IDLE';
    let reason = '';
    let side: 'LONG' | 'SHORT' = 'LONG';
    let stopLoss = 0;
    let takeProfit = 0;

    // Check for resistance breakout
    for (const resistance of resistanceLevels) {
        const breakoutDistance = (current.close - resistance.price) / resistance.price;
        const recentCandles = candles.slice(-breakoutConfirmation);
        const confirmedBreakout = recentCandles.every(c => c.close > resistance.price);

        if (breakoutDistance > 0 && breakoutDistance < 0.02 && confirmedBreakout) {
            // Breakout confirmed
            status = 'ENTRY';
            side = 'LONG';
            reason = `Resistance Breakout: Broke $${resistance.price.toFixed(2)} (${resistance.touches} touches)`;

            stopLoss = resistance.price * 0.98; // Stop below broken resistance (now support)

            // Find next resistance for target
            const higherResistance = resistanceLevels.find(r => r.price > current.close * 1.02);
            takeProfit = higherResistance ? higherResistance.price : current.close * 1.06;
            break;
        } else if (Math.abs(current.close - resistance.price) / resistance.price < 0.01 && status === 'IDLE') {
            // Approaching resistance
            status = 'WATCH';
            reason = `Approaching Resistance: $${resistance.price.toFixed(2)} (${resistance.touches} touches)`;
        }
    }

    // Check for support breakdown
    if (status !== 'ENTRY') {
        for (const support of supportLevels) {
            const breakdownDistance = (support.price - current.close) / support.price;
            const recentCandles = candles.slice(-breakoutConfirmation);
            const confirmedBreakdown = recentCandles.every(c => c.close < support.price);

            if (breakdownDistance > 0 && breakdownDistance < 0.02 && confirmedBreakdown) {
                // Breakdown confirmed
                status = 'ENTRY';
                side = 'SHORT';
                reason = `Support Breakdown: Broke $${support.price.toFixed(2)} (${support.touches} touches)`;

                stopLoss = support.price * 1.02; // Stop above broken support (now resistance)

                // Find next support for target
                const lowerSupport = supportLevels.find(s => s.price < current.close * 0.98);
                takeProfit = lowerSupport ? lowerSupport.price : current.close * 0.94;
                break;
            } else if (Math.abs(current.close - support.price) / support.price < 0.01 && status === 'IDLE') {
                // Approaching support
                status = 'WATCH';
                reason = `Approaching Support: $${support.price.toFixed(2)} (${support.touches} touches)`;
            }
        }
    }

    // Retest after breakout (EXIT signal for reversal)
    const recentHigh = Math.max(...candles.slice(-5).map(c => c.high));
    const recentLow = Math.min(...candles.slice(-5).map(c => c.low));

    for (const resistance of resistanceLevels) {
        if (current.close < resistance.price && recentHigh > resistance.price) {
            if (status === 'IDLE') {
                status = 'EXIT';
                reason = `Failed Breakout: Rejected at $${resistance.price.toFixed(2)}`;
            }
        }
    }

    for (const support of supportLevels) {
        if (current.close > support.price && recentLow < support.price) {
            if (status === 'IDLE') {
                status = 'EXIT';
                reason = `Failed Breakdown: Held at $${support.price.toFixed(2)}`;
            }
        }
    }

    return {
        status,
        priceLevels: {
            entry: current.close,
            stopLoss,
            takeProfit
        },
        reason,
        metadata: {
            resistanceLevels: resistanceLevels.map(r => r.price),
            supportLevels: supportLevels.map(s => s.price),
            pivotHighsCount: pivotHighs.length,
            pivotLowsCount: pivotLows.length,
            side
        }
    };
}

/**
 * Cluster similar price levels together
 */
function clusterLevels(prices: number[], tolerance: number, minTouches: number): PriceLevel[] {
    if (prices.length === 0) return [];

    const sorted = [...prices].sort((a, b) => a - b);
    const clusters: PriceLevel[] = [];
    let currentCluster: number[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i];
        const clusterAvg = currentCluster.reduce((a, b) => a + b, 0) / currentCluster.length;

        if (Math.abs(current - clusterAvg) / clusterAvg <= tolerance) {
            currentCluster.push(current);
        } else {
            if (currentCluster.length >= minTouches) {
                const avgPrice = currentCluster.reduce((a, b) => a + b, 0) / currentCluster.length;
                const isResistance = avgPrice > sorted[sorted.length - 1] * 0.95; // Simplified classification
                clusters.push({
                    price: avgPrice,
                    touches: currentCluster.length,
                    type: isResistance ? 'RESISTANCE' : 'SUPPORT'
                });
            }
            currentCluster = [current];
        }
    }

    // Add last cluster
    if (currentCluster.length >= minTouches) {
        const avgPrice = currentCluster.reduce((a, b) => a + b, 0) / currentCluster.length;
        const isResistance = avgPrice > sorted[sorted.length - 1] * 0.95;
        clusters.push({
            price: avgPrice,
            touches: currentCluster.length,
            type: isResistance ? 'RESISTANCE' : 'SUPPORT'
        });
    }

    return clusters;
}
