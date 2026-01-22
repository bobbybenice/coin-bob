import { Candle, StrategyResponse } from '../../types';

export interface VolumeBreakoutOptions {
    volumeMultiplier?: number;
    lookbackPeriod?: number;
    priceBreakoutThreshold?: number;
}

/**
 * Volume Breakout Strategy
 * 
 * Detects significant volume spikes combined with price breakouts
 * LONG: Volume spike + breakout above recent high
 * SHORT: Volume spike + breakdown below recent low
 * 
 * @param candles - Array of OHLCV candles
 * @param options - Strategy parameters
 * @returns StrategyResponse with status, price levels, and metadata
 */
export function strategyVolumeBreakout(candles: Candle[], options: VolumeBreakoutOptions = {}): StrategyResponse {
    const {
        volumeMultiplier = 3,
        lookbackPeriod = 20,
        priceBreakoutThreshold = 0.01 // 1% above/below range
    } = options;

    // Need enough data for analysis
    if (candles.length < lookbackPeriod + 1) {
        return {
            status: 'IDLE',
            priceLevels: {},
            reason: 'Insufficient Data'
        };
    }

    const current = candles[candles.length - 1];
    const lookback = candles.slice(-lookbackPeriod - 1, -1); // Exclude current candle

    // Calculate average volume over lookback period
    const avgVolume = lookback.reduce((sum, c) => sum + c.volume, 0) / lookback.length;
    const currentVolumeRatio = current.volume / avgVolume;

    // Find recent high and low
    const recentHigh = Math.max(...lookback.map(c => c.high));
    const recentLow = Math.min(...lookback.map(c => c.low));
    const range = recentHigh - recentLow;

    // Check for price position relative to range
    const breakoutAbove = current.close > (recentHigh + range * priceBreakoutThreshold);
    const breakdownBelow = current.close < (recentLow - range * priceBreakoutThreshold);

    let status: StrategyResponse['status'] = 'IDLE';
    let reason = '';
    let side: 'LONG' | 'SHORT' = 'LONG';
    let stopLoss = 0;
    let takeProfit = 0;

    // Volume spike detected
    const isVolumeSpike = currentVolumeRatio >= volumeMultiplier;

    if (isVolumeSpike && breakoutAbove) {
        // Bullish volume breakout
        status = 'ENTRY';
        side = 'LONG';
        reason = `Volume Breakout Long: ${currentVolumeRatio.toFixed(1)}x avg volume, broke above $${recentHigh.toFixed(2)}`;

        stopLoss = recentHigh * 0.98; // Stop below breakout level
        takeProfit = current.close + (range * 1.5); // Target 1.5x the recent range
    } else if (isVolumeSpike && breakdownBelow) {
        // Bearish volume breakout
        status = 'ENTRY';
        side = 'SHORT';
        reason = `Volume Breakout Short: ${currentVolumeRatio.toFixed(1)}x avg volume, broke below $${recentLow.toFixed(2)}`;

        stopLoss = recentLow * 1.02; // Stop above breakdown level
        takeProfit = current.close - (range * 1.5); // Target 1.5x the recent range
    } else if (currentVolumeRatio >= (volumeMultiplier * 0.7) && currentVolumeRatio < volumeMultiplier) {
        // Volume building up
        if (current.close > recentHigh * 0.99) {
            status = 'WATCH';
            reason = `Volume Building (${currentVolumeRatio.toFixed(1)}x avg), approaching high $${recentHigh.toFixed(2)}`;
        } else if (current.close < recentLow * 1.01) {
            status = 'WATCH';
            reason = `Volume Building (${currentVolumeRatio.toFixed(1)}x avg), approaching low $${recentLow.toFixed(2)}`;
        }
    } else if (isVolumeSpike && !breakoutAbove && !breakdownBelow) {
        // Volume spike without breakout (potential reversal or consolidation)
        status = 'WATCH';
        reason = `Volume Spike Detected (${currentVolumeRatio.toFixed(1)}x avg) - awaiting direction`;
    }

    // Exit signal: Volume returning to normal after breakout
    if (status === 'IDLE' && currentVolumeRatio < 1 && currentVolumeRatio > 0.5) {
        const prevCandle = candles[candles.length - 2];
        const prevVolumeRatio = prevCandle ? prevCandle.volume / avgVolume : 1;

        if (prevVolumeRatio >= volumeMultiplier) {
            status = 'EXIT';
            reason = `Volume Declining: Returned to ${currentVolumeRatio.toFixed(1)}x avg - momentum fading`;
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
            currentVolume: current.volume,
            avgVolume,
            volumeRatio: currentVolumeRatio,
            recentHigh,
            recentLow,
            range,
            side
        }
    };
}
