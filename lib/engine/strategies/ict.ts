import { Candle, StrategyResponse } from '../types';
import { DateTime } from 'luxon';

// Helper to check if a time is within a Killzone (EST)
function checkKillzone(timestamp: number): 'LONDON' | 'NEW_YORK' | undefined {
    const dt = DateTime.fromMillis(timestamp).setZone('America/New_York');
    const hour = dt.hour;
    const minute = dt.minute;
    const timeVal = hour + minute / 60;

    if (timeVal >= 2 && timeVal <= 5) return 'LONDON';
    if (timeVal >= 9.5 && timeVal <= 11) return 'NEW_YORK';
    return undefined;
}

export function strategyICT(candles: Candle[]): StrategyResponse {
    if (candles.length < 25) {
        return {
            status: 'IDLE',
            priceLevels: {},
            reason: 'Insufficient data'
        };
    }

    const current = candles[candles.length - 1];
    const lookback = candles.slice(-21, -1);

    const killzone = checkKillzone(current.time);
    const reasonParts: string[] = [];

    // --- Step 1: Liquidity Sweep ---
    let swingHigh = -Infinity;
    let swingLow = Infinity;

    for (const c of lookback) {
        if (c.high > swingHigh) swingHigh = c.high;
        if (c.low < swingLow) swingLow = c.low;
    }

    let sweepSignal: 'BULLISH' | 'BEARISH' | null = null;
    let stopLoss = undefined;

    // Bullish Sweep
    if (current.low < swingLow && current.close > swingLow) {
        sweepSignal = 'BULLISH';
        reasonParts.push('Liquidity Sweep (Bullish)');
        stopLoss = current.low;
    }
    // Bearish Sweep
    else if (current.high > swingHigh && current.close < swingHigh) {
        sweepSignal = 'BEARISH';
        reasonParts.push('Liquidity Sweep (Bearish)');
        stopLoss = current.high;
    }

    // --- Step 2: FVG Detection ---
    const c1 = candles[candles.length - 3];
    const c3 = current;
    let fvgSignal: 'BULLISH' | 'BEARISH' | null = null;
    let entryPrice = undefined;

    if (c1.high < c3.low) {
        fvgSignal = 'BULLISH';
        if (!sweepSignal) reasonParts.push('Fair Value Gap (Bullish)');
        entryPrice = c3.low;
    } else if (c1.low > c3.high) {
        fvgSignal = 'BEARISH';
        if (!sweepSignal) reasonParts.push('Fair Value Gap (Bearish)');
        entryPrice = c3.high;
    }

    // Decision Logic
    let status: StrategyResponse['status'] = 'IDLE';

    // Combine signals
    // Ideally we want Sweep + Displacement (FVG)
    // If we have just Sweep, it's a WATCH or early ENTRY
    // If we have just FVG, it's a WATCH or reentry

    if (sweepSignal) {
        status = 'ENTRY'; // Aggressive entry on sweep close validation
    } else if (fvgSignal) {
        status = 'WATCH'; // FVG alone might just be trend continuation, wait for retrace
    }

    if (killzone && status !== 'IDLE') {
        reasonParts.push(`[${killzone} Killzone]`);
    }

    if (status === 'IDLE') {
        return {
            status: 'IDLE',
            priceLevels: {},
            reason: ''
        };
    }

    return {
        status,
        priceLevels: {
            entry: entryPrice || current.close,
            stopLoss: stopLoss,
        },
        reason: reasonParts.join(', '),
        metadata: {
            killzone,
            isHighProbability: !!killzone, // Simplified high prob check
            sweep: sweepSignal,
            fvg: fvgSignal,
            side: (sweepSignal === 'BULLISH' || (!sweepSignal && fvgSignal === 'BULLISH')) ? 'LONG' : 'SHORT'
        }
    };
}
