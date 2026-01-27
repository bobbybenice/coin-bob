'use client';

import React, { useState } from 'react';
import { ChartInstance } from './ChartInstance';
import { Button } from '../ui/Button';
import { InfoTooltip } from '../ui/InfoTooltip';

interface MultiChartViewProps {
    symbol: string;
}

import { StrategyName } from '@/lib/types';

/**
 * Multi-chart view with 1, 2, or 3 charts side-by-side
 */
import { getAllStrategyNames, getStrategy } from '@/lib/engine/strategies'; // Import helpers
import { ChevronDown } from 'lucide-react'; // Import Icon

/**
 * Multi-chart view with 1, 2, or 3 charts side-by-side
 */
export function MultiChartView({ symbol }: MultiChartViewProps) {
    const [chartCount, setChartCount] = useState<1 | 2 | 3>(1);
    const [zoomResetCounter, setZoomResetCounter] = useState(0);
    const [isScalpMode, setIsScalpMode] = useState(false);

    // State for individual chart strategies
    // Initialize with standard defaults
    const [strategies, setStrategies] = useState<(StrategyName | null)[]>([
        'RSI_MFI',
        'BOLLINGER_BOUNCE',
        'VOLUME_BREAKOUT'
    ]);

    const [masterStrategy, setMasterStrategy] = useState<StrategyName | ''>('');
    // We keep master dropdown value separately to allow "Select..." state or keep it empty if charts differ?
    // User wants a dropdown to "update... simultaneously". It acts like a trigger.

    // Reset zoom when chart count changes
    const handleChartCountChange = (count: 1 | 2 | 3) => {
        setChartCount(count);
        setZoomResetCounter(prev => prev + 1);

        // When chart 2 or 3 is added (and wasn't visible), sync its strategy to Chart 1?
        // Logic from previous step: "New chart should inherit strategy from initial chart"
        // Since we now have permanent state for 3 slots, we can update slots [1] and [2] to match [0] if we want "sync"
        // But the user's specific request "Chart Sync" was met. Now we just ensure state is consistent.
        // Actually, let's keep the sync logic: If expanding count, copy Slot 0 to new slots? 
        // Or simpler: Just rely on the state we already have.
        // Let's implement the "Sync" logic: If we go from 1 -> 2, set strategy[1] = strategy[0].
        if (count > chartCount) {
            setStrategies(prev => {
                const newStats = [...prev];
                // If expanding, sync new visible charts to Chart 1
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
        setMasterStrategy(''); // Reset master if individual changed (optional UX)
    };

    const handleMasterStrategyChange = (newStrategy: StrategyName | null) => {
        setMasterStrategy(newStrategy || '');
        // Update ALL charts
        if (newStrategy) {
            setStrategies([newStrategy, newStrategy, newStrategy]);
        }
    };

    const allStrategyNames = getAllStrategyNames();

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Header Controls */}
            <div className="flex items-center justify-end p-4 bg-card border-b border-border">


                <div className="flex items-center gap-6">
                    {/* Master Strategy Dropdown */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center">
                            <InfoTooltip content="Select a strategy to apply it to ALL active charts simultaneously." />
                        </div>
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
                    </div>

                    <div className="h-4 w-px bg-border/50"></div>

                    {/* Scalp Mode Toggle */}
                    <label className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity select-none">
                        <input
                            type="checkbox"
                            checked={isScalpMode}
                            onChange={(e) => {
                                const enabled = e.target.checked;
                                setIsScalpMode(enabled);
                                if (enabled) {
                                    // Sync all charts to the main chart's strategy
                                    setStrategies([strategies[0], strategies[0], strategies[0]]);
                                }
                            }}
                            className="w-3.5 h-3.5 rounded border-zinc-600 bg-transparent text-emerald-500 focus:ring-0 focus:ring-offset-0"
                        />
                        <span className="text-xs font-medium text-muted-foreground">Scalp Mode</span>
                    </label>

                    <div className="h-4 w-px bg-border/50"></div>

                    {/* Chart Count */}
                    <div className="flex items-center gap-2">
                        <div className={`flex items-center bg-muted p-1 rounded-lg border border-border/50 gap-1 ${isScalpMode ? 'opacity-50 pointer-events-none' : ''}`}>
                            {Array.from({ length: 3 }, (_, i) => i + 1).map((count) => (
                                <Button
                                    key={count}
                                    onClick={() => handleChartCountChange(count as 1 | 2 | 3)}
                                    // Visual fix: If Scalp Mode is on, we force look of 3 but allow toggle to be "disabled" visually
                                    // Actually, let's show 3 active if scalp mode 
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
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div
                className={`flex-1 grid gap-4 px-4 pb-4 ${isScalpMode || chartCount === 3
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                    : chartCount === 2
                        ? 'grid-cols-1 md:grid-cols-2'
                        : 'grid-cols-1'
                    }`}
            >
                {/* Chart 1 - Always visible */}
                <ChartInstance
                    symbol={symbol}
                    initialTimeframe="1d"
                    timeframe={isScalpMode ? '1h' : undefined}
                    strategy={strategies[0]}
                    onStrategyChange={(val) => handleStrategyChange(0, val)}
                    onZoomReset={zoomResetCounter}
                />

                {/* Chart 2 - Visible when chartCount >= 2 */}
                {(isScalpMode || chartCount >= 2) && (
                    <ChartInstance
                        symbol={symbol}
                        initialTimeframe="4h"
                        timeframe={isScalpMode ? '15m' : undefined}
                        strategy={strategies[1]}
                        onStrategyChange={(val) => handleStrategyChange(1, val)}
                        onZoomReset={zoomResetCounter}
                    />
                )}

                {/* Chart 3 - Visible when chartCount === 3 */}
                {(isScalpMode || chartCount === 3) && (
                    <ChartInstance
                        symbol={symbol}
                        initialTimeframe="1h"
                        timeframe={isScalpMode ? '5m' : undefined}
                        strategy={strategies[2]}
                        onStrategyChange={(val) => handleStrategyChange(2, val)}
                        onZoomReset={zoomResetCounter}
                    />
                )}
            </div>
        </div>
    );
}
