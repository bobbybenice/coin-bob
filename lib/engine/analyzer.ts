import { calculateRSI } from './indicators/rsi';
import { calculateEMA } from './indicators/ema';
import { calculateMACD } from './indicators/macd';
import { calculateBollingerBands } from './indicators/bollinger';
import { Candle, StrategyResponse, StrategyName, IndicatorResult, ScoreComponent } from '../types';
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
    score: number; // calculated BobScore
    scoreBreakdown: ScoreComponent[];
    trigger: boolean;
}

const STRATEGY_WEIGHTS: Record<string, number> = {
    'ICT': 20,
    'GOLDEN_STRATEGY': 20,
    'MACD_DIVERGENCE': 15,
    'BOLLINGER_BOUNCE': 15,
    'RSI_MFI': 10,
    'EMA_CROSSOVER': 10,
    'VOLUME_BREAKOUT': 10,
    'SUPPORT_RESISTANCE': 10
};

export function analyzeAsset(candles: Candle[], change24h?: number): TechnicalAnalysis {
    // 1. Basic Indicators
    const rsi = calculateRSI(candles, 14);
    const ema20 = calculateEMA(candles, 20);
    const ema50 = calculateEMA(candles, 50);
    const ema200 = calculateEMA(candles, 200);
    const macd = calculateMACD(candles, 12, 26, 9);
    const bb = calculateBollingerBands(candles, 20, 2);

    const breakdown: ScoreComponent[] = [];
    console.log(`[Analyzer] Running for asset. Candles: ${candles.length}`);

    // 2. Score Calculation (Base 50)
    let score = 50;

    // Momentum Boost from 24h Change
    if (change24h !== undefined && change24h > 5) {
        score += 10;
        breakdown.push({
            label: 'Strong Momentum',
            value: 10,
            category: 'TREND',
            description: `24H Change is +${change24h.toFixed(2)}%, indicating strong daily momentum.`
        });
    }

    const currentPrice = candles[candles.length - 1]?.close || 0;

    // Trend Context (+/- 15)
    if (ema200.value) {
        if (currentPrice > ema200.value) {
            score += 15;
            breakdown.push({
                label: 'Trend Alignment',
                value: 15,
                category: 'TREND',
                description: `Price ($${currentPrice.toFixed(2)}) is ABOVE EMA200 ($${ema200.value.toFixed(2)}), confirming a Long-Term Bullish Trend.`
            });
        } else {
            score -= 15;
            breakdown.push({
                label: 'Trend Alignment',
                value: -15,
                category: 'TREND',
                description: `Price ($${currentPrice.toFixed(2)}) is BELOW EMA200 ($${ema200.value.toFixed(2)}), confirming a Long-Term Bearish Trend.`
            });
        }
    }

    if (ema50.value && ema200.value) {
        if (ema50.value > ema200.value) {
            score += 5;
            breakdown.push({
                label: 'Golden Cross',
                value: 5,
                category: 'TREND',
                description: `EMA50 ($${ema50.value.toFixed(2)}) is ABOVE EMA200, signalling bullish momentum.`
            });
        } else if (ema50.value < ema200.value) {
            score -= 5;
            breakdown.push({
                label: 'Death Cross',
                value: -5,
                category: 'TREND',
                description: `EMA50 ($${ema50.value.toFixed(2)}) is BELOW EMA200, signalling bearish momentum.`
            });
        }
    }

    // 3. Execute Strategies and Weight
    const strategyResults: Partial<Record<StrategyName, StrategyResponse>> = {};
    const strategies = getAllStrategyNames();

    let activeEntries = 0;

    strategies.forEach(name => {
        const result = executeStrategy(name, candles);
        strategyResults[name] = result;

        if (result.status === 'ENTRY') {
            activeEntries++;
            const weight = STRATEGY_WEIGHTS[name] || 10;

            // Check direction
            const isLong = result.metadata?.side === 'LONG' ||
                result.metadata?.sweep === 'BULLISH' ||
                result.metadata?.fvg === 'BULLISH';

            if (isLong) {
                score += weight;
                breakdown.push({
                    label: name,
                    value: weight,
                    category: 'STRATEGY',
                    description: `Strategy detected a BULLISH signal: ${result.reason}`
                });
            } else {
                score -= weight;
                breakdown.push({
                    label: name,
                    value: -weight,
                    category: 'STRATEGY',
                    description: `Strategy detected a BEARISH signal: ${result.reason}`
                });
            }
        }
    });

    // 4. Trend Alignment Cap / Safety Logic
    const isBearishTrend = ema200.value && currentPrice < ema200.value;
    const isBullishTrend = ema200.value && currentPrice > ema200.value;

    if (score > 70 && isBearishTrend) {
        const cap = 65;
        if (score > cap) {
            breakdown.push({
                label: 'Trend Cap',
                value: cap - score,
                category: 'TREND',
                description: `Score capped at ${cap} because major trend is Bearish (No Strong Longs).`
            });
            score = cap;
        }
    }

    if (score < 30 && isBullishTrend) {
        const floor = 35;
        if (score < floor) {
            breakdown.push({
                label: 'Trend Floor',
                value: floor - score,
                category: 'TREND',
                description: `Score floored at ${floor} because major trend is Bullish (No Strong Shorts).`
            });
            score = floor;
        }
    }

    // Clamp score 0-100
    score = Math.min(100, Math.max(0, score));

    // 5. Trigger
    const hasTrigger = activeEntries > 0;

    // DEBUG AUDIT: If score changed but no breakdown, report it
    if (score !== 50 && breakdown.length === 0) {
        breakdown.push({
            label: 'Debug: Unaccounted Score',
            value: score - 50,
            category: 'TREND',
            description: `Score mismatch detected. Base 50, Current ${score}. Difference not tracked.`
        });
    }

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
        score,
        scoreBreakdown: breakdown,
        trigger: hasTrigger
    };
}
