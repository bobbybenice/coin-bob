export interface Asset {
    id: string;
    symbol: string;
    name: string;
    price: number;
    change24h: number;
    volume24h: number;
    marketCap: number;
    rsi: number;
    bobScore: number;
    // New Technical Indicators
    ema20?: number;
    ema50?: number;
    ema200?: number;
    macd?: {
        MACD?: number;
        signal?: number;
        histogram?: number;
    };
    bb?: {
        upper: number;
        middle: number;
        lower: number;
    };
}

export interface FilterCriteria {
    favoritesOnly: boolean;
    minRsi: number;
    maxRsi: number;
    minBobScore: number;
    // New Strategy Filters
    oversold: boolean;     // RSI < 30
    goldenCross: boolean;  // EMA 50 > EMA 200
    aboveEma20: boolean;   // Price > EMA 20
    macdBullish: boolean;  // MACD Histogram > 0
    bbLow: boolean;        // Price < Lower Band
}


export interface UserSettings {
    favorites: string[];
    filters: FilterCriteria;
}

export interface NewsItem {
    id: number;
    title: string;
    url: string;
    domain: string;
    published_at: string;
    currencies: { code: string; title: string; slug: string; }[];
    votes: {
        negative: number;
        positive: number;
        important: number;
        liked: number;
        disliked: number;
        lol: number;
        toxic: number;
        saved: number;
        comments: number;
    };
    sentiment: 'bullish' | 'bearish' | 'neutral';
    score: number;
}

export interface WhaleTransaction {
    id: string;
    blockchain: string;
    symbol: string;
    transaction_type: string;
    hash: string;
    from: {
        address: string;
        owner: string;
        owner_type: string;
    };
    to: {
        address: string;
        owner: string;
        owner_type: string;
    };
    timestamp: number;
    amount: number;
    amount_usd: number;
    transaction_count: number;
}
