import { Candle, StrategyResponse, ActiveZone } from '../../types';
import { calculateRSI } from '../indicators/rsi';
import { calculateMFI } from '../indicators/mfi';
import { detectOrderBlocks } from './ict';

export function strategyConvergenceOB(candles: Candle[]): StrategyResponse {
    if (candles.length < 30) {
        return {
            status: 'IDLE',
            priceLevels: {},
            reason: 'Insufficient Data'
        } as StrategyResponse;
    }

    const current = candles[candles.length - 1];

    // 1. Calculate Indicators
    const rsiResult = calculateRSI(candles, 14);
    const mfiResult = calculateMFI(candles, 14);
    const orderBlocks = detectOrderBlocks(candles);

    const rsiValue = rsiResult.value;
    const mfiValue = mfiResult.value;

    // 2. Identify Active Order Blocks
    // Bullish OB: Price is currently INSIDE or near the OB high/low
    const activeBullishOB = orderBlocks.find(ob =>
        ob.type === 'bullish' &&
        current.close <= ob.high &&
        current.close >= ob.low
    );

    // Bearish OB
    const activeBearishOB = orderBlocks.find(ob =>
        ob.type === 'bearish' &&
        current.close >= ob.low &&
        current.close <= ob.high
    );

    // 3. Logic Conditions

    // Strict Spec: < 20 / > 80. I will prioritize User Request.
    // Spec: "Bullish: RSI(14) < 20"
    const strictBullish = rsiValue < 20 && mfiValue < 20 && !!activeBullishOB;
    const strictBearish = rsiValue > 80 && mfiValue > 80 && !!activeBearishOB;

    // Map OBs to ActiveZone for Visualization
    const activeZones: ActiveZone[] = orderBlocks.map(ob => ({
        top: ob.high,
        bottom: ob.low,
        start: ob.timestamp,
        type: ob.type === 'bullish' ? 'BULLISH' : 'BEARISH',
        mitigated: ob.mitigated
    }));

    if (strictBullish) {
        // Bullish Signal
        return {
            status: 'ENTRY',
            priceLevels: {
                entry: current.close,
                stopLoss: activeBullishOB!.low * 0.995, // 0.5% below OB Low
                takeProfit: current.close + ((current.close - (activeBullishOB!.low * 0.995)) * 2) // 2:1 RR
            },
            reason: `Bullish Convergence: RSI(${rsiValue.toFixed(2)}) & MFI(${mfiValue.toFixed(2)}) + Order Block`,
            metadata: {
                side: 'LONG',
                rsi: rsiValue,
                mfi: mfiValue,
                activeOB: activeBullishOB,
                convergenceOB: true, // Marker for UI
                activeZones: activeZones // visualization
            }
        };
    }

    if (strictBearish) {
        // Bearish Signal
        return {
            status: 'ENTRY',
            priceLevels: {
                entry: current.close,
                stopLoss: activeBearishOB!.high * 1.005, // 0.5% above OB High
                takeProfit: current.close - (((activeBearishOB!.high * 1.005) - current.close) * 2) // 2:1 RR
            },
            reason: `Bearish Convergence: RSI(${rsiValue.toFixed(2)}) & MFI(${mfiValue.toFixed(2)}) + Order Block`,
            metadata: {
                side: 'SHORT',
                rsi: rsiValue,
                mfi: mfiValue,
                activeOB: activeBearishOB,
                convergenceOB: true,
                activeZones: activeZones
            }
        };
    }

    return {
        status: 'IDLE',
        priceLevels: {},
        reason: `RSI: ${rsiValue.toFixed(2)} | MFI: ${mfiValue.toFixed(2)} (No Confluence)`,
        metadata: {
            rsi: rsiValue,
            mfi: mfiValue,
            activeZones: activeZones
        }
    } as StrategyResponse;
}
