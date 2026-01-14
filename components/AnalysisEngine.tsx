'use client';

import { useState, useEffect } from 'react';
import { useUserStore } from '@/lib/store';
import { useAlerts } from '@/lib/hooks/useAlerts';
import { useMarketData } from '@/lib/hooks/useMarketData';
import { ChevronDown, ChevronRight, LucideIcon, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

interface AnalysisEngineProps {
    isOpen?: boolean;
    onToggle?: () => void;
}

export default function AnalysisEngine({ isOpen = true, onToggle }: AnalysisEngineProps) {
    const { settings, updateFilters, isLoaded, trends } = useUserStore();
    const { assets } = useMarketData();
    const { triggerAlert } = useAlerts();

    // Local state for Alerts (migrated from AssetScreener)
    const [alertsEnabled] = useState(false);

    // Accordion State
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        targeting: true,
        signals: true,
        ict: false,
        trend: false,
        manual: false,
        ai: false
    });

    const toggleSection = (key: string) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Monitor for God Mode Signals (Migrated from AssetScreener)
    useEffect(() => {
        if (!alertsEnabled) return;

        assets.forEach(asset => {
            const signal = asset.ictAnalysis?.signal;
            if (signal && signal !== 'NONE') {
                const trend = trends[asset.symbol];
                if (trend) {
                    const isBullish = signal.includes('BULLISH');
                    const isBearish = signal.includes('BEARISH');
                    // Alert if 4H trend aligns with signal (High Probability)
                    const aligned = (isBullish && trend.t4h === 'UP') || (isBearish && trend.t4h === 'DOWN');

                    if (aligned) {
                        triggerAlert(asset, signal);
                    }
                }
            }
        });
    }, [assets, alertsEnabled, trends, triggerAlert]);

    if (!isLoaded) return <div className="p-4 text-muted-foreground animate-pulse">Loading...</div>;

    const { filters } = settings;

    // Helper for Accordion Header
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const SectionHeader = ({ id, title, icon: Icon, colorClass }: { id: string, title: string, icon: LucideIcon, colorClass: string }) => (
        <button
            onClick={() => toggleSection(id)}
            className="flex items-center justify-between w-full p-3 bg-muted/20 hover:bg-muted/40 transition-colors rounded-lg group"
        >
            <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${colorClass}`} />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                    {title}
                </span>
            </div>
            {openSections[id] ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>
    );

    return (
        <div className="flex flex-col h-full bg-card overflow-hidden">
            {/* Header Area with F&G and Alerts */}
            <div className={`border-b border-border bg-muted/10 shrink-0 flex flex-col transition-all duration-300 ${isOpen ? 'p-4 space-y-4' : 'p-2 space-y-4 items-center'}`}>

                {/* Header Title & Actions Row */}
                <div className={`flex w-full items-center ${isOpen ? 'justify-between' : 'flex-col-reverse gap-4'}`}>

                    {/* Title (Hidden if closed) */}
                    {isOpen ? (
                        <h2 className="text-sm font-medium text-foreground tracking-tight flex items-center gap-2 uppercase">
                            <span className="w-1.5 h-1.5 rounded-sm bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                            Analysis Engine
                        </h2>
                    ) : null}

                    {/* Actions Group: Theme Toggle + Sidebar Toggle */}
                    <div className={`flex items-center ${isOpen ? 'gap-2' : 'flex-col gap-3'}`}>
                        <ThemeToggle />

                        {onToggle && (
                            <button
                                onClick={onToggle}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted rounded"
                                title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                            >
                                {isOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                            </button>
                        )}
                    </div>

                </div>

            </div>

            {/* Main Content - Always mounted for smooth transitions, controlled by opacity/visibility */}
            <div className={`flex-1 p-5 space-y-8 overflow-y-auto custom-scrollbar transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100 delay-100' : 'opacity-0 pointer-events-none'}`}>
                {/* Fixed width container to prevent reflow during squashing */}
                <div className="min-w-[280px]">
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

                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold text-violet-500/80 uppercase tracking-widest pl-1">ICT Smart Money</h3>
                        {[
                            { label: 'Bullish Sweep', sub: 'Liquidity Grab (Long)', key: 'ictBullishSweep', color: 'emerald' },
                            { label: 'Bearish Sweep', sub: 'Liquidity Grab (Short)', key: 'ictBearishSweep', color: 'rose' },
                            { label: 'Bullish FVG', sub: 'Fair Value Gap (Long)', key: 'ictBullishFVG', color: 'emerald' },
                            { label: 'Bearish FVG', sub: 'Fair Value Gap (Short)', key: 'ictBearishFVG', color: 'rose' },
                        ].map((item) => (
                            <label key={item.key} className="flex items-center justify-between group cursor-pointer p-2.5 rounded-lg bg-muted/30 border border-border hover:border-border hover:bg-muted/50 transition-all">
                                <div>
                                    <span className="text-foreground font-medium text-sm block">{item.label}</span>
                                    <span className="text-[10px] text-muted-foreground font-medium">{item.sub}</span>
                                </div>
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        checked={(filters as any)[item.key]}
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        onChange={(e) => updateFilters({ [item.key]: e.target.checked } as any)}
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
                    {/* Bob's Intelligence */}
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
            </div>

            {/* Reset Button - Also fade out */}
            <div className={`p-4 border-t border-border bg-card backdrop-blur-sm shrink-0 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
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
                        bbLow: false,
                        ictBullishSweep: false,
                        ictBearishSweep: false,
                        ictBullishFVG: false,
                        ictBearishFVG: false
                    })}
                    className="w-full py-2.5 px-4 rounded-lg bg-muted hover:bg-muted/80 text-xs font-bold uppercase tracking-wider transition-colors text-muted-foreground hover:text-foreground border border-border hover:border-input"
                >
                    Reset System
                </button>
            </div>
        </div>
    );
}
