import { Candle, StrategyResponse } from '../../types';
import { ActiveZone } from '@/lib/types';
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

    const scanLimit = Math.min(candles.length - 3, 150); // Scan last 150 candles
    const activeZones: ActiveZone[] = [];

    // Scan for FVGs logic
    // We look for 3-candle patterns:
    // Bullish FVG: Candle 1 High < Candle 3 Low (Gap is C1 High to C3 Low)
    // Bearish FVG: Candle 1 Low > Candle 3 High (Gap is C3 High to C1 Low)

    for (let i = candles.length - scanLimit; i < candles.length - 1; i++) {
        // We need i-1, i, i+1 (which is basically looking at a window of 3)
        // Let's use standard indexing where 'i' is the middle candle (the big displacement candle)
        // So pattern involves i-1, i, i+1.

        const c1 = candles[i - 1];
        // const c2 = candles[i]; // The displacement candle
        const c3 = candles[i + 1];

        if (!c1 || !c3) continue;

        // BULLISH FVG
        if (c1.high < c3.low) {
            // Check if already mitigated by subsequent candles?
            // A simple approach: assume active, check later?
            // Only add if reasonable size?
            activeZones.push({
                top: c3.low,
                bottom: c1.high,
                start: c3.time,
                type: 'BULLISH',
                mitigated: false
            });
        }
        // BEARISH FVG
        else if (c1.low > c3.high) {
            activeZones.push({
                top: c1.low,
                bottom: c3.high,
                start: c3.time,
                type: 'BEARISH',
                mitigated: false
            });
        }
    }

    // Check Mitigation
    // For each zone, check if any candle AFTER the start time has filled it.
    for (const zone of activeZones) {
        // Find index of start candle
        // optimization: we are iterating zones which are chronological usually.
        // We only check candles appearing after zone.start

        // Simple mitigation check: 
        // Bullish Zone (Bottom to Top): If Price drops below Bottom (or fills half?) 
        // Strict: If Price < Top? No that's enter. If Price < Bottom (invalidated/filled)

        const startIndex = candles.findIndex(c => c.time === zone.start);
        if (startIndex === -1) continue;

        for (let j = startIndex + 1; j < candles.length; j++) {
            const candle = candles[j];

            if (zone.type === 'BULLISH') {
                // If price dips completely through the zone (Low < Bottom)
                if (candle.low < zone.bottom) {
                    zone.mitigated = true;
                    zone.end = candle.time;
                    break;
                }
            } else { // BEARISH
                // If price rallies completely through the zone (High > Top)
                if (candle.high > zone.top) {
                    zone.mitigated = true;
                    zone.end = candle.time;
                    break;
                }
            }
        }
    }

    // Filter to only return unmitigated (active) zones or maybe last 5?
    // Let's return only unmitigated for the "Active" view, to keep chart clean.
    const unmitigatedZones = activeZones.filter(z => !z.mitigated);


    // --- Original Signal Logic (Keep existing logic for entry triggers) ---
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

    // --- Step 2: FVG Detection (Current Candle Context) ---
    const c1_curr = candles[candles.length - 3];
    const c3_curr = current;
    let fvgSignal: 'BULLISH' | 'BEARISH' | null = null;
    let entryPrice = undefined;

    if (c1_curr && c3_curr) {
        if (c1_curr.high < c3_curr.low) {
            fvgSignal = 'BULLISH';
            if (!sweepSignal) reasonParts.push('Fair Value Gap (Bullish)');
            entryPrice = c3_curr.low;
        } else if (c1_curr.low > c3_curr.high) {
            fvgSignal = 'BEARISH';
            if (!sweepSignal) reasonParts.push('Fair Value Gap (Bearish)');
            entryPrice = c3_curr.high;
        }
    }

    // Decision Logic
    let status: StrategyResponse['status'] = 'IDLE';

    // Combine signals
    if (sweepSignal) {
        status = 'ENTRY'; // Aggressive entry on sweep close validation
    } else if (fvgSignal) {
        status = 'WATCH'; // FVG alone might just be trend continuation, wait for retrace
    }

    if (killzone && status !== 'IDLE') {
        reasonParts.push(`[${killzone} Killzone]`);
    }

    if (status === 'IDLE' && unmitigatedZones.length === 0) { // Keep alive active zones in metadata even if IDLE
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
            side: (sweepSignal === 'BULLISH' || (!sweepSignal && fvgSignal === 'BULLISH')) ? 'LONG' : 'SHORT',
            activeZones: unmitigatedZones
        }
    };
}
