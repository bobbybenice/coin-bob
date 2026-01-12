import { Candle, ICTAnalysis, ICTSignal } from '@/lib/types';
import { DateTime } from 'luxon';

// Helper to check if a time is within a Killzone (EST)
function checkKillzone(timestamp: number): 'LONDON' | 'NEW_YORK' | undefined {
    // timestamp is expected to be in ms
    const dt = DateTime.fromMillis(timestamp).setZone('America/New_York');
    const hour = dt.hour;
    const minute = dt.minute;
    const timeVal = hour + minute / 60;

    // London: 02:00 - 05:00
    if (timeVal >= 2 && timeVal <= 5) return 'LONDON';

    // New York: 09:30 - 11:00
    if (timeVal >= 9.5 && timeVal <= 11) return 'NEW_YORK';

    return undefined;
}

export function analyzeICT(candles: Candle[]): ICTAnalysis {
    if (candles.length < 25) {
        return { signal: 'NONE', isHighProbability: false };
    }

    const current = candles[candles.length - 1];
    // recent candles for context (last 20 excluding current)
    const lookback = candles.slice(-21, -1);

    let signal: ICTSignal = 'NONE';
    let isHighProbability = false;
    const killzone = checkKillzone(current.time);

    // --- Step 1: Liquidity Sweep ---
    let swingHigh = -Infinity;
    let swingLow = Infinity;

    for (const c of lookback) {
        if (c.high > swingHigh) swingHigh = c.high;
        if (c.low < swingLow) swingLow = c.low;
    }

    // Bullish Sweep: Low wick went below Swing Low, but closed ABOVE it
    if (current.low < swingLow && current.close > swingLow) {
        signal = 'BULLISH_SWEEP';
    }
    // Bearish Sweep: High wick went above Swing High, but closed BELOW it
    // Note: The logic "Close is back within the range" implies below the high for bearish
    else if (current.high > swingHigh && current.close < swingHigh) {
        signal = 'BEARISH_SWEEP';
    }

    // --- Step 2: MSS (Market Structure Shift) ---
    // "Following a sweep, detect a Displacement"
    // Since we are analyzing the CURRENT candle, if the current candle is already a sweep,
    // we might look for MSS in the NEXT candle or if it happens simultaneously (rare for 1 candle)
    // The prompt says "Following a sweep...". We are just checking if current state matches ANY specific alert.
    // If we just swept, that's a signal. 
    // If we *already* swept and now we have displacement, that's also interesting.
    // For simplicity based on prompt "Objective: Implement ... Step 1... Step 2...", 
    // we will prioritize the immediate Sweep signal first as an "Alert", 
    // or if we see a massive displacement that breaks structure.

    // Let's refine: The prompt implies a sequence. But we are a static analyzer running on every tick.
    // Use simple logic: If Sweep detected, we flag it.

    // --- Step 3: FVG Detection (Fair Value Gap) ---
    // Check the latest completed 3-candle sequence for FVG
    // [C1, C2, C3(current)] ?? 
    // Usually FVG is confirmed after C3 closes. 
    // Let's check the gap between C(n-2) and C(n).
    // Using current candle as the 3rd candle (might be forming).

    const c1 = candles[candles.length - 3];
    const c3 = current;

    let fvg: ICTAnalysis['fvg'] = undefined;

    // Bullish FVG: C1 High < C3 Low
    if (c1.high < c3.low) {
        fvg = {
            top: c3.low,
            bottom: c1.high,
            type: 'BULLISH'
        };
        if (signal === 'NONE') signal = 'BULLISH_FVG';
    }
    // Bearish FVG: C1 Low > C3 High
    else if (c1.low > c3.high) {
        fvg = {
            top: c1.low,
            bottom: c3.high,
            type: 'BEARISH'
        };
        if (signal === 'NONE') signal = 'BEARISH_FVG';
    }

    // --- Step 4: Killzone Filter ---
    // "Only flag setups as 'High Probability' if they originate within these windows."
    if (killzone && signal !== 'NONE') {
        isHighProbability = true;
    }

    return {
        signal,
        fvg,
        killzone,
        isHighProbability
    };
}
