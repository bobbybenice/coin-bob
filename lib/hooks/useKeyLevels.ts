import { useState, useEffect } from 'react';
import { fetchFuturesKlines } from '@/lib/services/futures';

// Shared Interface
export interface Levels {
    p: number;
    r1: number;
    r2: number;
    s1: number;
    s2: number;
}

export function useKeyLevels(symbol: string) {
    const [levels, setLevels] = useState<Levels | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            if (!symbol) return;
            setIsLoading(true);
            try {
                // Always fetch Futures data for Key Levels
                const candles = await fetchFuturesKlines(symbol, '1d', 500);

                if (candles && candles.length >= 2) {
                    // Standard Pivots: High, Low, Close from YESTERDAY (candles.length - 2)
                    // candles.length - 1 is TODAY (developing)
                    const yesterday = candles[candles.length - 2];

                    const h = yesterday.high;
                    const l = yesterday.low;
                    const c = yesterday.close;

                    const p = (h + l + c) / 3;
                    const r1 = (2 * p) - l;
                    const s1 = (2 * p) - h;
                    const r2 = p + (h - l);
                    const s2 = p - (h - l);

                    if (mounted) {
                        setLevels({ p, r1, r2, s1, s2 });
                    }
                } else {
                    if (mounted) setLevels(null);
                }
            } catch (e) {
                console.error("KeyLevels Error", e);
                if (mounted) setLevels(null);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        load();
        return () => { mounted = false; };
    }, [symbol]);

    return { levels, isLoading };
}
