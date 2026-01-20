import { RSI, BollingerBands, EMA, ATR, ADX } from 'technicalindicators';
import { Candle, StrategyResponse } from '../types';

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

    const closes = candles.map(c => c.close);
    const high = candles.map(c => c.high);
    const low = candles.map(c => c.low);
    // Volume not currently used in V2
    // const volume = candles.map(c => c.volume);

    // 1. Trend Filter (The King)
    const emaValues = EMA.calculate({ period: trendEmaPeriod, values: closes });
    const fastEmaValues = EMA.calculate({ period: fastEmaPeriod, values: closes });
    const currentEma = emaValues[emaValues.length - 1]; // Slow (200)
    const currentFastEma = fastEmaValues[fastEmaValues.length - 1]; // Fast (50)

    // 2. Volatility & Momentum (The Setup)
    const bbValues = BollingerBands.calculate({ period: bbPeriod, stdDev: bbStdDev, values: closes });
    const rsiValues = RSI.calculate({ period: rsiPeriod, values: closes });
    const atrValues = ATR.calculate({ high, low, close: closes, period: atrPeriod });
    const adxValues = ADX.calculate({ high, low, close: closes, period: adxPeriod });

    const currentBB = bbValues[bbValues.length - 1];
    const prevBB = bbValues[bbValues.length - 2];

    const currentRSI = rsiValues[rsiValues.length - 1];
    const currentATR = atrValues[atrValues.length - 1];
    const currentADX = adxValues[adxValues.length - 1];

    if (!currentEma || !currentFastEma || !currentBB || !prevBB || !currentRSI || !currentATR || !currentADX) {
        return { status: 'IDLE', priceLevels: {}, reason: 'Calculating Indicators' };
    }

    const current = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
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
    const isTrendStrong = currentADX.adx >= minAdx;
    const wasBelowLowerBand = prev.low <= prevBB.lower;
    const isBackInside = current.close > currentBB.lower;
    const isRsiGood = currentRSI < rsiOversold; // Using configurable threshold (default 40)

    if (isUptrend && isTrendStrong && wasBelowLowerBand && isBackInside && isRsiGood) {
        status = 'ENTRY';
        reason = `Golden Long: Trend Pullback (Align: UP, ADX: ${currentADX.adx.toFixed(1)}, Bounce off Lower BB)`;

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
    const wasAboveUpperBand = prev.high >= prevBB.upper;
    const isBackInsideDown = current.close < currentBB.upper;
    const isRsiGoodShort = currentRSI > rsiOverbought; // Using configurable threshold (default 60)

    if (isDowntrend && isTrendStrong && wasAboveUpperBand && isBackInsideDown && isRsiGoodShort) {
        status = 'ENTRY';
        reason = `Golden Short: Trend Pullback (Align: DOWN, ADX: ${currentADX.adx.toFixed(1)}, Rejection at Upper BB)`;

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
