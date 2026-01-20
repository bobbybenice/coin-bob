'use client';

import { use } from 'react';
import { MultiChartView } from '@/components/analyze/MultiChartView';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useUserStore } from '@/lib/store';
import { Play, RotateCcw, Settings } from 'lucide-react';
import { useState } from 'react';

interface AnalyzePageProps {
    params: Promise<{
        symbol: string;
    }>;
}

function BacktestSettings() {
    const { backtestOptions, updateBacktestOptions } = useUserStore();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-md cursor-pointer transition-colors ${isOpen ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-zinc-700 hover:text-foreground'}`}
                title="Backtest Settings"
            >
                <Settings className="w-4 h-4" />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-64 p-4 bg-black border border-border rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Settings</h3>

                        <div className="space-y-4">
                            {/* Stop Loss */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs">
                                    <span className="font-medium">Stop Loss</span>
                                    <span className="font-mono text-emerald-500">{backtestOptions.stopLossPercent}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="10"
                                    step="0.1"
                                    value={backtestOptions.stopLossPercent}
                                    onChange={(e) => updateBacktestOptions({ stopLossPercent: parseFloat(e.target.value) })}
                                    className="w-full accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            {/* Risk/Reward */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs">
                                    <span className="font-medium">Risk/Reward</span>
                                    <span className="font-mono text-emerald-500">1:{backtestOptions.riskRewardRatio}</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    step="0.1"
                                    value={backtestOptions.riskRewardRatio}
                                    onChange={(e) => updateBacktestOptions({ riskRewardRatio: parseFloat(e.target.value) })}
                                    className="w-full accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            {/* Soft Exits */}
                            <label className="flex items-center justify-between cursor-pointer group">
                                <span className="text-xs font-medium group-hover:text-emerald-500 transition-colors">Strategy Soft Exits</span>
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={backtestOptions.enableSoftExits}
                                        onChange={(e) => updateBacktestOptions({ enableSoftExits: e.target.checked })}
                                    />
                                    <div className="w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                                </div>
                            </label>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function BacktestControls() {
    const { isBacktestMode, toggleBacktestMode } = useUserStore();

    return (
        <div className="flex items-center gap-3">
            <BacktestSettings />

            <div className="w-px h-4 bg-border" />

            {isBacktestMode ? (
                <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest animate-pulse">Simulation Active</span>
                        <span className="text-xs text-muted-foreground">Displaying historical results</span>
                    </div>

                    <button
                        onClick={toggleBacktestMode}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md transition-all font-medium border border-zinc-700"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Exit Backtest
                    </button>
                </div>
            ) : (
                <button
                    onClick={toggleBacktestMode}
                    className="flex items-center gap-2 px-4 py-2 cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-all font-bold shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/40"
                >
                    <Play className="w-4 h-4 fill-current" />
                    Run Backtest
                </button>
            )}
        </div>
    );
}

/**
 * Analyze Page - Multi-chart analysis view for selected asset
 */
export default function AnalyzePage({ params }: AnalyzePageProps) {
    const { symbol } = use(params);

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header */}
            <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card shrink-0">
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Back to Screener</span>
                    </Link>

                    <div className="w-px h-6 bg-border" />

                    <div>
                        <h1 className="text-xl font-bold text-foreground">{symbol}</h1>
                        <p className="text-xs text-muted-foreground">Multi-Timeframe Analysis</p>
                    </div>
                </div>

                <BacktestControls />
            </div>

            {/* Charts */}
            <div className="flex-1 overflow-hidden">
                <MultiChartView symbol={symbol} />
            </div>
        </div>
    );
}
