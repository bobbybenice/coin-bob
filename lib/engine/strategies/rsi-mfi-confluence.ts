import { Candle, StrategyResponse } from '../../types';
import { calculateRSI } from '../indicators/rsi';
import { calculateMFI } from '../indicators/mfi';

export interface RSIMFIOptions {
    rsiPeriod?: number;
    mfiPeriod?: number;
    oversold?: number;
    overbought?: number;
}

export function strategyRSIMFI(candles: Candle[], options: RSIMFIOptions = {}): StrategyResponse {
    const {
        rsiPeriod = 14,
        mfiPeriod = 14,
        oversold = 30,
        overbought = 70
    } = options;

    const rsi = calculateRSI(candles, rsiPeriod);
    const mfi = calculateMFI(candles, mfiPeriod);

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

    let status: StrategyResponse['status'] = 'IDLE';
    const entryPrice = current.close;
    let stopLoss = 0;
    let takeProfit = 0;
    let reason = '';

    const isOversold = rsi.value < oversold && mfi.value < oversold;
    const isOverbought = rsi.value > overbought && mfi.value > overbought;

    if (isOversold) {
        status = 'ENTRY'; // Implicitly LONG based on logic below
        reason = `Oversold Confluence: RSI ${rsi.value.toFixed(2)} & MFI ${mfi.value.toFixed(2)}`;

        stopLoss = current.close * 0.97; // 3% SL
        takeProfit = current.close * 1.06; // 6% TP
    } else if (isOverbought) {
        status = 'ENTRY';
        // We will mark side as SHORT in metadata
        reason = `Overbought Confluence: RSI ${rsi.value.toFixed(2)} & MFI ${mfi.value.toFixed(2)}`;

        stopLoss = current.close * 1.03; // 3% SL
        takeProfit = current.close * 0.94; // 6% TP
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
