'use client';


import { Button } from '@/components/ui/Button';
import { use } from 'react';
import { MultiChartView } from '@/components/analyze/MultiChartView';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import AnalysisEngine from '@/components/AnalysisEngine';
import CommandPalette from '@/components/ui/CommandPalette';
import { useUserStore } from '@/lib/store';
import { Play, RotateCcw, Settings } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { WATCHLIST, SYMBOL_MAP } from '@/lib/constants';
import { Asset, StrategyName } from '@/lib/types';
import { getAllStrategyNames, getStrategy } from '@/lib/engine/strategies';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

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
        <div className="flex items-center gap-2">
            <BacktestSettings />

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
    const { setActiveAsset } = useUserStore();

    // Set active asset on mount
    useEffect(() => {
        setActiveAsset(symbol);
        return () => setActiveAsset(null); // Clear on exit
    }, [symbol, setActiveAsset]);

    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Chart control state (lifted from MultiChartView)
    const [chartCount, setChartCount] = useState<1 | 2 | 3>(1);
    const [zoomResetCounter, setZoomResetCounter] = useState(0);
    const [isScalpMode, setIsScalpMode] = useState(false);
    const [strategies, setStrategies] = useState<(StrategyName | null)[]>([
        'RSI_MFI',
        'BOLLINGER_BOUNCE',
        'VOLUME_BREAKOUT'
    ]);
    const [masterStrategy, setMasterStrategy] = useState<StrategyName | ''>('');

    // Chart control handlers
    const handleChartCountChange = (count: 1 | 2 | 3) => {
        setChartCount(count);
        setZoomResetCounter(prev => prev + 1);
        if (count > chartCount) {
            setStrategies(prev => {
                const newStats = [...prev];
                if (count >= 2) newStats[1] = prev[0];
                if (count === 3) newStats[2] = prev[0];
                return newStats;
            });
        }
    };

    const handleStrategyChange = (index: number, newStrategy: StrategyName | null) => {
        setStrategies(prev => {
            const next = [...prev];
            next[index] = newStrategy;
            return next;
        });
        setMasterStrategy('');
    };

    const handleMasterStrategyChange = (newStrategy: StrategyName | null) => {
        setMasterStrategy(newStrategy || '');
        if (newStrategy) {
            setStrategies([newStrategy, newStrategy, newStrategy]);
        }
    };

    const allStrategyNames = getAllStrategyNames();

    // Generate static asset list for switcher
    const switcherAssets = useMemo(() => {
        return WATCHLIST.map(ticker => {
            const sym = ticker.replace('USDT', '');
            const info = SYMBOL_MAP[ticker];
            return {
                id: info.id,
                symbol: sym,
                name: info.name,
                price: 0, // Placeholder
                change24h: 0, // Placeholder
                volume24h: 0,
                marketCap: 0,
                rsi: 0,
                isPerpetual: false
            } as Asset;
        });
    }, []);

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Command Palette for Switching */}
            <CommandPalette
                assets={switcherAssets}
                isOpen={isSwitcherOpen}
                onClose={() => setIsSwitcherOpen(false)}
            />

            {/* Header */}
            <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card shrink-0">
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 p-3 rounded-md hover:bg-zinc-800 transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Link>

                    <div>
                        <Button
                            variant="ghost"
                            onClick={() => setIsSwitcherOpen(true)}
                            className="flex items-center gap-2 text-xl font-bold text-foreground px-2 py-1 h-auto -ml-2"
                        >
                            {symbol}
                            <ChevronDown className="w-4 h-4 text-muted-foreground opacity-50" />
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Master Strategy Dropdown */}
                    <div className="flex items-center gap-2">
                        <div className="relative group min-w-[160px]">
                            <select
                                value={masterStrategy}
                                onChange={(e) => handleMasterStrategyChange(e.target.value as StrategyName)}
                                className="w-full appearance-none pl-3 pr-9 py-1.5 text-xs font-medium bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/50 hover:border-emerald-500/50 transition-colors cursor-pointer"
                            >
                                <option value="" disabled>Set All Strategies...</option>
                                {allStrategyNames.map((name) => {
                                    const config = getStrategy(name);
                                    return (
                                        <option key={name} value={name}>
                                            {config?.displayName || name}
                                        </option>
                                    );
                                })}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none group-hover:text-emerald-500 transition-colors" />
                        </div>
                        <InfoTooltip content="Select a strategy to apply it to ALL active charts simultaneously." position="right" />
                    </div>

                    <div className="h-6 w-px bg-border" />

                    {/* Scalp Mode Toggle */}
                    <div className="flex items-center gap-1.5">
                        <label className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity select-none">
                            <input
                                type="checkbox"
                                checked={isScalpMode}
                                onChange={(e) => {
                                    const enabled = e.target.checked;
                                    setIsScalpMode(enabled);
                                    if (enabled) {
                                        setStrategies([strategies[0], strategies[0], strategies[0]]);
                                    }
                                }}
                                className="w-3.5 h-3.5 rounded border-zinc-600 bg-transparent text-emerald-500 focus:ring-0 focus:ring-offset-0"
                            />
                            <span className="text-xs font-medium text-muted-foreground">Scalp Mode</span>
                        </label>
                        <InfoTooltip content="Instantly switch to 3-chart scalping layout: 1H, 15m, and 5m timeframes for rapid multi-timeframe analysis." position="right" />
                    </div>

                    <div className="h-6 w-px bg-border" />

                    {/* Chart Count */}
                    <div className="flex items-center gap-1.5">
                        <div className={`flex items-center bg-muted p-1 rounded-lg border border-border/50 gap-1 ${isScalpMode ? 'opacity-50 pointer-events-none' : ''}`}>
                            {Array.from({ length: 3 }, (_, i) => i + 1).map((count) => (
                                <Button
                                    key={count}
                                    onClick={() => handleChartCountChange(count as 1 | 2 | 3)}
                                    variant={(!isScalpMode && chartCount === count) || (isScalpMode && count === 3) ? 'emerald' : 'ghost'}
                                    size="sm"
                                    className={`px-4 py-2 text-xs font-bold rounded-md transition-all duration-200 h-auto ${chartCount === count
                                        ? 'shadow-sm ring-1 ring-emerald-500'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                        }`}
                                >
                                    {count}
                                </Button>
                            ))}
                        </div>
                        <InfoTooltip content="Choose how many charts to display side-by-side. New charts inherit the strategy from Chart 1." position="right" />
                    </div>

                    <div className="h-6 w-px bg-border" />

                    <BacktestControls />
                </div>
            </div>

            {/* Main Layout: Charts + Sidebar */}
            <div className="flex-1 flex overflow-hidden">
                {/* Charts Area */}
                <div className="flex-1 relative">
                    <MultiChartView
                        symbol={symbol}
                        chartCount={chartCount}
                        isScalpMode={isScalpMode}
                        strategies={strategies}
                        onStrategyChange={handleStrategyChange}
                        zoomResetCounter={zoomResetCounter}
                    />
                </div>

                {/* Analysis Sidebar */}
                <div
                    className={`border-l border-border h-full bg-card shrink-0 z-10 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-[320px]' : 'w-[60px]'}`}
                >
                    <AnalysisEngine
                        isOpen={isSidebarOpen}
                        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                        showStrategies={false}
                    />
                </div>
            </div>
        </div>
    );
}
