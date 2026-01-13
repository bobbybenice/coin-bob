import { Candle, StrategyResponse } from '../types';
import { calculateRSI } from '../indicators/rsi';
import { calculateMFI } from '../indicators/mfi';

export function strategyRSIMFI(candles: Candle[]): StrategyResponse {
    const rsi = calculateRSI(candles, 14);
    const mfi = calculateMFI(candles, 14);

    // Check if we have enough data
    if (!rsi.value || !mfi.value) {
        return {
            status: 'IDLE',
            priceLevels: {},
            reason: 'Insufficient Data'
        };
    }

    // Current State
    const current = candles[candles.length - 1];

    // Strategy Logic: Mean Reversion Confluence
    // ENTRY LONG: RSI < 30 AND MFI < 30 (Oversold confluence)
    // EXIT LONG: RSI > 50 (Mean reversion complete) or stop loss
    // ENTRY SHORT: RSI > 70 AND MFI > 70 (Overbought confluence)
    // EXIT SHORT: RSI < 50 (Mean reversion complete) or stop loss

    let status: StrategyResponse['status'] = 'IDLE';
    let entryPrice = current.close;
    let stopLoss = 0;
    let takeProfit = 0; // We will use RSI mean reversion as primary exit, but provide levels for safety.
    let reason = '';

    const isOversold = rsi.value < 30 && mfi.value < 30;
    const isOverbought = rsi.value > 70 && mfi.value > 70;

    // Check for Exits first (if we were implementing a stateful runner, but here we just return current signal)
    // The backtester will handle the "holding" logic and look for EXIT signals.
    // However, our StrategyResponse type is a bit stateless "What to do NOW".
    // If we are backtesting, the backtester calls this for every candle.
    // So if we are currently LONG (handled by backtester), we need to know if we should EXIT.
    // The current Backtester logic looks for `status === 'EXIT'` to close positions.
    // But `strategyICT` (our reference) returns ENTRY or WATCH.
    // We need to define how "Exit" is communicated. 
    // The `StrategyResponse` has an `EXIT` status.
    // We should return `EXIT` if the conditions for exiting a theoretical position are met.
    // BUT, we don't know the current position direction in a stateless function...
    // Only the backtester knows if we are Long or Short.
    // Standard approach for this stateless engine:
    // Return ENTRY signals. The Backtester (or user) manages the trade.
    // We can also return "EXIT_LONG" or "EXIT_SHORT" if we enhance the type, 
    // but for now let's assume the Backtester handles simple TP/SL exits OR we provide a generic EXIT signal.

    // Actually, looking at `backtester.ts`:
    // } else if (result.status === 'EXIT') {
    //     exitPrice = currentCandle.close;
    //     exitReason = 'SIGNAL';
    // }

    // So if the strategy returns EXIT, the backtester closes ANY open position.
    // This is a limitation if we have conflicting logical exits (e.g. Exit Long vs Exit Short conditions).
    // For this specific Mean Reversion:
    // If RSI crosses 50, that's a "neutral" point.
    // Ideally we'd say "If Long and RSI > 50 -> Exit".
    // Since we don't know "If Long", we can just return what the current MARKET STATE dictates.
    // If Market is Neutral (RSI ~ 50), maybe that's an EXIT signal for *any* extreme position?
    // Let's stick to the User Request: "Help me calculate a logical exit strategy".
    // I will propose 2R take profit and 1R stop loss as "hard" exits in the `priceLevels`.
    // And for `status`, I will return ENTRY when conditions match.
    // If I return EXIT whenever RSI is 50, it might be spammy.
    // Let's implement the ENTRY logic cleanly, and provide Safe TP/SL levels.
    // TP = Mean Reversion target? No, hard to predict price. 
    // Let's use ATR-based or Percentage based. 
    // Let's use 3% SL and 6% TP as a baseline for this volatility strategy.

    if (isOversold) {
        status = 'ENTRY'; // Implicitly LONG based on logic below
        // We need to indicate direction.
        // `StrategyResponse` doesn't strictly have "side", 
        // but backtester infers LONG if `status === 'ENTRY'`.
        // We need to fix backtester to handle SHORTs or add `side` to response.
        // `StrategyResponse` has custom metadata. We can put side there.
        reason = `Oversold Confluence: RSI ${rsi.value.toFixed(2)} & MFI ${mfi.value.toFixed(2)}`;

        stopLoss = current.close * 0.97; // 3% SL
        takeProfit = current.close * 1.06; // 6% TP
    } else if (isOverbought) {
        status = 'ENTRY';
        // We will mark side as SHORT in metadata
        reason = `Overbought Confluence: RSI ${rsi.value.toFixed(2)} & MFI ${mfi.value.toFixed(2)}`;

        stopLoss = current.close * 1.03; // 3% SL
        takeProfit = current.close * 0.94; // 6% TP
    } else if (rsi.value > 45 && rsi.value < 55) {
        // Soft Exit: Mean Reversion
        // If we holds a position, this signals momentum has neutralized.
        status = 'EXIT';
        reason = `Mean Reversion Target Met (RSI ${rsi.value.toFixed(2)})`;
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
            rsi: rsi.value,
            mfi: mfi.value,
            side: isOverbought ? 'SHORT' : 'LONG'
        }
    };
}
