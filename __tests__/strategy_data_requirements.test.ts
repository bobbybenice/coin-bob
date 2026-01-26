
import { strategyGolden } from '../lib/engine/strategies/golden-strategy';
import { strategyEMACrossover } from '../lib/engine/strategies/ema-crossover';
import { strategyBollingerBounce } from '../lib/engine/strategies/bollinger-bounce';
import { strategyMACDDivergence } from '../lib/engine/strategies/macd-divergence';
import { Candle } from '../lib/types';

// Strategies to check
const strategies = [
    { name: 'Golden Cross', fn: strategyGolden, options: {} },
    { name: 'EMA Crossover', fn: strategyEMACrossover, options: {} },
    { name: 'Bollinger Bounce', fn: strategyBollingerBounce, options: {} },
    { name: 'MACD Divergence', fn: strategyMACDDivergence, options: {} },
];

describe('Strategy Data Requirements (Anti-Regression)', () => {
    // Defines the contract: The App Data Layer MUST provide at least 500 candles
    // This test ensures no strategy requires MORE than what we provide.
    const APP_DATA_LIMIT = 500;

    it('should operate within the application data limits', () => {
        // Create a dummy candle array of size APP_DATA_LIMIT
        // Values don't matter for this check, only length logic usually, 
        // but let's provide valid generic data to avoid NaN errors during internal calls
        const candles: Candle[] = Array.from({ length: APP_DATA_LIMIT }, (_, i) => ({
            time: Date.now() + i * 60000,
            open: 100,
            high: 105,
            low: 95,
            close: 100,
            volume: 1000
        }));

        strategies.forEach(strategy => {
            const result = strategy.fn(candles, strategy.options);

            // If the strategy returns "Insufficient Data" even with our Max Limit, 
            // then our Limit is too low or the strategy is too demanding.
            if (result.reason === 'Insufficient Data') {
                throw new Error(
                    `CRITICAL CONFIGURATION ERROR: Strategy '${strategy.name}' requires more data than the Application Limit (${APP_DATA_LIMIT}). ` +
                    `Either increase fetch limits in 'lib/binance.ts' or optimize the strategy.`
                );
            }
        });
    });

    it('should fail gracefully if data is genuinely low (e.g. new listing)', () => {
        const tinyHistory: Candle[] = Array.from({ length: 50 }, (_, i) => ({
            time: Date.now() + i, open: 1, high: 2, low: 0, close: 1, volume: 1
        }));

        const result = strategyGolden(tinyHistory);
        expect(result.reason).toBe('Insufficient Data');
    });
});
