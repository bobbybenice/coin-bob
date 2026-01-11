'use server';

export async function fetchHistoricalData(symbol: string): Promise<number[]> {
    const baseSymbol = symbol.replace('USDT', '');

    const sources = [
        {
            name: 'CryptoCompare',
            url: `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${baseSymbol}&tsym=USD&limit=250`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            adapter: (json: any) => json?.Data?.Data?.map((d: any) => d.close)
        },
        {
            name: 'Binance Global',
            url: `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=250`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            adapter: (json: any) => Array.isArray(json) ? json.map((d: any[]) => parseFloat(d[4])) : []
        },
        {
            name: 'Binance US', // Good for US IP addresses 
            url: `https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=1d&limit=250`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            adapter: (json: any) => Array.isArray(json) ? json.map((d: any[]) => parseFloat(d[4])) : []
        }
    ];

    for (const source of sources) {
        try {
            const res = await fetch(source.url, {
                headers: { 'User-Agent': 'CoinBob/1.0' },
                next: { revalidate: 3600 } // Cache for 1 hour
            });
            if (!res.ok) continue;

            const json = await res.json();
            const closePrices = source.adapter(json);

            if (Array.isArray(closePrices) && closePrices.length >= 100) {
                return closePrices;
            }
        } catch (e) {
            console.warn(`Failed to fetch history from ${source.name} for ${symbol}:`, e);
        }
    }

    return [];
}
