'use client';

import { useUserStore } from '@/lib/store';

export default function AnalysisEngine() {
    const { settings, updateFilters, isLoaded } = useUserStore();

    if (!isLoaded) return <div className="p-4 text-muted-foreground animate-pulse">Loading...</div>;

    const { filters } = settings;

    return (
        <div className="flex flex-col h-auto lg:h-full bg-transparent overflow-hidden">
            <div className="p-4 border-b border-border bg-card flex justify-between items-center shrink-0 backdrop-blur-sm">
                <h2 className="text-sm font-medium text-foreground tracking-tight flex items-center gap-2 uppercase">
                    <span className="w-1.5 h-1.5 rounded-sm bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                    Analysis Engine
                </h2>
            </div>

            <div className="flex-1 p-5 space-y-8 overflow-y-auto custom-scrollbar">
                {/* Watchlist Filter */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Targeting</h3>
                    <label className="flex items-center justify-between group cursor-pointer p-2.5 rounded-lg bg-muted/30 border border-border hover:border-border hover:bg-muted/50 transition-all">
                        <span className="text-foreground font-medium text-sm">Favorites Only</span>
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                checked={filters.favoritesOnly}
                                onChange={(e) => updateFilters({ favoritesOnly: e.target.checked })}
                                className="peer appearance-none w-5 h-5 rounded border border-input bg-background checked:bg-emerald-500 checked:border-emerald-500 transition-colors cursor-pointer"
                            />
                            <svg className="absolute w-3.5 h-3.5 text-foreground pointer-events-none opacity-0 peer-checked:opacity-100 left-0.5 top-0.5" viewBox="0 0 14 14" fill="none">
                                <path d="M3 7L6 10L11 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </label>
                </div>

                {/* Automated Strategies */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest pl-1">Entry Signals</h3>

                    {[
                        { label: 'Oversold (RSI < 30)', sub: 'Dip Buy Opportunity', key: 'oversold', color: 'indigo' },
                        { label: 'Bollinger Low', sub: 'Price < Lower Band', key: 'bbLow', color: 'blue' },
                        { label: 'MACD Bullish', sub: 'Momentum Positive', key: 'macdBullish', color: 'lime' },
                    ].map((item) => (
                        <label key={item.key} className="flex items-center justify-between group cursor-pointer p-2.5 rounded-lg bg-muted/30 border border-border hover:border-border hover:bg-muted/50 transition-all">
                            <div>
                                <span className="text-foreground font-medium text-sm block">{item.label}</span>
                                <span className="text-[10px] text-muted-foreground font-medium">{item.sub}</span>
                            </div>
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    // @ts-expect-error - Filters object is dynamic
                                    checked={filters[item.key]}
                                    onChange={(e) => updateFilters({ [item.key]: e.target.checked })}
                                    className={`peer appearance-none w-5 h-5 rounded border border-input bg-background checked:bg-${item.color}-500 checked:border-${item.color}-500 transition-colors cursor-pointer`}
                                />
                                <svg className="absolute w-3.5 h-3.5 text-foreground pointer-events-none opacity-0 peer-checked:opacity-100 left-0.5 top-0.5" viewBox="0 0 14 14" fill="none">
                                    <path d="M3 7L6 10L11 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </label>
                    ))}
                </div>

                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest pl-1">Trend Confirmation</h3>
                    {[
                        { label: 'Golden Cross', sub: 'EMA 50 > EMA 200', key: 'goldenCross', color: 'amber' },
                        { label: 'Uptrend', sub: 'Price > EMA 20', key: 'aboveEma20', color: 'teal' },
                    ].map((item) => (
                        <label key={item.key} className="flex items-center justify-between group cursor-pointer p-2.5 rounded-lg bg-muted/30 border border-border hover:border-border hover:bg-muted/50 transition-all">
                            <div>
                                <span className="text-foreground font-medium text-sm block">{item.label}</span>
                                <span className="text-[10px] text-muted-foreground font-medium">{item.sub}</span>
                            </div>
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    // @ts-expect-error - Filters object is dynamic
                                    checked={filters[item.key]}
                                    onChange={(e) => updateFilters({ [item.key]: e.target.checked })}
                                    className={`peer appearance-none w-5 h-5 rounded border border-input bg-background checked:bg-${item.color}-500 checked:border-${item.color}-500 transition-colors cursor-pointer`}
                                />
                                <svg className="absolute w-3.5 h-3.5 text-foreground pointer-events-none opacity-0 peer-checked:opacity-100 left-0.5 top-0.5" viewBox="0 0 14 14" fill="none">
                                    <path d="M3 7L6 10L11 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </label>
                    ))}
                </div>

                {/* Technical Filters */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Manual Tuning</h3>

                    <div className="space-y-3 bg-muted/20 p-3 rounded-lg border border-border">
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-muted-foreground">RSI Range</span>
                            <span className="text-emerald-400 font-mono">{filters.minRsi} - {filters.maxRsi}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={filters.minRsi ?? 0}
                            onChange={(e) => updateFilters({ minRsi: parseInt(e.target.value) })}
                            className="w-full accent-emerald-500 h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={filters.maxRsi ?? 100}
                            onChange={(e) => updateFilters({ maxRsi: parseInt(e.target.value) })}
                            className="w-full accent-emerald-500 h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>

                {/* Proprietary Scores */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Bob&apos;s Intelligence</h3>

                    <div className="space-y-3 bg-muted/20 p-3 rounded-lg border border-border">
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-muted-foreground">Min Bob Score</span>
                            <span className="text-emerald-400 font-mono">{filters.minBobScore}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={filters.minBobScore ?? 0}
                            onChange={(e) => updateFilters({ minBobScore: parseInt(e.target.value) })}
                            className="w-full accent-emerald-500 h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-border bg-card backdrop-blur-sm shrink-0">
                <button
                    onClick={() => updateFilters({
                        minRsi: 0,
                        maxRsi: 100,
                        minBobScore: 0,
                        favoritesOnly: false,
                        oversold: false,
                        goldenCross: false,
                        aboveEma20: false,
                        macdBullish: false,
                        bbLow: false
                    })}
                    className="w-full py-2.5 px-4 rounded-lg bg-muted hover:bg-muted/80 text-xs font-bold uppercase tracking-wider transition-colors text-muted-foreground hover:text-foreground border border-border hover:border-input"
                >
                    Reset System
                </button>
            </div>
        </div>
    );
}
