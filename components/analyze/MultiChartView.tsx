'use client';

import React from 'react';
import { ChartInstance } from './ChartInstance';

interface MultiChartViewProps {
    symbol: string;
    chartCount: 1 | 2 | 3;
    isScalpMode: boolean;
    strategies: (StrategyName | null)[];
    onStrategyChange: (index: number, strategy: StrategyName | null) => void;
    zoomResetCounter: number;
}

import { StrategyName } from '@/lib/types';

/**
 * Multi-chart view with 1, 2, or 3 charts side-by-side
 * Now a controlled component - all state managed by parent
 */
export function MultiChartView({
    symbol,
    chartCount,
    isScalpMode,
    strategies,
    onStrategyChange,
    zoomResetCounter
}: MultiChartViewProps) {

    return (
        <div className="flex flex-col h-full">
            {/* Charts Grid */}
            <div
                className={`h-full grid gap-4 ${isScalpMode || chartCount === 3
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
                    onStrategyChange={(val) => onStrategyChange(0, val)}
                    onZoomReset={zoomResetCounter}
                />

                {/* Chart 2 - Visible when chartCount >= 2 */}
                {(isScalpMode || chartCount >= 2) && (
                    <ChartInstance
                        symbol={symbol}
                        initialTimeframe="4h"
                        timeframe={isScalpMode ? '15m' : undefined}
                        strategy={strategies[1]}
                        onStrategyChange={(val) => onStrategyChange(1, val)}
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
                        onStrategyChange={(val) => onStrategyChange(2, val)}
                        onZoomReset={zoomResetCounter}
                    />
                )}
            </div>
        </div>
    );
}
