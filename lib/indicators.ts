/**
 * Calculates the Exponential Moving Average (EMA)
 * @param prices Array of prices (most recent LAST)
 * @param period Number of periods for EMA
 * @returns The most recent EMA value
 */
export function calculateEMA(prices: number[], period: number): number | undefined {
    if (prices.length < period) return undefined;

    const k = 2 / (period + 1);

    // Initial SMA
    let ema = prices.slice(0, period).reduce((sum, p) => sum + p, 0) / period;

    // Calculate EMA for the rest
    for (let i = period; i < prices.length; i++) {
        ema = (prices[i] * k) + (ema * (1 - k));
    }

    return ema;
}

/**
 * Calculates the Relative Strength Index (RSI)
 * @param prices Array of prices (most recent LAST)
 * @param period RSI period (default 14)
 * @returns The most recent RSI value (0-100)
 */
export function calculateRSI(prices: number[], period: number = 14): number | undefined {
    if (prices.length < period + 1) return undefined;

    let gains = 0;
    let losses = 0;

    // Initial average
    for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change >= 0) {
            gains += change;
        } else {
            losses -= change;
        }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Smooth subsequent steps
    for (let i = period + 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        if (change >= 0) {
            avgGain = (avgGain * (period - 1) + change) / period;
            avgLoss = (avgLoss * (period - 1) + 0) / period;
        } else {
            avgGain = (avgGain * (period - 1) + 0) / period;
            avgLoss = (avgLoss * (period - 1) - change) / period;
        }
    }

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}
