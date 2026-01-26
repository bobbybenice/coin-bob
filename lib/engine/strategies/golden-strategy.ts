import { Candle, StrategyResponse } from '../../types';
import { calculateEMA } from '../indicators/ema';
import { calculateBollingerBands } from '../indicators/bollinger';
import { calculateRSI } from '../indicators/rsi';
import { calculateATR } from '../indicators/atr';
import { calculateADX } from '../indicators/adx';

export interface GoldenStrategyOptions {
    trendEmaPeriod?: number; // Slow EMA (200)
    fastEmaPeriod?: number;  // Fast EMA (50) for alignment
    bbPeriod?: number;
    bbStdDev?: number;
    rsiPeriod?: number;
    rsiOversold?: number;
    rsiOverbought?: number;
    atrPeriod?: number;
    adxPeriod?: number;
    minAdx?: number;     // Minimum trend strength
    riskRewardRatio?: number;
}

export function strategyGolden(candles: Candle[], options: GoldenStrategyOptions = {}): StrategyResponse {
    const {
        trendEmaPeriod = 200,
        fastEmaPeriod = 50,
        bbPeriod = 20,
        bbStdDev = 2,
        rsiPeriod = 14,
        rsiOversold = 40,
        rsiOverbought = 60,
        atrPeriod = 14,
        adxPeriod = 14,
        minAdx = 25,
        riskRewardRatio = 2
    } = options;

    const minPeriod = Math.max(trendEmaPeriod, fastEmaPeriod, bbPeriod, rsiPeriod, atrPeriod, adxPeriod) + 5;
    if (candles.length < minPeriod) {
        return {
            status: 'IDLE',
            priceLevels: {},
            reason: 'Insufficient Data'
        };
    }

    // 1. Trend Filter (The King)
    const ema = calculateEMA(candles, trendEmaPeriod);
    const fastEma = calculateEMA(candles, fastEmaPeriod);
    const currentEma = ema.value; // Slow (200)
    const currentFastEma = fastEma.value; // Fast (50)

    // 2. Volatility & Momentum (The Setup)
    const bb = calculateBollingerBands(candles, bbPeriod, bbStdDev);
    const rsi = calculateRSI(candles, rsiPeriod);
    const atr = calculateATR(candles, atrPeriod);
    const adx = calculateADX(candles, adxPeriod);

    if (!currentEma || !currentFastEma || !bb.value || !rsi.value || !atr.value || !adx.value) {
        return { status: 'IDLE', priceLevels: {}, reason: 'Calculating Indicators' };
    }

    const { upper, lower } = bb.value; // Middle unused here
    const currentRSI = rsi.value;
    const currentATR = atr.value;
    const currentADX = adx.value.adx;

    const current = candles[candles.length - 2];
    const prev = candles[candles.length - 3];
    if (!current || !prev) return { status: 'IDLE', priceLevels: {}, reason: 'Insufficient Data' };

    const prevBB = calculateBollingerBands(candles.slice(0, -1), bbPeriod, bbStdDev); // Recalculate for prev? Or optimize?
    // Optimization: The manual BB calc returns just the latest. 
    // To check "Previous Candle was outside", we ideally need history.
    // For now, let's re-run for prev window to be safe and accurate without full array return.

    // Actually, `prevBB` needs `lower` and `upper` from T-1.
    if (!prevBB.value) return { status: 'IDLE', priceLevels: {}, reason: 'Calculating Indicators' };


    let status: StrategyResponse['status'] = 'IDLE';
    let reason = '';
    const entryPrice = current.close;
    let stopLoss = 0;
    let takeProfit = 0;

    // LONG Setup
    // 1. Trend is UP (Price > EMA 200 AND EMA 50 > EMA 200)
    // 2. Trend Strength (ADX > 25)
    // 3. Price dipped to Lower Band (Pullback)
    // 4. Price rejected low and closed back INSIDE the band (Trigger)
    const isUptrend = current.close > currentEma && currentFastEma > currentEma;
    const isTrendStrong = currentADX >= minAdx;

    // Check previous candle against PREVIOUS bands
    const wasBelowLowerBand = prev.low <= prevBB.value.lower;
    const isBackInside = current.close > lower;
    const isRsiGood = currentRSI < rsiOversold; // Using configurable threshold (default 40)

    if (isUptrend && isTrendStrong && wasBelowLowerBand && isBackInside && isRsiGood) {
        status = 'ENTRY';
        reason = `Golden Long: Trend Pullback (Align: UP, ADX: ${currentADX.toFixed(1)}, Bounce off Lower BB)`;

        // SL = 2x ATR below entry
        stopLoss = entryPrice - (2 * currentATR);
        // TP = Risk * Ratio
        const risk = entryPrice - stopLoss;
        takeProfit = entryPrice + (risk * riskRewardRatio);
    }

    // SHORT Setup
    // 1. Trend is DOWN (Price < EMA 200 AND EMA 50 < EMA 200)
    // 2. Trend Strength (ADX > 25)
    // 3. Price rallied to Upper Band (Pullback)
    // 4. Price rejected high and closed back INSIDE the band (Trigger)
    const isDowntrend = current.close < currentEma && currentFastEma < currentEma;
    // Reuse isTrendStrong (ADX measures strength, not direction)
    const wasAboveUpperBand = prev.high >= prevBB.value.upper;
    const isBackInsideDown = current.close < upper;
    const isRsiGoodShort = currentRSI > rsiOverbought; // Using configurable threshold (default 60)

    if (isDowntrend && isTrendStrong && wasAboveUpperBand && isBackInsideDown && isRsiGoodShort) {
        status = 'ENTRY';
        reason = `Golden Short: Trend Pullback (Align: DOWN, ADX: ${currentADX.toFixed(1)}, Rejection at Upper BB)`;

        // SL = 2x ATR above entry
        stopLoss = entryPrice + (2 * currentATR);
        // TP = Risk * Ratio
        const risk = stopLoss - entryPrice;
        takeProfit = entryPrice - (risk * riskRewardRatio);
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
            ema: currentEma,
            rsi: currentRSI,
            atr: currentATR,
            side: (status === 'ENTRY' && isDowntrend) ? 'SHORT' : 'LONG'
        }
    };
}
