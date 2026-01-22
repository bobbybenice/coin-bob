import { Candle, StrategyResponse, StrategyName } from '../../types';
import { strategyRSIMFI } from './rsi-mfi-confluence';
import { strategyBollingerBounce } from './bollinger-bounce';
import { strategyMACDDivergence } from './macd-divergence';
import { strategyEMACrossover } from './ema-crossover';
import { strategyVolumeBreakout } from './volume-breakout';
import { strategySupportResistance } from './support-resistance';
import { strategyGolden } from './golden-strategy';
import { strategyICT } from './ict';




export interface StrategyConfig {
    name: StrategyName;
    displayName: string;
    description: string;
    execute: (candles: Candle[], options?: Record<string, unknown>) => StrategyResponse;
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
        execute: strategyICT,
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
    options?: Record<string, unknown>
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
    strategyICT
};
