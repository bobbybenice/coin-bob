'use client';

import { useState } from 'react';
import { useUserStore } from '@/lib/store';
import { useFearAndGreed } from '@/lib/hooks/useFearAndGreed';
import { PanelRightClose, PanelRightOpen, Layers } from 'lucide-react';
import { STRATEGIES, getAllStrategyNames } from '@/lib/engine/strategies';
import { ThemeToggle } from '@/components/theme-toggle';
import SignalMonitor from './SignalMonitor';
import SentimentWidget from './ui/SentimentWidget';
import { FilterSection } from './ui/FilterSection';
import { Button } from './ui/Button';

interface AnalysisEngineProps {
    isOpen?: boolean;
    onToggle?: () => void;
}

export default function AnalysisEngine({ isOpen = true, onToggle }: AnalysisEngineProps) {
    const { settings, isLoaded, toggleVisibleStrategy, toggleAllStrategies } = useUserStore();
    const { data: fngData } = useFearAndGreed();

    // Accordion State
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        strategies: true
    });

    const toggleSection = (key: string) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleClearCache = () => {
        if (confirm('Are you sure? This will reset all settings and cache.')) {
            localStorage.clear();
            window.location.reload();
        }
    };

    if (!isLoaded) return <div className="p-4 text-muted-foreground animate-pulse">Loading...</div>;

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
                            Analysis Engine <span className="text-[10px] text-muted-foreground ml-2">v2.3</span>
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

                    {/* Strategies (Screener Columns) */}
                    <FilterSection id="strategies" title="Strategies" icon={Layers} colorClass="text-zinc-400" isOpen={openSections.strategies} onToggle={toggleSection}>
                        <div className="flex justify-between items-center px-2 pb-2 mb-2 border-b border-border/50">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Visibility</span>
                            <button
                                onClick={() => {
                                    const allNames = getAllStrategyNames();
                                    const allSelected = allNames.every(n => settings.visibleStrategies?.includes(n));
                                    toggleAllStrategies(!allSelected, allNames);
                                }}
                                className="cursor-pointer text-[10px] bg-secondary/50 hover:bg-secondary text-foreground px-2 py-0.5 rounded transition-colors"
                            >
                                {getAllStrategyNames().every(n => settings.visibleStrategies?.includes(n)) ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        {getAllStrategyNames().map((name) => (
                            <div key={name} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50 transition-all cursor-pointer group" onClick={() => toggleVisibleStrategy(name)}>
                                <span className="text-foreground font-medium text-xs">{STRATEGIES[name].displayName}</span>
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={settings.visibleStrategies?.includes(name)}
                                        onChange={() => { }} // Handled by div click
                                        className="peer appearance-none w-3.5 h-3.5 rounded border border-input bg-background checked:bg-zinc-500 checked:border-zinc-500 transition-colors pointer-events-none"
                                    />
                                    <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 left-0 top-0.5" viewBox="0 0 14 14" fill="none">
                                        <path d="M3 7L6 10L11 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        ))}
                    </FilterSection>

                </div>
            </div>

            {/* Footer Actions */}
            <div className={`p-4 border-t border-border bg-card backdrop-blur-sm shrink-0 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <Button
                    variant="secondary"
                    onClick={handleClearCache}
                    className="w-full text-xs font-bold uppercase tracking-wider text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/50"
                >
                    Clear Cache & Reload
                </Button>
            </div>

            {/* Logic Components */}
            <SignalMonitor />
        </div >
    );
}
