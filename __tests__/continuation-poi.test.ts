
import { strategyContinuationPOI } from '../lib/engine/strategies/continuation-poi';
import { Candle } from '../lib/types';

// Helper to create simple candles (C=val, H=val, L=val, O=val)
// We need enough candles for EMA 200 (200 candles) for trend calculation if not providing MTF
// Or we can provide MTF candles in options.
const createCandles = (values: number[], startOffset = 0): Candle[] => {
    return values.map((v, i) => ({
        time: 1000 * (startOffset + i + 1),
        open: v,
        high: v + 2,
        low: v - 2,
        close: v,
        volume: 1000
    }));
};

describe('Continuation POI Strategy', () => {

    it('should return IDLE if insufficient data', () => {
        const candles = createCandles(Array(50).fill(100));
        const result = strategyContinuationPOI(candles);
        expect(result.status).toBe('IDLE');
        expect(result.reason).toContain('Insufficient data');
    });

    it('should signal ENTRY for Bullish Trend + Unmitigated Bullish FVG + Retracement', () => {
        // 1. Create Bullish Trend Context (HTF)
        // We will pass MTF candles where 4H is clearly bullish (Price > EMA 200)
        // 200 candles of 100, then 50 candles of 150. EMA will be < 150.
        const htfValues = [...Array(200).fill(100), ...Array(50).fill(150)];
        const trendCandles = createCandles(htfValues);

        // 2. Create LTF Pattern (Bullish FVG)
        // We need 200 candles for LTF safety check
        // Pattern: Up Up (Gap) Up ... Retrace
        // Gap: Candle i-2 High < Candle i Low
        const ltfBase = Array(200).fill(150);
        const ltfCandles = createCandles(ltfBase);

        // Inject FVG at the end
        // Index 195: High 152
        // Index 196: Open 155, Low 155, High 160, Close 160 (Gap from 152 to 155)
        // Index 197: Open 160, Low 158, High 165, Close 165
        ltfCandles[195] = { ...ltfCandles[195], high: 152, close: 150, low: 148, open: 150 };
        ltfCandles[196] = { ...ltfCandles[196], high: 160, low: 155, open: 155, close: 160, time: ltfCandles[195].time + 60000 };
        ltfCandles[197] = { ...ltfCandles[197], high: 165, low: 162, open: 160, close: 165, time: ltfCandles[196].time + 60000 };

        // FVG Zone: 152 (Bottom) - 155 (Top). Type: BULLISH.

        // 3. Current Price Retracement into Zone (e.g. Low 153)
        // Index 198: Dip to 153
        ltfCandles.push({
            time: ltfCandles[197].time + 60000,
            open: 165,
            high: 165,
            low: 153, // < 155 (Top), > 152 (Bottom) -> INSIDE ZONE
            close: 160,
            volume: 1000
        });

        const result = strategyContinuationPOI(ltfCandles, {
            multiTimeframeCandles: { '4h': trendCandles }
        });

        expect(result.status).toBe('ENTRY');
        expect(result.metadata?.side).toBe('LONG');
        expect(result.reason).toContain('Bullish POI');
    });

    it('should signal ENTRY for Bearish Trend + Unmitigated Bearish FVG + Retracement', () => {
        // 1. Bearish Trend Context
        // Price < EMA 200
        const htfValues = [...Array(200).fill(200), ...Array(50).fill(100)];
        const trendCandles = createCandles(htfValues);

        // 2. LTF Bearish FVG
        // Gap: Candle i-2 Low > Candle i High
        const ltfBase = Array(200).fill(100);
        const ltfCandles = createCandles(ltfBase);

        // Inject FVG
        // Index 195: Low 148
        // Index 196: Big Drop. High 145. (Gap 148-145)
        ltfCandles[195] = { ...ltfCandles[195], low: 148, high: 152, open: 150, close: 150 };
        ltfCandles[196] = { ...ltfCandles[196], high: 145, low: 140, open: 145, close: 140, time: ltfCandles[195].time + 60000 };
        ltfCandles[197] = { ...ltfCandles[197], high: 138, low: 135, open: 140, close: 135, time: ltfCandles[196].time + 60000 };

        // FVG Zone: 145 (Bottom) - 148 (Top). Type: BEARISH. (Wait, Bearish is Top=Low(i-1), Bottom=High(i+1))
        // Logic check: c1.low > c3.high.
        // c1 (195).low = 148.
        // c3 (197).high = 138.
        // Gap is 138 to 148? 
        // Bearish FVG is Gap between c1.low and c3.high.

        // 3. Current Price Rally into Zone
        ltfCandles.push({
            time: ltfCandles[197].time + 60000,
            open: 135,
            high: 146, // > 138, < 148 -> Inside
            low: 135,
            close: 140,
            volume: 1000
        });

        const result = strategyContinuationPOI(ltfCandles, {
            multiTimeframeCandles: { '4h': trendCandles }
        });

        expect(result.status).toBe('ENTRY');
        expect(result.metadata?.side).toBe('SHORT');
        expect(result.reason).toContain('Bearish POI');
    });

    it('should NOT signal if FVG is mitigated (invalidated)', () => {
        // Bullish Setup
        const htfValues = [...Array(200).fill(100), ...Array(50).fill(150)];
        const trendCandles = createCandles(htfValues);

        const ltfBase = Array(200).fill(150);
        const ltfCandles = createCandles(ltfBase);

        // FVG at 195-197
        ltfCandles[195] = { ...ltfCandles[195], high: 152, close: 150, low: 148, open: 150 };
        ltfCandles[196] = { ...ltfCandles[196], high: 160, low: 155, open: 155, close: 160, time: ltfCandles[195].time + 60000 };
        ltfCandles[197] = { ...ltfCandles[197], high: 165, low: 162, open: 160, close: 165, time: ltfCandles[196].time + 60000 };
        // Zone: 152 - 155

        // MITIGATION Candle: Price crashed through zone
        ltfCandles.push({
            time: ltfCandles[197].time + 60000,
            open: 165,
            high: 165,
            low: 140, // < 150 (Bottom) -> MITIGATED fully
            close: 145,
            volume: 1000
        });

        // Next Candle (Current) comes back up into zone? Should be invalid?
        // Our detection login marks it mitigated.
        // Current candle:
        ltfCandles.push({
            time: ltfCandles[198].time + 60000,
            open: 145,
            high: 154,
            low: 145,
            close: 154,
            volume: 1000
        });

        const result = strategyContinuationPOI(ltfCandles, {
            multiTimeframeCandles: { '4h': trendCandles }
        });

        // Should be IDLE because FVG was mitigated
        expect(result.status).not.toBe('ENTRY');
    });

});
