export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface IndicatorResult<T = number> {
    value: T;
    signal?: 'buy' | 'sell' | 'neutral';
    metadata?: Record<string, any>;
}

export type IndicatorFunction<T = number> = (candles: Candle[]) => IndicatorResult<T>;

export interface PriceLevels {
    entry?: number;
    stopLoss?: number;
    takeProfit?: number;
}

export interface StrategyResponse {
    status: 'IDLE' | 'WATCH' | 'ENTRY' | 'EXIT';
    priceLevels: PriceLevels;
    reason: string;
    metadata?: Record<string, any>;
}

export type StrategyFunction = (candles: Candle[]) => StrategyResponse;
