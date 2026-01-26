
import { calculateRSI } from '../lib/engine/indicators/rsi';
import { calculateMFI } from '../lib/engine/indicators/mfi';
import { calculateEMA } from '../lib/engine/indicators/ema';
import { calculateMACD } from '../lib/engine/indicators/macd';
import { calculateBollingerBands } from '../lib/engine/indicators/bollinger';
import { calculateATR } from '../lib/engine/indicators/atr';
import { calculateADX } from '../lib/engine/indicators/adx';
import { Candle } from '../lib/types';

// Helper to create simple candles (C=val, H=val, L=val, O=val)
const createCandles = (values: number[], volumes?: number[]): Candle[] => {
    return values.map((v, i) => ({
        time: 1000 * (i + 1),
        open: v,
        high: v + (v * 0.01), // Small wig
        low: v - (v * 0.01),
        close: v,
        volume: volumes ? volumes[i] : 1000
    }));
};

describe('Technical Indicators (Manual Implementations)', () => {

    describe('RSI', () => {
        it('should calculate RSI correctly for uptrend', () => {
            // Steadily increasing prices -> RSI should be high
            const values = Array.from({ length: 30 }, (_, i) => 100 + i * 2);
            const candles = createCandles(values);
            const result = calculateRSI(candles, 14);

            expect(result.value).toBeGreaterThan(70);
            expect(result.value).not.toBeNaN();
        });

        it('should return neutral for insufficient data', () => {
            const candles = createCandles([100, 101, 102]);
            const result = calculateRSI(candles, 14);
            expect(result.value).toBeNaN();
        });
    });

    describe('EMA', () => {
        it('should track price momentum', () => {
            // Price jumps up, EMA should trails below
            const values = [...Array(20).fill(100), ...Array(10).fill(120)];
            const candles = createCandles(values);
            const result = calculateEMA(candles, 10);

            expect(result.value).toBeLessThan(120);
            expect(result.value).toBeGreaterThan(100);
            expect(result.signal).toBe('buy'); // Price > EMA
        });
    });

    describe('MACD', () => {
        it('should detect crossover', () => {
            // Uptrend -> MACD should be positive
            const values = Array.from({ length: 60 }, (_, i) => 100 + i);
            const candles = createCandles(values);
            const result = calculateMACD(candles);

            expect(result.value.MACD).toBeGreaterThan(0);
        });
    });

    describe('Bollinger Bands', () => {
        it('should contain price within bands mostly', () => {
            // Fluctuating prices -> Bands should expand around mean
            const values = Array.from({ length: 30 }, (_, i) => 100 + (i % 2 === 0 ? 2 : -2));
            const candles = createCandles(values);
            const result = calculateBollingerBands(candles);

            expect(result.value.middle).toBeCloseTo(100, 0);
            expect(result.value.upper).toBeGreaterThan(100);
            expect(result.value.lower).toBeLessThan(100);
        });
    });

    describe('ATR', () => {
        it('should measure volatility', () => {
            // High volatility candles
            const candles = Array.from({ length: 20 }, (_, i) => ({
                time: i * 1000,
                open: 100,
                high: 110,
                low: 90,
                close: 100,
                volume: 1000
            }));

            const result = calculateATR(candles, 14);
            // TR is roughly 20 (110-90)
            expect(result.value).toBeCloseTo(20, 0);
        });
    });

});
