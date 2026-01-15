'use client';

import { useState, Suspense } from 'react';
import { runBacktest } from '@/lib/engine/backtester';
import { strategyICT } from '@/lib/engine/strategies/ict';
import { strategyRSIMFI, RSIMFIOptions } from '@/lib/engine/strategies/rsi-mfi-confluence';
import { BacktestResult } from '@/lib/engine/types';
import { fetchHistoricalData } from '@/lib/services/market';
import { Candle } from '@/lib/types';
import { ArrowLeft, Play, BarChart2, Activity, Sparkles, CheckCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WATCHLIST, SYMBOL_MAP } from '@/lib/constants';

import dynamic from 'next/dynamic';
import BacktestSummary from '@/components/analysis/BacktestSummary';
import { optimizeStrategy, OptimizationResult } from '@/lib/engine/optimizer';

const BacktestChart = dynamic(() => import('@/components/analysis/BacktestChart'), { ssr: false });

function BacktestContent() {
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
    const [results, setResults] = useState<BacktestResult | null>(null);
    const [chartData, setChartData] = useState<Candle[]>([]);

    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationResults, setOptimizationResults] = useState<OptimizationResult[] | null>(null);
    const [customParams, setCustomParams] = useState<RSIMFIOptions | null>(null);
    const [enableSoftExit, setEnableSoftExit] = useState(false);

    const handleRunBacktest = async (overrideParams?: RSIMFIOptions) => {
        setIsLoading(true);
        setOptimizationResults(null);
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
                const params = overrideParams || { ...customParams, enableSoftExit };
                strategyFn = (c) => strategyRSIMFI(c, params);
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

    const handleOptimize = async () => {
        setIsOptimizing(true);
        setOptimizationResults(null);
        try {
            const candles = await fetchHistoricalData(symbol, timeframe);
            if (candles.length < 100) {
                alert('Insufficient data');
                setIsOptimizing(false);
                return;
            }

            // Yield to allow UI update
            await new Promise(r => setTimeout(r, 50));

            const results = await optimizeStrategy(candles);
            setOptimizationResults(results);
        } catch (e) {
            console.error("Optimize Error", e);
            alert('Optimization failed');
        } finally {
            setIsOptimizing(false);
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

                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">Exit Mode</label>
                                    <div className="relative">
                                        <select
                                            value={enableSoftExit ? 'SOFT' : 'HARD'}
                                            onChange={(e) => setEnableSoftExit(e.target.value === 'SOFT')}
                                            disabled={strategy !== 'RSI_MFI'}
                                            className={`w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none appearance-none ${strategy !== 'RSI_MFI' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <option value="HARD">Hard Targets Only (SL/TP)</option>
                                            <option value="SOFT">Allow Soft Exits (Strategy)</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-muted-foreground">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleRunBacktest()}
                                    disabled={isLoading || isOptimizing}
                                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Play className="w-4 h-4 fill-current" />
                                    )}
                                    Run
                                </button>

                                <button
                                    onClick={handleOptimize}
                                    disabled={isLoading || isOptimizing || strategy !== 'RSI_MFI'}
                                    className={`w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${strategy !== 'RSI_MFI' ? 'bg-zinc-700 opacity-50 cursor-not-allowed' : ''}`}
                                    title={strategy !== 'RSI_MFI' ? "Only available for configurable strategies" : "Auto-tune parameters"}
                                >
                                    {isOptimizing ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Sparkles className="w-4 h-4 fill-current" />
                                    )}
                                    Optimize
                                </button>
                            </div>
                        </div>

                        {/* Optimization Results Panel */}
                        {optimizationResults && optimizationResults.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-border animate-in slide-in-from-top-2">
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-indigo-400">
                                    <Sparkles className="w-4 h-4" />
                                    Best found parameters
                                </h3>
                                <div className="space-y-2">
                                    {optimizationResults.slice(0, 3).map((res, i) => (
                                        <div key={i} className={`p-3 rounded-lg border flex items-center justify-between text-xs ${i === 0 ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-muted/30 border-transparent'}`}>
                                            <div>
                                                <div className="font-mono font-bold text-foreground">
                                                    RSI {res.params.rsiPeriod} • OS {res.params.oversold} • OB {res.params.overbought} • {res.params.enableSoftExit ? 'Soft Exit' : 'Hard Exit'}
                                                </div>
                                                <div className="text-muted-foreground mt-0.5">
                                                    Win: <span className={res.result.winRate > 50 ? 'text-emerald-500' : 'text-rose-500'}>{res.result.winRate.toFixed(1)}%</span> • ROI: <span className={res.result.pnl > 0 ? 'text-emerald-500' : 'text-rose-500'}>{((res.result.pnl / 10000) * 100).toFixed(1)}%</span> • Trades: {res.result.totalTrades}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setCustomParams(res.params);
                                                    setEnableSoftExit(res.params.enableSoftExit || false);
                                                    handleRunBacktest(res.params);
                                                }}
                                                className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-indigo-400 hover:text-white"
                                                title="Apply these settings"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
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
                            <p className={`text-2xl font-bold mt-1 ${(results?.winRate ?? 0) >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {results ? `${results.winRate.toFixed(1)}%` : '-'}
                            </p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net PnL</h3>
                            <p className={`text-2xl font-bold mt-1 ${(results?.pnl ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
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
                            <BacktestChart data={chartData} trades={results.trades} />
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
                                        {results.trades.map((trade, i: number) => (
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

export default function BacktestPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background text-foreground p-6 flex items-center justify-center">Loading...</div>}>
            <BacktestContent />
        </Suspense>
    );
}
