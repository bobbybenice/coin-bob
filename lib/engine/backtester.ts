import { Candle, StrategyFunction, BacktestResult, TradeRecord } from '../types';

export interface BacktestOptions {
    initialBalance: number;
    stopLossPercent: number; // e.g. 2.0 = 2%
    riskRewardRatio: number; // e.g. 2.0 = 1:2

}

export function runBacktest(
    strategy: StrategyFunction,
    candles: Candle[],
    options: BacktestOptions = {
        initialBalance: 10000,
        stopLossPercent: 2,
        riskRewardRatio: 2,

    }
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

    let balance = options.initialBalance;

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
            // A "Soft Exit" is when the strategy itself signals an exit (e.g. indicator reversal)
            // regardless of whether SL or TP has been hit.


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



                let stopLoss = 0;
                let takeProfit = 0;

                // Priority: User Options > Strategy Levels
                // Since this is a "Backtester" allowing user tweaks, we use the user's SL/TP settings.

                if (side === 'LONG') {
                    // Long: SL below entry, TP above
                    stopLoss = entryPrice * (1 - options.stopLossPercent / 100);
                    const risk = entryPrice - stopLoss;
                    takeProfit = entryPrice + (risk * options.riskRewardRatio);
                } else {
                    // Short: SL above entry, TP below
                    stopLoss = entryPrice * (1 + options.stopLossPercent / 100);
                    const risk = stopLoss - entryPrice;
                    takeProfit = entryPrice - (risk * options.riskRewardRatio);
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
        pnl: balance - options.initialBalance,
        trades
    };
}
