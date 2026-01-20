'use client';

import { useState } from 'react';
import { useUserStore } from '@/lib/store';
import { useFearAndGreed } from '@/lib/hooks/useFearAndGreed';
import { PanelRightClose, PanelRightOpen, Target, Zap, TrendingUp, Landmark, SlidersHorizontal, Brain } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import SignalMonitor from './SignalMonitor';
import SentimentWidget from './ui/SentimentWidget';
import { FilterSection, FilterCheckbox } from './ui/FilterSection';
import { Button } from './ui/Button';
import { Slider } from './ui/Slider';

interface AnalysisEngineProps {
    isOpen?: boolean;
    onToggle?: () => void;
}

export default function AnalysisEngine({ isOpen = true, onToggle }: AnalysisEngineProps) {
    const { settings, updateFilters, isLoaded } = useUserStore();
    const { data: fngData } = useFearAndGreed();

    // Accordion State
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        targeting: false,
        signals: false,
        ict: false,
        trend: false,
        manual: false,
        ai: false
    });

    const toggleSection = (key: string) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (!isLoaded) return <div className="p-4 text-muted-foreground animate-pulse">Loading...</div>;

    const { filters } = settings;

    return (
        <div className="flex flex-col h-full bg-card overflow-hidden">
            {/* Header Area with F&G and Alerts */}
            <div className={`border-b border-border bg-muted/10 shrink-0 flex flex-col transition-all duration-300 ${isOpen ? 'p-4 space-y-2' : 'p-2 space-y-2 items-center'}`}>

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
                    <div className={`flex items-center ${isOpen ? 'gap-2' : 'flex-col gap-2'}`}>
                        <ThemeToggle />

                        {onToggle && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onToggle}
                                className="h-9 w-9 text-muted-foreground hover:text-foreground p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                            >
                                {isOpen ? <PanelRightClose className="h-5 w-5 transition-all text-zinc-900 dark:text-zinc-100" /> : <PanelRightOpen className="h-5 w-5 transition-all text-zinc-900 dark:text-zinc-100" />}
                            </Button>
                        )}
                    </div>

                </div>

                {/* Fear & Greed Indicator */}
                <SentimentWidget data={fngData} isExpanded={isOpen} />
            </div>

            {/* Main Content - Always mounted for smooth transitions, controlled by opacity/visibility */}
            <div className={`flex-1 p-5 space-y-2 overflow-y-auto custom-scrollbar transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100 delay-100' : 'opacity-0 pointer-events-none'}`}>
                {/* Fixed width container to prevent reflow during squashing */}
                <div className="min-w-[280px] space-y-4">

                    {/* Targeting Section */}
                    <FilterSection id="targeting" title="Targeting" icon={Target} colorClass="text-foreground" isOpen={openSections.targeting} onToggle={toggleSection}>
                        <label className="flex items-center justify-between group cursor-pointer py-1 px-2 rounded hover:bg-muted/50 transition-all">
                            <span className="text-foreground font-medium text-xs">Favorites Only</span>
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    checked={filters.favoritesOnly}
                                    onChange={(e) => updateFilters({ favoritesOnly: e.target.checked })}
                                    className="peer appearance-none w-3.5 h-3.5 rounded border border-input bg-background checked:bg-emerald-500 checked:border-emerald-500 transition-colors cursor-pointer"
                                />
                                <svg className="absolute w-3 h-3 text-foreground pointer-events-none opacity-0 peer-checked:opacity-100 left-0 top-0.5" viewBox="0 0 14 14" fill="none">
                                    <path d="M3 7L6 10L11 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </label>
                    </FilterSection>

                    {/* Entry Signals */}
                    <FilterSection id="signals" title="Entry Signals" icon={Zap} colorClass="text-emerald-500" isOpen={openSections.signals} onToggle={toggleSection}>
                        {[
                            { label: 'Oversold', sub: 'RSI < 30', key: 'oversold', color: 'indigo' },
                            { label: 'Bollinger Low', sub: 'Price < Lower', key: 'bbLow', color: 'blue' },
                            { label: 'MACD Bullish', sub: 'Momentum +', key: 'macdBullish', color: 'lime' },
                        ].map((item) => (
                            <FilterCheckbox
                                key={item.key}
                                item={item}
                                // @ts-expect-error - Filters object is dynamic
                                checked={filters[item.key]}
                                onChange={(checked) => updateFilters({ [item.key]: checked })}
                            />
                        ))}
                    </FilterSection>

                    {/* Trend Confirmation */}
                    <FilterSection id="trend" title="Trend" icon={TrendingUp} colorClass="text-amber-500" isOpen={openSections.trend} onToggle={toggleSection}>
                        {[
                            { label: 'Golden Cross', sub: '50 > 200 EMA', key: 'goldenCross', color: 'amber' },
                            { label: 'Uptrend', sub: 'Price > 20 EMA', key: 'aboveEma20', color: 'teal' },
                        ].map((item) => (
                            <FilterCheckbox
                                key={item.key}
                                item={item}
                                // @ts-expect-error - Filters object is dynamic
                                checked={filters[item.key]}
                                onChange={(checked) => updateFilters({ [item.key]: checked })}
                            />
                        ))}
                    </FilterSection>

                    {/* ICT Smart Money */}
                    <FilterSection id="ict" title="ICT Smart Money" icon={Landmark} colorClass="text-violet-500" isOpen={openSections.ict} onToggle={toggleSection}>
                        {[
                            { label: 'Bullish Sweep', sub: 'Liquidity Grab', key: 'ictBullishSweep', color: 'emerald' },
                            { label: 'Bearish Sweep', sub: 'Liquidity Grab', key: 'ictBearishSweep', color: 'rose' },
                            { label: 'Bullish FVG', sub: 'Fair Value Gap', key: 'ictBullishFVG', color: 'emerald' },
                            { label: 'Bearish FVG', sub: 'Fair Value Gap', key: 'ictBearishFVG', color: 'rose' },
                        ].map((item) => (
                            <FilterCheckbox
                                key={item.key}
                                item={item}
                                // @ts-expect-error - Filters object is dynamic
                                checked={filters[item.key]}
                                onChange={(checked) => updateFilters({ [item.key]: checked })}
                            />
                        ))}
                    </FilterSection>

                    {/* Manual Tuning */}
                    <FilterSection id="manual" title="Manual Tuning" icon={SlidersHorizontal} colorClass="text-muted-foreground" isOpen={openSections.manual} onToggle={toggleSection}>
                        <div className="pl-2 pr-1 pt-1 pb-1 space-y-2">
                            <div className="space-y-1 px-2">
                                <div className="flex justify-between text-[10px] font-medium">
                                    <span className="text-muted-foreground">RSI Range</span>
                                    <span className="text-emerald-400 font-mono">{filters.minRsi} - {filters.maxRsi}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Slider
                                        min={0}
                                        max={100}
                                        value={filters.minRsi ?? 0}
                                        onChange={(e) => updateFilters({ minRsi: parseInt(e.target.value) })}
                                    />
                                    <Slider
                                        min={0}
                                        max={100}
                                        value={filters.maxRsi ?? 100}
                                        onChange={(e) => updateFilters({ maxRsi: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>
                    </FilterSection>

                    {/* Bob's Intelligence */}
                    <FilterSection id="ai" title="Bob's Intelligence" icon={Brain} colorClass="text-emerald-500" isOpen={openSections.ai} onToggle={toggleSection}>
                        <div className="pl-2 pr-1 pt-1 pb-1 space-y-2">
                            <div className="space-y-1 px-2">
                                <div className="flex justify-between text-[10px] font-medium">
                                    <span className="text-muted-foreground">Min Bob Score</span>
                                    <span className="text-emerald-400 font-mono">{filters.minBobScore}</span>
                                </div>
                                <Slider
                                    min={0}
                                    max={100}
                                    value={filters.minBobScore ?? 0}
                                    onChange={(e) => updateFilters({ minBobScore: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                    </FilterSection>

                </div>
            </div>

            {/* Reset Button - Also fade out */}
            <div className={`p-4 border-t border-border bg-card backdrop-blur-sm shrink-0 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <Button
                    variant="secondary"
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
                    className="w-full text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border hover:border-input"
                >
                    Reset System
                </Button>
            </div>

            {/* Logic Components */}
            <SignalMonitor />
        </div >
    );
}
