'use client';

import { useState } from 'react';
import { runBacktest } from '@/lib/engine/backtester';
import { strategyICT } from '@/lib/engine/strategies/ict';
import { strategyRSIMFI } from '@/lib/engine/strategies/rsi-mfi-confluence';
import { useMarketData } from '@/lib/hooks/useMarketData';
import { fetchHistoricalData } from '@/lib/services/market';
import { Asset, Candle } from '@/lib/types';
import { ArrowLeft, Play, BarChart2, Activity } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WATCHLIST, SYMBOL_MAP } from '@/lib/constants';

import dynamic from 'next/dynamic';
import BacktestSummary from '@/components/analysis/BacktestSummary';

const BacktestChart = dynamic(() => import('@/components/analysis/BacktestChart'), { ssr: false });

export default function BacktestPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const paramSymbol = searchParams.get('symbol');
    const initialSymbol = paramSymbol
        ? (paramSymbol.toUpperCase().endsWith('USDT') ? paramSymbol.toUpperCase() : `${paramSymbol.toUpperCase()}USDT`)
        : 'BTCUSDT';

    const [symbol, setSymbol] = useState(initialSymbol);
    const [timeframe, setTimeframe] = useState(searchParams.get('timeframe') || '1h');
    const [strategy, setStrategy] = useState(searchParams.get('strategy') || 'ICT'); // 'ICT' | 'RSI_MFI'
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [chartData, setChartData] = useState<Candle[]>([]);

    const handleRunBacktest = async () => {
        setIsLoading(true);
        try {
            // Fetch historical data
            const candles = await fetchHistoricalData(symbol, timeframe);

            if (candles.length < 100) {
                alert('Insufficient data for backtest');
                setIsLoading(false);
                return;
            }

            setChartData(candles);

            // Run Backtest
            let strategyFn = strategyICT;
            if (strategy === 'RSI_MFI') {
                strategyFn = strategyRSIMFI;
            }

            const res = runBacktest(strategyFn, candles);
            setResults(res);

        } catch (e) {
            console.error(e);
            alert('Failed to run backtest');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-6">
            <header className="mb-8 flex items-center gap-4">
                <button onClick={() => router.push('/')} className="p-2 hover:bg-muted rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold">Strategy Backtester</h1>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Configuration Panel & Summary */}
                <div className="space-y-6">
                    <div className="bg-card border border-border rounded-xl p-6 h-fit">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-emerald-500" />
                            Configuration
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Asset Symbol</label>
                                <div className="relative">
                                    <select
                                        value={symbol}
                                        onChange={(e) => setSymbol(e.target.value)}
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none appearance-none"
                                    >
                                        {WATCHLIST.map((s) => (
                                            <option key={s} value={s}>
                                                {s} ({SYMBOL_MAP[s]?.name || s})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-muted-foreground">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Timeframe</label>
                                <div className="relative">
                                    <select
                                        value={timeframe}
                                        onChange={(e) => setTimeframe(e.target.value)}
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none appearance-none"
                                    >
                                        <option value="1m">1m</option>
                                        <option value="5m">5m</option>
                                        <option value="1h">1h</option>
                                        <option value="4h">4h</option>
                                        <option value="1d">1d</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-muted-foreground">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Strategy</label>
                                <div className="relative">
                                    <select
                                        value={strategy}
                                        onChange={(e) => setStrategy(e.target.value)}
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none appearance-none"
                                    >
                                        <option value="ICT">ICT (Inner Circle Trader)</option>
                                        <option value="RSI_MFI">RSI + MFI Confluence</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-muted-foreground">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleRunBacktest}
                                disabled={isLoading}
                                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4 fill-current" />
                                )}
                                Run Backtest
                            </button>
                        </div>
                    </div>

                    <BacktestSummary
                        results={results}
                        strategy={strategy}
                        symbol={symbol}
                        timeframe={timeframe}
                    />
                </div>

                {/* Results Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-card border border-border rounded-xl p-4">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Trades</h3>
                            <p className="text-2xl font-bold mt-1 text-foreground">{results?.totalTrades ?? '-'}</p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Win Rate</h3>
                            <p className={`text-2xl font-bold mt-1 ${results?.winRate >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {results ? `${results.winRate.toFixed(1)}%` : '-'}
                            </p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net PnL</h3>
                            <p className={`text-2xl font-bold mt-1 ${results?.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {results ? `$${results.pnl.toFixed(2)}` : '-'}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end text-[10px] text-muted-foreground font-mono -mt-2 mb-4">
                        * Simulation assumes fixed $1,000 position size per trade (Initial Capital: $10,000)
                    </div>

                    {/* CHART SECTION */}
                    {results && chartData.length > 0 && (
                        <div className="bg-card border border-border rounded-xl p-4">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Visualization</h3>
                            <BacktestChart data={chartData as any} trades={results.trades} />
                        </div>
                    )}

                    {/* Trades Table */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden min-h-[400px]">
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
                            <h3 className="font-semibold flex items-center gap-2">
                                <BarChart2 className="w-4 h-4 text-muted-foreground" />
                                Trade Log
                            </h3>
                            {results && (
                                <span className="text-xs text-muted-foreground">
                                    Simulated on last {results.totalTrades > 0 ? 'dataset' : 'data'}
                                </span>
                            )}
                        </div>

                        {!results ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
                                <Activity className="w-8 h-8 opacity-20" />
                                <p className="text-sm">Run a backtest to see results</p>
                            </div>
                        ) : results.trades.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
                                <p className="text-sm">No trades found matching strategy criteria</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted/30 text-xs text-muted-foreground uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Side</th>
                                            <th className="px-6 py-3 font-medium text-right">Entry</th>
                                            <th className="px-6 py-3 font-medium text-right">Exit</th>
                                            <th className="px-6 py-3 font-medium text-center">PnL %</th>
                                            <th className="px-6 py-3 font-medium text-right">Net</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {results.trades.map((trade: any, i: number) => (
                                            <tr key={i} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-6 py-3">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${trade.side === 'LONG' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                                                        }`}>
                                                        {trade.side}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-right font-mono text-muted-foreground">
                                                    ${trade.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-3 text-right font-mono text-muted-foreground">
                                                    ${trade.exitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    <span className={`font-mono font-medium ${trade.pnl > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {trade.pnl > 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-3 text-right font-mono font-medium ${trade.pnl > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {trade.pnl > 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
