import { Candle, StrategyResponse } from '../types';
import { calculateBollingerBands } from '../indicators/bollinger';
import { calculateRSI } from '../indicators/rsi';

export interface BollingerBounceOptions {
    bbPeriod?: number;
    bbStdDev?: number;
    rsiPeriod?: number;
    rsiOversold?: number;
    rsiOverbought?: number;
}

/**
 * Bollinger Bounce Strategy
 * 
 * LONG Entry: Price touches lower BB + RSI < oversold threshold
 * SHORT Entry: Price touches upper BB + RSI > overbought threshold
 * Target: Mean reversion to middle band
 * 
 * @param candles - Array of OHLCV candles
 * @param options - Strategy parameters
 * @returns StrategyResponse with status, price levels, and metadata
 */
export function strategyBollingerBounce(candles: Candle[], options: BollingerBounceOptions = {}): StrategyResponse {
    const {
        bbPeriod = 20,
        bbStdDev = 2,
        rsiPeriod = 14,
        rsiOversold = 30,
        rsiOverbought = 70
    } = options;

    const bb = calculateBollingerBands(candles, bbPeriod, bbStdDev);
    const rsi = calculateRSI(candles, rsiPeriod);

    // Check if we have enough data
    if (!bb.value || !rsi.value) {
        return {
            status: 'IDLE',
            priceLevels: {},
            reason: 'Insufficient Data'
        };
    }

    const current = candles[candles.length - 1];
    const { upper, middle, lower } = bb.value;
    const rsiValue = rsi.value;

    let status: StrategyResponse['status'] = 'IDLE';
    const entryPrice = current.close;
    let stopLoss = 0;
    let takeProfit = 0;
    let reason = '';
    let side: 'LONG' | 'SHORT' = 'LONG';

    // Calculate distance to bands as percentage
    const distanceToLower = ((current.close - lower) / current.close) * 100;
    const distanceToUpper = ((upper - current.close) / current.close) * 100;

    // LONG Setup: Price at lower band + RSI oversold
    const touchingLowerBand = distanceToLower < 0.5; // Within 0.5% of lower band
    const isOversold = rsiValue < rsiOversold;

    // SHORT Setup: Price at upper band + RSI overbought
    const touchingUpperBand = distanceToUpper < 0.5; // Within 0.5% of upper band
    const isOverbought = rsiValue > rsiOverbought;

    if (touchingLowerBand && isOversold) {
        status = 'ENTRY';
        side = 'LONG';
        reason = `BB Bounce Long: Price at lower band ($${lower.toFixed(2)}), RSI ${rsiValue.toFixed(1)}`;

        stopLoss = lower * 0.98; // 2% below lower band
        takeProfit = middle; // Target middle band
    } else if (touchingUpperBand && isOverbought) {
        status = 'ENTRY';
        side = 'SHORT';
        reason = `BB Bounce Short: Price at upper band ($${upper.toFixed(2)}), RSI ${rsiValue.toFixed(1)}`;

        stopLoss = upper * 1.02; // 2% above upper band
        takeProfit = middle; // Target middle band
    } else if (distanceToLower < 2 && rsiValue < (rsiOversold + 5)) {
        // Approaching long setup
        status = 'WATCH';
        reason = `Approaching Lower Band: ${distanceToLower.toFixed(1)}% away, RSI ${rsiValue.toFixed(1)}`;
    } else if (distanceToUpper < 2 && rsiValue > (rsiOverbought - 5)) {
        // Approaching short setup
        status = 'WATCH';
        reason = `Approaching Upper Band: ${distanceToUpper.toFixed(1)}% away, RSI ${rsiValue.toFixed(1)}`;
    }

    return {
        status,
        priceLevels: {
            entry: entryPrice,
            stopLoss,
            takeProfit
        },
        reason,
        metadata: {
            rsi: rsiValue,
            bbUpper: upper,
            bbMiddle: middle,
            bbLower: lower,
            side
        }
    };
}
