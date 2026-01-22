'use client';

import React, { useState } from 'react';
import { ChartInstance } from './ChartInstance';
import { Button } from '../ui/Button';

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
            <div className="flex items-center justify-between p-4 bg-card border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">
                    {symbol} Analysis
                </h2>

                <div className="flex items-center gap-6">
                    {/* Master Strategy Dropdown */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">Master:</span>
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

                    {/* Chart Count */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium mr-2">Charts:</span>
                        <div className="flex items-center bg-muted p-1 rounded-lg border border-border/50 gap-1">
                            <Button
                                onClick={() => handleChartCountChange(1)}
                                variant={chartCount === 1 ? 'emerald' : 'ghost'}
                                size="sm"
                                className={`px-4 py-2 text-xs font-bold rounded-md transition-all duration-200 h-auto ${chartCount === 1
                                    ? 'shadow-sm ring-1 ring-emerald-500'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                    }`}
                            >
                                1
                            </Button>
                            <Button
                                onClick={() => handleChartCountChange(2)}
                                variant={chartCount === 2 ? 'emerald' : 'ghost'}
                                size="sm"
                                className={`px-4 py-2 text-xs font-bold rounded-md transition-all duration-200 h-auto ${chartCount === 2
                                    ? 'shadow-sm ring-1 ring-emerald-500'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                    }`}
                            >
                                2
                            </Button>
                            <Button
                                onClick={() => handleChartCountChange(3)}
                                variant={chartCount === 3 ? 'emerald' : 'ghost'}
                                size="sm"
                                className={`px-4 py-2 text-xs font-bold rounded-md transition-all duration-200 h-auto ${chartCount === 3
                                    ? 'shadow-sm ring-1 ring-emerald-500'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                    }`}
                            >
                                3
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div
                className={`flex-1 grid gap-4 px-4 pb-4 ${chartCount === 1
                    ? 'grid-cols-1'
                    : chartCount === 2
                        ? 'grid-cols-1 md:grid-cols-2'
                        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                    }`}
            >
                {/* Chart 1 - Always visible */}
                <ChartInstance
                    symbol={symbol}
                    initialTimeframe="1d"
                    strategy={strategies[0]}
                    onStrategyChange={(val) => handleStrategyChange(0, val)}
                    onZoomReset={zoomResetCounter}
                />

                {/* Chart 2 - Visible when chartCount >= 2 */}
                {chartCount >= 2 && (
                    <ChartInstance
                        symbol={symbol}
                        initialTimeframe="4h"
                        strategy={strategies[1]}
                        onStrategyChange={(val) => handleStrategyChange(1, val)}
                        onZoomReset={zoomResetCounter}
                    />
                )}

                {/* Chart 3 - Visible when chartCount === 3 */}
                {chartCount === 3 && (
                    <ChartInstance
                        symbol={symbol}
                        initialTimeframe="1h"
                        strategy={strategies[2]}
                        onStrategyChange={(val) => handleStrategyChange(2, val)}
                        onZoomReset={zoomResetCounter}
                    />
                )}
            </div>
        </div>
    );
}
