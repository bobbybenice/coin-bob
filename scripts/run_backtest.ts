import { runBacktest } from '../lib/engine/backtester';
import { strategyICT } from '../lib/engine/strategies/ict';
import { Candle } from '../lib/engine/types';

// Simple fetcher to avoid 'use server' complexity in CLI
async function getBTCData(): Promise<Candle[]> {
    console.log("Fetching BTCUSDT data...");
    const res = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=500');
    if (!res.ok) throw new Error('Failed to fetch data');
    const data = await res.json();
    return data.map((d: (string | number)[]) => ({
        time: d[0],
        open: parseFloat(String(d[1])),
        high: parseFloat(String(d[2])),
        low: parseFloat(String(d[3])),
        close: parseFloat(String(d[4])),
        volume: parseFloat(String(d[5]))
    }));
}

async function main() {
    try {
        const candles = await getBTCData();
        console.log(`Loaded ${candles.length} candles.`);

        console.log("Running ICT Strategy Backtest...");
        const result = runBacktest(strategyICT, candles);

        console.log("\n--- Backtest Results ---");
        console.log(`Total Trades: ${result.totalTrades}`);
        console.log(`Win Rate: ${result.winRate.toFixed(2)}%`);
        console.log(`PnL: $${result.pnl.toFixed(2)}`);

        if (result.trades.length > 0) {
            console.log("\nLast 5 Trades:");
            result.trades.slice(-5).forEach(t => {
                console.log(`[${t.side}] Entry: ${t.entryPrice} -> Exit: ${t.exitPrice} | PnL: ${t.pnl.toFixed(2)} (${t.pnlPercent.toFixed(2)}%)`);
            });
        }
    } catch (e) {
        console.error(e);
    }
}

main();
