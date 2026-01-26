import { Candle, StrategyResponse } from '../../types';
import { calculateEMA } from '../indicators/ema';

export interface EMACrossoverOptions {
    fastPeriod?: number;
    slowPeriod?: number;
    confirmationCandles?: number;
}

/**
 * EMA Crossover Strategy
 * 
 * Golden Cross: Fast EMA crosses above Slow EMA (bullish)
 * Death Cross: Fast EMA crosses below Slow EMA (bearish)
 * 
 * Typically uses EMA 50/200 for long-term trends
 * 
 * @param candles - Array of OHLCV candles
 * @param options - Strategy parameters
 * @returns StrategyResponse with status, price levels, and metadata
 */
export function strategyEMACrossover(candles: Candle[], options: EMACrossoverOptions = {}): StrategyResponse {
    const {
        fastPeriod = 50,
        slowPeriod = 200,
        confirmationCandles = 2
    } = options;

    const fastEMA = calculateEMA(candles, fastPeriod);
    const slowEMA = calculateEMA(candles, slowPeriod);

    // Check if we have enough data
    if (!fastEMA.value || !slowEMA.value || isNaN(fastEMA.value) || isNaN(slowEMA.value)) {
        return {
            status: 'IDLE',
            priceLevels: {},
            reason: 'Insufficient Data'
        };
    }

    const current = candles[candles.length - 2];
    if (!current) return { status: 'IDLE', priceLevels: {}, reason: 'Insufficient Data' };

    // Get previous EMAs to detect crossover
    let prevFastEMA = NaN;
    let prevSlowEMA = NaN;

    if (candles.length >= slowPeriod + confirmationCandles) {
        const prevCandles = candles.slice(0, -confirmationCandles);
        const prevFast = calculateEMA(prevCandles, fastPeriod);
        const prevSlow = calculateEMA(prevCandles, slowPeriod);
        prevFastEMA = prevFast.value || NaN;
        prevSlowEMA = prevSlow.value || NaN;
    }

    const currentFast = fastEMA.value;
    const currentSlow = slowEMA.value;

    let status: StrategyResponse['status'] = 'IDLE';
    let reason = '';

    // Initialize side based on current Chart State (Fast > Slow = Bull/Long)
    // This fixes the bug where it defaulted to 'LONG' even in a downtrend.
    let side: 'LONG' | 'SHORT' | undefined = currentFast > currentSlow ? 'LONG' : 'SHORT';

    let stopLoss = 0;
    let takeProfit = 0;

    // Calculate EMA separation as percentage
    const separation = ((currentFast - currentSlow) / currentSlow) * 100;
    const prevSeparation = !isNaN(prevFastEMA) && !isNaN(prevSlowEMA)
        ? ((prevFastEMA - prevSlowEMA) / prevSlowEMA) * 100
        : separation;

    // Golden Cross: Fast EMA crosses above Slow EMA
    if (currentFast > currentSlow && prevFastEMA < prevSlowEMA) {
        status = 'ENTRY';
        side = 'LONG';
        reason = `Golden Cross: EMA${fastPeriod} crossed above EMA${slowPeriod} (sep: ${separation.toFixed(2)}%)`;

        stopLoss = currentSlow * 0.98; // Stop below slow EMA
        takeProfit = current.close * 1.08; // 8% target for longer-term trade
    }
    // Death Cross: Fast EMA crosses below Slow EMA
    else if (currentFast < currentSlow && prevFastEMA > prevSlowEMA) {
        status = 'ENTRY';
        side = 'SHORT';
        reason = `Death Cross: EMA${fastPeriod} crossed below EMA${slowPeriod} (sep: ${separation.toFixed(2)}%)`;

        stopLoss = currentSlow * 1.02; // Stop above slow EMA
        takeProfit = current.close * 0.92; // 8% target for longer-term trade
    }
    // Approaching Golden Cross
    else if (currentFast < currentSlow && Math.abs(separation) < 1 && separation > prevSeparation) {
        status = 'WATCH';
        side = undefined; // Force Neutral for "Warning" state
        reason = `Approaching Golden Cross: EMAs converging (${Math.abs(separation).toFixed(2)}% apart)`;
    }
    // Approaching Death Cross
    else if (currentFast > currentSlow && Math.abs(separation) < 1 && separation < prevSeparation) {
        status = 'WATCH';
        side = undefined; // Force Neutral for "Warning" state
        reason = `Approaching Death Cross: EMAs converging (${Math.abs(separation).toFixed(2)}% apart)`;
    }
    // Exit: Opposite crossover
    else if (currentFast < currentSlow && prevFastEMA > prevSlowEMA && Math.abs(separation) > 0.5) {
        status = 'EXIT';
        reason = `Death Cross Confirmed: Exit long positions`;
    }
    else if (currentFast > currentSlow && prevFastEMA < prevSlowEMA && Math.abs(separation) > 0.5) {
        status = 'EXIT';
        reason = `Golden Cross Confirmed: Exit short positions`;
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
            fastEMA: currentFast,
            slowEMA: currentSlow,
            separation,
            side, // Will be undefined for WATCH -> Neutral (Gray) Dot
            crossoverType: currentFast > currentSlow ? 'GOLDEN' : 'DEATH'
        }
    };
}
