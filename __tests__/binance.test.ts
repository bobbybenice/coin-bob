
import { Timeframe } from '@/lib/types';

// We need to reset modules to clear in-memory cache between tests
beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    jest.clearAllMocks();
});

afterEach(() => {
    jest.useRealTimers();
});

describe('Futures Service Klines Caching', () => {
    const symbol = 'BTCUSDT';
    const timeframe: Timeframe = '1m';

    // Helper to setup fetch mock
    const setupFetchMock = (mockResponse: any[]) => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            } as Response)
        );
    };

    it('should fetch from API on first call (Cache Miss)', async () => {
        setupFetchMock([[1600000000, "1", "2", "0.5", "1.5", "100"]]);

        // Dynamic import to ensure fresh module instance with empty cache
        const { fetchFuturesKlines } = await import('@/lib/services/futures');

        await fetchFuturesKlines(symbol, timeframe);

        const klineCalls = (global.fetch as jest.Mock).mock.calls.filter(call => call[0].includes('/fapi/v1/klines'));
        expect(klineCalls.length).toBe(1);

        // Check verifying the URL includes klines
        expect(klineCalls[0][0]).toContain('/fapi/v1/klines');
    });

    it('should return cached data on second call (Cache Hit)', async () => {
        setupFetchMock([[1600000000, "1", "2", "0.5", "1.5", "100"]]);
        const { fetchFuturesKlines } = await import('@/lib/services/futures');

        // First call
        await fetchFuturesKlines(symbol, timeframe);

        // Second call matching parameters
        await fetchFuturesKlines(symbol, timeframe);

        // Should still be called only once (or twice if first one triggered 2 calls via symbol resolution, but 2nd main call shouldn't trigger fetch)
        // Let's check calls to klines specifically
        const klineCalls = (global.fetch as jest.Mock).mock.calls.filter(call => call[0].includes('/fapi/v1/klines'));
        expect(klineCalls.length).toBe(1);
    });

    it('should refetch if cache is expired (TTL 60s)', async () => {
        setupFetchMock([[1600000100, "1", "2", "0.5", "1.5", "100"]]);
        const { fetchFuturesKlines } = await import('@/lib/services/futures');

        // First call
        await fetchFuturesKlines(symbol, timeframe);

        // Fast forward time > 60s
        jest.advanceTimersByTime(61 * 1000);

        // Second call
        await fetchFuturesKlines(symbol, timeframe);

        const klineCalls = (global.fetch as jest.Mock).mock.calls.filter(call => call[0].includes('/fapi/v1/klines'));
        expect(klineCalls.length).toBe(2);
    });

    it('should dedup simultaneous requests (In-Flight)', async () => {
        // Immediate resolve is enough because await in resolveFuturesSymbol yields execution
        setupFetchMock([]);

        const { fetchFuturesKlines } = await import('@/lib/services/futures');

        // Fire two requests immediately
        const p1 = fetchFuturesKlines(symbol, timeframe);
        const p2 = fetchFuturesKlines(symbol, timeframe);

        await Promise.all([p1, p2]);

        const klineCalls = (global.fetch as jest.Mock).mock.calls.filter(call => call[0].includes('/fapi/v1/klines'));
        expect(klineCalls.length).toBe(1);
    });
});
