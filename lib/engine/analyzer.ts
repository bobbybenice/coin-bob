import { calculateRSI } from './indicators/rsi';
import { calculateEMA } from './indicators/ema';
import { calculateMACD } from './indicators/macd';
import { calculateBollingerBands } from './indicators/bollinger';
import { Candle, StrategyResponse, StrategyName, IndicatorResult } from '../types';
import { executeStrategy, getAllStrategyNames } from './strategies';

export interface TechnicalAnalysis {
    indicators: {
        rsi: IndicatorResult;
        ema20: IndicatorResult;
        ema50: IndicatorResult;
        ema200: IndicatorResult;
        macd: IndicatorResult<{ MACD?: number; signal?: number; histogram?: number }>;
        bb: IndicatorResult<{ middle: number; upper: number; lower: number; pb: number }>;
    };
    strategies: Partial<Record<StrategyName, StrategyResponse>>;
    trigger: boolean;
}




export function analyzeAsset(candles: Candle[]): TechnicalAnalysis {
    // 1. Basic Indicators
    const rsi = calculateRSI(candles, 14);
    const ema20 = calculateEMA(candles, 20);
    const ema50 = calculateEMA(candles, 50);
    const ema200 = calculateEMA(candles, 200);
    const macd = calculateMACD(candles, 12, 26, 9);
    const bb = calculateBollingerBands(candles, 20, 2);

    console.log(`[Analyzer] Running for asset. Candles: ${candles.length}`);

    // 2. Execute Strategies
    const strategyResults: Partial<Record<StrategyName, StrategyResponse>> = {};
    const strategies = getAllStrategyNames();

    let activeEntries = 0;

    strategies.forEach(name => {
        const result = executeStrategy(name, candles);
        strategyResults[name] = result;

        if (result.status === 'ENTRY') {
            activeEntries++;
        }
    });

    // 3. Trigger
    const hasTrigger = activeEntries > 0;

    return {
        indicators: {
            rsi,
            ema20,
            ema50,
            ema200,
            macd,
            bb
        },
        strategies: strategyResults,
        trigger: hasTrigger
    };
}
