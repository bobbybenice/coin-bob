import { Candle, StrategyResponse } from '../../types';
import { calculateMACD } from '../indicators/macd';

export interface MACDDivergenceOptions {
    fastPeriod?: number;
    slowPeriod?: number;
    signalPeriod?: number;
    lookbackPeriod?: number;
    minDivergenceStrength?: number;
}

/**
 * MACD Divergence Strategy
 * 
 * Detects bullish/bearish divergence between price and MACD histogram
 * Bullish: Price makes lower low, MACD makes higher low
 * Bearish: Price makes higher high, MACD makes lower high
 * 
 * @param candles - Array of OHLCV candles
 * @param options - Strategy parameters
 * @returns StrategyResponse with status, price levels, and metadata
 */
export function strategyMACDDivergence(candles: Candle[], options: MACDDivergenceOptions = {}): StrategyResponse {
    const {
        fastPeriod = 12,
        slowPeriod = 26,
        signalPeriod = 9,
        lookbackPeriod = 20,
        minDivergenceStrength = 0.02 // 2% minimum difference
    } = options;

    const macd = calculateMACD(candles, fastPeriod, slowPeriod, signalPeriod);

    // Need enough data for divergence detection
    if (!macd.value || candles.length < lookbackPeriod + slowPeriod) {
        return {
            status: 'IDLE',
            priceLevels: {},
            reason: 'Insufficient Data'
        };
    }

    const current = candles[candles.length - 1];
    const lookback = candles.slice(-lookbackPeriod);

    // Get MACD histogram values for lookback period
    const histogramValues: number[] = [];
    for (let i = candles.length - lookbackPeriod; i < candles.length; i++) {
        const tempCandles = candles.slice(0, i + 1);
        const tempMACD = calculateMACD(tempCandles, fastPeriod, slowPeriod, signalPeriod);
        if (tempMACD.value?.histogram !== undefined) {
            histogramValues.push(tempMACD.value.histogram);
        }
    }



    if (histogramValues.length < lookbackPeriod) {
        return {
            status: 'IDLE',
            priceLevels: {},
            reason: 'Insufficient MACD Data'
        };
    }

    // Find local extremes in price and MACD
    const priceLows: { index: number; price: number }[] = [];
    const priceHighs: { index: number; price: number }[] = [];
    const macdLows: { index: number; value: number }[] = [];
    const macdHighs: { index: number; value: number }[] = [];

    // Identify local extremes (simple peak/trough detection)
    for (let i = 2; i < lookback.length - 2; i++) {
        const candle = lookback[i];
        const prev = lookback[i - 1];
        const next = lookback[i + 1];

        // Price lows
        if (candle.low < prev.low && candle.low < next.low) {
            priceLows.push({ index: i, price: candle.low });
        }

        // Price highs
        if (candle.high > prev.high && candle.high > next.high) {
            priceHighs.push({ index: i, price: candle.high });
        }

        // MACD histogram lows
        if (histogramValues[i] < histogramValues[i - 1] && histogramValues[i] < histogramValues[i + 1]) {
            macdLows.push({ index: i, value: histogramValues[i] });
        }

        // MACD histogram highs
        if (histogramValues[i] > histogramValues[i - 1] && histogramValues[i] > histogramValues[i + 1]) {
            macdHighs.push({ index: i, value: histogramValues[i] });
        }
    }

    let status: StrategyResponse['status'] = 'IDLE';
    let reason = '';
    let side: 'LONG' | 'SHORT' = 'LONG';
    let stopLoss = 0;
    let takeProfit = 0;

    // Check for bullish divergence (price lower low, MACD higher low)
    if (priceLows.length >= 2 && macdLows.length >= 2) {
        const recentPriceLow = priceLows[priceLows.length - 1];
        const previousPriceLow = priceLows[priceLows.length - 2];
        const recentMACDLow = macdLows[macdLows.length - 1];
        const previousMACDLow = macdLows[macdLows.length - 2];

        const priceDecline = (recentPriceLow.price - previousPriceLow.price) / previousPriceLow.price;
        const macdIncrease = (recentMACDLow.value - previousMACDLow.value) / Math.abs(previousMACDLow.value);

        if (priceDecline < -minDivergenceStrength && macdIncrease > 0) {
            // Bullish divergence detected
            const divergenceStrength = Math.abs(priceDecline) + macdIncrease;

            if (
                macd.value.histogram !== undefined &&
                macd.value.MACD !== undefined &&
                macd.value.signal !== undefined &&
                macd.value.histogram > 0 &&
                macd.value.MACD > macd.value.signal
            ) {
                status = 'ENTRY';
                side = 'LONG';
                reason = `Bullish Divergence Confirmed: MACD crossed signal (strength: ${(divergenceStrength * 100).toFixed(1)}%)`;

                stopLoss = recentPriceLow.price * 0.97;
                takeProfit = current.close * 1.06; // 6% target
            } else {
                status = 'WATCH';
                reason = `Bullish Divergence Forming: Awaiting MACD cross (strength: ${(divergenceStrength * 100).toFixed(1)}%)`;
            }
        }
    }

    // Check for bearish divergence (price higher high, MACD lower high)
    if (priceHighs.length >= 2 && macdHighs.length >= 2) {
        const recentPriceHigh = priceHighs[priceHighs.length - 1];
        const previousPriceHigh = priceHighs[priceHighs.length - 2];
        const recentMACDHigh = macdHighs[macdHighs.length - 1];
        const previousMACDHigh = macdHighs[macdHighs.length - 2];

        const priceIncrease = (recentPriceHigh.price - previousPriceHigh.price) / previousPriceHigh.price;
        const macdDecline = (recentMACDHigh.value - previousMACDHigh.value) / Math.abs(previousMACDHigh.value);



        if (priceIncrease > minDivergenceStrength && macdDecline < 0) {
            // Bearish divergence detected
            const divergenceStrength = priceIncrease + Math.abs(macdDecline);

            if (
                macd.value.histogram !== undefined &&
                macd.value.MACD !== undefined &&
                macd.value.signal !== undefined &&
                macd.value.histogram < 0 &&
                macd.value.MACD < macd.value.signal
            ) {
                status = 'ENTRY';
                side = 'SHORT';
                reason = `Bearish Divergence Confirmed: MACD crossed signal (strength: ${(divergenceStrength * 100).toFixed(1)}%)`;

                stopLoss = recentPriceHigh.price * 1.03;
                takeProfit = current.close * 0.94; // 6% target
            } else if (status !== 'ENTRY') { // Don't override bullish entry
                status = 'WATCH';
                side = 'SHORT';
                reason = `Bearish Divergence Forming: Awaiting MACD cross (strength: ${(divergenceStrength * 100).toFixed(1)}%)`;
            }
        }
    }

    // Exit signal: MACD approaches zero line (momentum fading)
    // Only trigger on the crossover to avoid marker spam
    const currentHist = histogramValues[histogramValues.length - 1];
    const prevHist = histogramValues[histogramValues.length - 2];

    if (status === 'IDLE' && currentHist !== undefined && prevHist !== undefined) {
        const threshold = 0.01;
        // Check if we just entered the low momentum zone
        if (Math.abs(currentHist) < threshold && Math.abs(prevHist) >= threshold) {
            status = 'EXIT';
            reason = 'MACD momentum faded (histogram crossed near zero)';
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
            macd: macd.value.MACD ?? 0,
            signal: macd.value.signal ?? 0,
            histogram: macd.value.histogram ?? 0,
            side,
            priceLowsCount: priceLows.length,
            macdLowsCount: macdLows.length
        }
    };
}
