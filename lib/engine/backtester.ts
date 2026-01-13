import { Candle, StrategyFunction, BacktestResult, TradeRecord } from './types';

export function runBacktest(
    strategy: StrategyFunction,
    candles: Candle[],
    initialBalance: number = 10000
): BacktestResult {
    // Skeleton implementation
    // 1. Need enough data for strategy warmup (e.g. 50 candles)
    const warmupPeriod = 50;

    const trades: TradeRecord[] = [];
    let currentPosition: {
        entryPrice: number;
        side: 'LONG' | 'SHORT';
        time: number;
        stopLoss?: number;
        takeProfit?: number;
    } | null = null;

    let balance = initialBalance;

    for (let i = warmupPeriod; i < candles.length; i++) {
        const slice = candles.slice(0, i + 1);
        const currentCandle = candles[i];

        // Run strategy on historical slice
        const result = strategy(slice);

        // Execution Logic
        if (currentPosition) {
            // 1. Check for Stop Loss or Take Profit hits
            // For a LONG position:
            // - SL hit if Low <= SL
            // - TP hit if High >= TP
            // We assume worst case: SL happens before TP if both in same candle (pessimistic)

            let exitPrice = null;

            if (currentPosition.side === 'LONG') {
                if (currentPosition.stopLoss && currentCandle.low <= currentPosition.stopLoss) {
                    exitPrice = currentPosition.stopLoss;
                } else if (currentPosition.takeProfit && currentCandle.high >= currentPosition.takeProfit) {
                    exitPrice = currentPosition.takeProfit;
                }
            } else {
                // SHORT Position
                if (currentPosition.stopLoss && currentCandle.high >= currentPosition.stopLoss) {
                    exitPrice = currentPosition.stopLoss;
                } else if (currentPosition.takeProfit && currentCandle.low <= currentPosition.takeProfit) {
                    exitPrice = currentPosition.takeProfit;
                }
            }

            // Signal Exit (Independent of side, usually)
            if (!exitPrice && result.status === 'EXIT') {
                exitPrice = currentCandle.close;
            }

            if (exitPrice) {
                // Fixed Position Size of $1,000 USD per trade
                const tradeAmount = 1000;
                const positionSize = tradeAmount / currentPosition.entryPrice;

                const pnl = currentPosition.side === 'LONG'
                    ? (exitPrice - currentPosition.entryPrice) * positionSize
                    : (currentPosition.entryPrice - exitPrice) * positionSize;

                balance += pnl;

                trades.push({
                    entryTime: currentPosition.time,
                    exitTime: currentCandle.time,
                    entryPrice: currentPosition.entryPrice,
                    exitPrice,
                    pnl,
                    pnlPercent: (pnl / tradeAmount) * 100,
                    side: currentPosition.side
                });
                currentPosition = null;
            }
        } else {
            // Entry Logic
            if (result.status === 'ENTRY') {
                const side = (result.metadata?.side as 'LONG' | 'SHORT') || 'LONG';
                const entryPrice = currentCandle.close;

                let stopLoss = result.priceLevels.stopLoss;
                let takeProfit = result.priceLevels.takeProfit;

                // Default SL/TP Calculation
                if (side === 'LONG') {
                    if (!stopLoss) stopLoss = entryPrice * 0.98; // 2% SL
                    if (!takeProfit) {
                        const risk = entryPrice - stopLoss;
                        takeProfit = entryPrice + (risk * 2); // 2R
                    }
                } else {
                    if (!stopLoss) stopLoss = entryPrice * 1.02; // 2% SL
                    if (!takeProfit) {
                        const risk = stopLoss - entryPrice;
                        takeProfit = entryPrice - (risk * 2); // 2R
                    }
                }

                currentPosition = {
                    entryPrice,
                    side,
                    time: currentCandle.time,
                    stopLoss,
                    takeProfit
                };
            }
        }
    }

    // Force close any open position at the end
    if (currentPosition) {
        const lastCandle = candles[candles.length - 1];
        const exitPrice = lastCandle.close;
        const tradeAmount = 1000;
        const positionSize = tradeAmount / currentPosition.entryPrice;

        const pnl = currentPosition.side === 'LONG'
            ? (exitPrice - currentPosition.entryPrice) * positionSize
            : (currentPosition.entryPrice - exitPrice) * positionSize;

        balance += pnl;

        trades.push({
            entryTime: currentPosition.time,
            exitTime: lastCandle.time,
            entryPrice: currentPosition.entryPrice,
            exitPrice,
            pnl,
            pnlPercent: (pnl / tradeAmount) * 100,
            side: currentPosition.side
        });
    }

    const wins = trades.filter(t => t.pnl > 0).length;

    return {
        totalTrades: trades.length,
        winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
        pnl: balance - initialBalance, // Simplified, actual logic would update balance
        trades
    };
}
