export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export type ICTSignal = 'BULLISH_SWEEP' | 'BEARISH_SWEEP' | 'BULLISH_FVG' | 'BEARISH_FVG' | 'NONE';

export interface ActiveZone {
    top: number;
    bottom: number;
    start: number; // timestamp
    end?: number; // timestamp (if mitigated) or Infinity/future
    type: 'BULLISH' | 'BEARISH';
    mitigated: boolean;
}

export interface ICTAnalysis {
    signal: ICTSignal;
    fvg?: {
        top?: number;
        bottom?: number;
        type: 'BULLISH' | 'BEARISH';
    };
    activeZones?: ActiveZone[];
    killzone?: 'LONDON' | 'NEW_YORK';
    isHighProbability: boolean;
}

export interface ScoreComponent {
    label: string;
    value: number;
    category: 'TREND' | 'STRATEGY' | 'INDICATOR';
    description: string;
}

export interface Asset {
    id: string;
    symbol: string;
    name: string;
    price: number;
    change24h: number;
    volume24h: number;
    marketCap: number;
    rsi: number;
    // Futures Data
    isPerpetual?: boolean;
    fundingRate?: number; // In percentage (e.g. 0.01)
    openInterest?: number; // In USD
    nextFundingTime?: number; // Timestamp of next funding

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
    ictAnalysis?: ICTAnalysis;
    trigger?: boolean; // True if an active entry trigger exists
}

export interface FilterCriteria {
    favoritesOnly: boolean;
    minRsi: number;
    maxRsi: number;
    // New Strategy Filters
    oversold: boolean;     // RSI < 30
    goldenCross: boolean;  // EMA 50 > EMA 200
    aboveEma20: boolean;   // Price > EMA 20
    macdBullish: boolean;  // MACD Histogram > 0
    bbLow: boolean;        // Price < Lower Band
    // ICT Filters
    ictBullishSweep: boolean;
    ictBearishSweep: boolean;
    ictBullishFVG: boolean;
    ictBearishFVG: boolean;
}


export type StrategyName =
    | 'RSI_MFI'
    | 'BOLLINGER_BOUNCE'
    | 'MACD_DIVERGENCE'
    | 'EMA_CROSSOVER'
    | 'VOLUME_BREAKOUT'
    | 'SUPPORT_RESISTANCE'
    | 'GOLDEN_STRATEGY'
    | 'ICT'
    | 'CONVERGENCE_OB'
    | 'CONTINUATION_POI';

export interface UserSettings {
    favorites: string[];
    filters: FilterCriteria;
    timeframe: Timeframe;
    visibleStrategies: StrategyName[];
    showKeyLevels?: boolean; // New setting for Pivots on Chart
}

export interface NewsItem {
    id: string | number;
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

export interface StrategyResponse {
    status: 'ENTRY' | 'EXIT' | 'HOLD' | 'WAIT' | 'IDLE' | 'WATCH';
    priceLevels: {
        entry?: number;
        stopLoss?: number;
        takeProfit?: number;
    };
    reason: string;
    metadata?: {
        ema?: number;
        rsi?: number;
        atr?: number;
        killzone?: string;
        side?: 'LONG' | 'SHORT';
        isHighProbability?: boolean;
        sweep?: 'BULLISH' | 'BEARISH' | null;
        fvg?: 'BULLISH' | 'BEARISH' | null;
        activeZones?: ActiveZone[];
        [key: string]: unknown;
    };
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

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '1d';

export type TrendDirection = 'UP' | 'DOWN' | 'NEUTRAL';

export interface AssetTrends {
    t15m?: TrendDirection;
    t1h?: TrendDirection;
    t4h?: TrendDirection;
    t1d?: TrendDirection;
    rsi15m?: number;
    rsi1h?: number;
    rsi4h?: number;
    mfi15m?: number;
    mfi1h?: number;
    mfi4h?: number;
    strategies?: Record<StrategyName, Record<string, 'LONG' | 'SHORT' | null>>;
    lastUpdated?: number;
}



export interface ChartMarker {
    time: number;
    position: 'aboveBar' | 'belowBar' | 'inBar';
    color: string;
    shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
    text?: string;
    size?: number;
}

export interface IndicatorResult<T = number> {
    value: T;
    signal?: 'buy' | 'sell' | 'neutral';
    metadata?: Record<string, unknown>;
}

export type IndicatorFunction<T = number> = (candles: Candle[]) => IndicatorResult<T>;

export interface TradeRecord {
    entryTime: number;
    exitTime: number;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    pnlPercent: number;
    side: 'LONG' | 'SHORT';
}

export interface BacktestResult {
    totalTrades: number;
    winRate: number;
    pnl: number;
    trades: TradeRecord[];
}

export type StrategyFunction = (candles: Candle[], options?: Record<string, unknown>) => StrategyResponse;
