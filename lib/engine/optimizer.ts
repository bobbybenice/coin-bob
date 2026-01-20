import { Candle, BacktestResult } from './types';
import { runBacktest } from './backtester';
import { strategyRSIMFI, RSIMFIOptions } from './strategies/rsi-mfi-confluence';

export interface OptimizationResult {
    params: RSIMFIOptions;
    result: BacktestResult;
    score: number; // Weighted score (ROI + WinRate)
}

export async function optimizeStrategy(candles: Candle[]): Promise<OptimizationResult[]> {
    // Parameter Ranges to Test
    // Limiting to a reasonable set to avoid freezing the UI (Main Thread)
    // 3 * 3 * 3 = 27 combinations. 27 * ~30ms = ~800ms. Acceptable.
    const rsiPeriods = [9, 14, 21];
    const oversoldLevels = [20, 25, 30];
    // We assume Overbought is symmetric (100 - Oversold) for simplicity in this iteration
    // Or we can test it: [70, 75, 80]
    const overboughtLevels = [70, 75, 80];
    const exitModes = [true, false]; // Soft Exit vs Hard Exit

    const results: OptimizationResult[] = [];

    // Brute Force Iteration
    for (const period of rsiPeriods) {
        for (const oversold of oversoldLevels) {
            for (const overbought of overboughtLevels) {
                for (const enableSoftExit of exitModes) {

                    const params: RSIMFIOptions = {
                        rsiPeriod: period,
                        mfiPeriod: period, // Sync MFI period for now
                        oversold,
                        overbought
                    };

                    // Create Wrapper Strategy
                    const strategy = (c: Candle[]) => strategyRSIMFI(c, params);

                    // Run Simulation
                    const result = runBacktest(strategy, candles, {
                        initialBalance: 10000,
                        stopLossPercent: 2,
                        riskRewardRatio: 2,
                        enableSoftExits: enableSoftExit
                    });

                    // Calculate Score (Adjusted for Statistical Significance)
                    const roiPercent = (result.pnl / 10000) * 100;

                    // Filter: Discard statistically insignificant results
                    if (result.totalTrades < 3) {
                        continue;
                    }

                    // Weighted Score: 
                    // 1. ROI is KING (Weighted 10x). We want profit, not just high win rates.
                    // 2. WinRate is secondary (Weighted 0.25x).
                    // 3. Trade Frequency is tertiary (confidence boost).
                    const score = (roiPercent * 10) + (result.winRate * 0.25) + (Math.log(result.totalTrades) * 2);

                    results.push({
                        params,
                        result,
                        score
                    });

                    // Yield to event loop
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        }
    }

    // Sort by Score Descending
    return results.sort((a, b) => b.score - a.score);
}
