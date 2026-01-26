
import { fetchHistory } from '@/lib/binance';
import { Timeframe } from '@/lib/types';
import * as marketService from '@/lib/services/market';

// Mock localStorage
const localStorageMock = (function () {
    let store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
            store[key] = value.toString();
        }),
        removeItem: jest.fn((key: string) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
        key: jest.fn((index: number) => Object.keys(store)[index] || null),
        get length() {
            return Object.keys(store).length;
        },
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock External Service
jest.mock('@/lib/services/market', () => ({
    fetchHistoricalData: jest.fn(),
}));

describe('Binance Client Service', () => {
    const symbol = 'BTCUSDT';
    const timeframe: Timeframe = '1m';
    const storageKey = `indicators_${symbol}_${timeframe}`;

    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
        // Reset checking "freshness" requires manipulating Date.now, so we should mock it or handle timestamps carefully
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('fetchHistory should fetch from API if cache is empty', async () => {
        const mockData = [{ time: Date.now(), open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 }];
        (marketService.fetchHistoricalData as jest.Mock).mockResolvedValue(mockData);

        await fetchHistory(symbol, timeframe);

        expect(marketService.fetchHistoricalData).toHaveBeenCalledWith(symbol, timeframe);
        expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('fetchHistory should return cached data if fresh and no gap', async () => {
        const now = Date.now();
        const mockData = [{ time: now - 30000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 }]; // 30s ago
        const cacheValue = JSON.stringify({
            data: mockData,
            timestamp: now - 1000 // Cache saved 1s ago
        });
        localStorage.setItem(storageKey, cacheValue);

        await fetchHistory(symbol, timeframe);

        expect(marketService.fetchHistoricalData).not.toHaveBeenCalled();
    });

    it('fetchHistory should REFETCH if cache is older than 1 minute', async () => {
        const now = Date.now();
        // Cache entry is old (timestamp > 1 min ago)
        const oldTimestamp = now - (61 * 1000);
        const mockData = [{ time: oldTimestamp, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 }];

        localStorage.setItem(storageKey, JSON.stringify({
            data: mockData,
            timestamp: oldTimestamp
        }));

        (marketService.fetchHistoricalData as jest.Mock).mockResolvedValue([{ time: now, close: 2, open: 1, high: 2, low: 1, volume: 10 }]);

        await fetchHistory(symbol, timeframe);

        expect(marketService.fetchHistoricalData).toHaveBeenCalled();
    });

    it('fetchHistory should REFETCH if cache is fresh but data has GAP (Last candle too old)', async () => {
        const now = Date.now();
        // Cache saved RECENTLY (e.g. 10s ago), but the data inside is OLD (e.g. 5 minutes ago)
        // This simulates a scenario where we loaded, saved, closed app, user opened app 5 mins later.
        // Wait... if user opened app 5 mins later, the file timestamp (if we rely on LS timestamp) would be old? 
        // No, let's say we saved it, then time passed. If we rely on stored timestamp, that timestamp IS old. 
        // GAP detection is for when the cache entry says "I was saved 10 seconds ago" (fresh?) -> Impossible if we just loaded?
        // Actually: "timestamp" in LS is when we SAVED it. 
        // So checking (now - timestamp) handles the "cache file is old" case. 
        // The GAP case is: We just fetched data, but the API returned old data? Or maybe we saved it, but the data inside was already lagging?
        // A better GAP test: We have a cache valid from 30 seconds ago. 
        // But the last candle in that cache is from 10 minutes ago. 
        // This implies we saved "stale" data previously? Or maybe the market halted? 
        // Regardless, if the last candle is significantly older than Date.now(), we should probably try to fetch again to see if there's new data.

        const lastCandleTime = now - (10 * 60 * 1000); // 10 mins ago
        const cacheTimestamp = now - (10 * 1000); // Saved 10s ago (maybe erroneously?)

        const mockData = [{ time: lastCandleTime, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 }];

        localStorage.setItem(storageKey, JSON.stringify({
            data: mockData,
            timestamp: cacheTimestamp
        }));

        (marketService.fetchHistoricalData as jest.Mock).mockResolvedValue([{ time: now, close: 2, open: 1, high: 2, low: 1, volume: 10 }]);

        await fetchHistory(symbol, timeframe);

        // Even though cache timestamp is young (10s), the DATA is old (10m), so we should refetch.
        expect(marketService.fetchHistoricalData).toHaveBeenCalled();
    });
});
