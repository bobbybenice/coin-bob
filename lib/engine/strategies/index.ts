import { Candle, StrategyResponse, StrategyName } from '../../types';
import { strategyRSIMFI } from './rsi-mfi-confluence';
import { strategyBollingerBounce } from './bollinger-bounce';
import { strategyMACDDivergence } from './macd-divergence';
import { strategyEMACrossover } from './ema-crossover';
import { strategyVolumeBreakout } from './volume-breakout';
import { strategySupportResistance } from './support-resistance';
import { strategyGolden } from './golden-strategy';
import { strategyICT } from './ict';
import { strategyConvergenceOB } from './convergenceOB';
import { strategyContinuationPOI } from './continuation-poi';

export interface StrategyConfig {
    name: StrategyName;
    displayName: string;
    description: string;
    longDescription?: string; // Detailed explanation for the info tooltip
    // Relaxed type to allow strategies with specific options + generic MTF options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute: (candles: Candle[], options?: any) => StrategyResponse;
    defaultOptions?: Record<string, unknown>;
}

/**
 * Strategy Registry
 * All available trading strategies with their configurations
 */
export const STRATEGIES: Record<StrategyName, StrategyConfig> = {
    RSI_MFI: {
        name: 'RSI_MFI',
        displayName: 'RSI/MFI Confluence',
        description: 'Oversold/overbought detection using RSI and MFI confluence',
        longDescription: 'Identifying potential reversals when both RSI and MFI are in extreme territories (Oversold < 30, Overbought > 70). Confluence increases probability.',
        execute: strategyRSIMFI,
        defaultOptions: {
            rsiPeriod: 14,
            mfiPeriod: 14,
            oversold: 30,
            overbought: 70
        }
    },
    BOLLINGER_BOUNCE: {
        name: 'BOLLINGER_BOUNCE',
        displayName: 'Bollinger Bounce',
        description: 'Mean reversion strategy using Bollinger Bands + RSI confirmation',
        longDescription: 'Entries taken when price touches outer Bollinger Bands while RSI confirms momentum exhaustion. Targets reversion to the mean (Middle Band).',
        execute: strategyBollingerBounce,
        defaultOptions: {
            bbPeriod: 20,
            bbStdDev: 2,
            rsiPeriod: 14,
            rsiOversold: 30,
            rsiOverbought: 70
        }
    },
    MACD_DIVERGENCE: {
        name: 'MACD_DIVERGENCE',
        displayName: 'MACD Divergence',
        description: 'Detects bullish/bearish divergence between price and MACD',
        longDescription: 'Signals when price makes a new High/Low but MACD fails to confirm (Lower High/Higher Low). Strong reversal signal indicating momentum loss.',
        execute: strategyMACDDivergence,
        defaultOptions: {
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            lookbackPeriod: 20,
            minDivergenceStrength: 0.02
        }
    },
    EMA_CROSSOVER: {
        name: 'EMA_CROSSOVER',
        displayName: 'EMA Crossover',
        description: 'Golden cross (EMA50>EMA200) and death cross trend signals',
        longDescription: 'Classic trend following. Golden Cross (50 > 200) for Bullish, Death Cross (50 < 200) for Bearish. Best for capturing major trend shifts.',
        execute: strategyEMACrossover,
        defaultOptions: {
            fastPeriod: 50,
            slowPeriod: 200,
            confirmationCandles: 2
        }
    },
    VOLUME_BREAKOUT: {
        name: 'VOLUME_BREAKOUT',
        displayName: 'Volume Breakout',
        description: 'Volume spike (3x avg) combined with price breakouts',
        longDescription: 'Identifies strong moves backed by institutional volume (3x Average). Validates breakouts and filters fake-outs.',
        execute: strategyVolumeBreakout,
        defaultOptions: {
            volumeMultiplier: 3,
            lookbackPeriod: 20,
            priceBreakoutThreshold: 0.01
        }
    },
    SUPPORT_RESISTANCE: {
        name: 'SUPPORT_RESISTANCE',
        displayName: 'Support/Resistance',
        description: 'S/R level identification and breakout/breakdown detection',
        longDescription: 'Automatically plots key Pivot Points. Signals on confirmed Breakouts or Breakdowns of S/R levels with volume confirmation.',
        execute: strategySupportResistance,
        defaultOptions: {
            pivotLookback: 20,
            breakoutConfirmation: 2,
            levelTolerance: 0.005,
            minTouches: 2
        }


    },
    GOLDEN_STRATEGY: {
        name: 'GOLDEN_STRATEGY',
        displayName: 'Golden Strategy (Trend Pullback)',
        description: 'High-probability trend pullback system (EMA + BB + ATR)',
        longDescription: 'Multi-factor trend system. Requires: 1. Trend Alignment (EMA), 2. Pullback (Bollinger Band), 3. Volatility (ATR), 4. Momentum (RSI/ADX).',
        execute: strategyGolden,
        defaultOptions: {
            trendEmaPeriod: 200,
            fastEmaPeriod: 50,
            bbPeriod: 20,
            bbStdDev: 2,
            rsiPeriod: 14,
            rsiOversold: 40,
            rsiOverbought: 60,
            atrPeriod: 14,
            adxPeriod: 14,
            minAdx: 25,
            riskRewardRatio: 2
        }
    },
    ICT: {
        name: 'ICT',
        displayName: 'ICT / SMC (Smart Money)',
        description: 'Gap detection (FVG) and Liquidity Sweep logic',
        longDescription: 'Smart Money Concepts. Detects Fair Value Gaps (FVG) and Liquidity Sweeps. Visualizes institutional footrpints on the chart.',
        execute: strategyICT,
        defaultOptions: {}
    },
    CONVERGENCE_OB: {
        name: 'CONVERGENCE_OB',
        displayName: 'Convergence-OB',
        description: 'High-probability reversal: RSI/MFI Extremes + Order Block',
        longDescription: 'Reversal Sniper. Enters when RSI & MFI are BOTH oversold/overbought AND price reacts at a valid Order Block. High precision.',
        execute: strategyConvergenceOB,
        defaultOptions: {
            rsiOversold: 20,
            mfiOversold: 20,
            rsiOverbought: 80,
            mfiOverbought: 80
        }
    },
    CONTINUATION_POI: {
        name: 'CONTINUATION_POI',
        displayName: 'Continuation POI (MTF)',
        description: 'Trend-following entries at unmitigated FVGs using MTF Trend',
        longDescription: 'Trend Continuation. 1. Identifies HTF Trend (EMA 200). 2. Waits for Pullback into unmitigated Fair Value Gap aligned with trend. 3. Enters on reaction.',
        execute: strategyContinuationPOI,
        defaultOptions: {}
    }
};

/**
 * Get all available strategy names
 */
export function getAllStrategyNames(): StrategyName[] {
    return Object.keys(STRATEGIES) as StrategyName[];
}

/**
 * Get strategy configuration by name
 */
export function getStrategy(name: StrategyName): StrategyConfig | undefined {
    return STRATEGIES[name];
}

/**
 * Execute a strategy by name
 */
export function executeStrategy(
    name: StrategyName,
    candles: Candle[],
    options?: Record<string, unknown> & { multiTimeframeCandles?: Record<string, Candle[]> }
): StrategyResponse {
    const strategy = STRATEGIES[name];
    if (!strategy) {
        return {
            status: 'IDLE',
            priceLevels: {},
            reason: `Strategy '${name}' not found`
        };
    }

    const mergedOptions = {
        ...strategy.defaultOptions,
        ...options
    };

    return strategy.execute(candles, mergedOptions);
}

// Re-export strategy functions for direct usage
export {
    strategyRSIMFI,
    strategyBollingerBounce,
    strategyMACDDivergence,
    strategyEMACrossover,
    strategyVolumeBreakout,
    strategySupportResistance,
    strategyGolden,
    strategyICT,
    strategyConvergenceOB,
    strategyContinuationPOI
};
