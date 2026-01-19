'use client';

import React, { useState } from 'react';
import { ChartInstance } from './ChartInstance';

interface MultiChartViewProps {
    symbol: string;
}

/**
 * Multi-chart view with 1, 2, or 3 charts side-by-side
 */
export function MultiChartView({ symbol }: MultiChartViewProps) {
    const [chartCount, setChartCount] = useState<1 | 2 | 3>(1);
    const [zoomResetCounter, setZoomResetCounter] = useState(0);

    // Reset zoom when chart count changes
    const handleChartCountChange = (count: 1 | 2 | 3) => {
        setChartCount(count);
        setZoomResetCounter(prev => prev + 1);
    };

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Chart Count Toggle */}
            <div className="flex items-center justify-between p-4 bg-card border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">
                    {symbol} Analysis
                </h2>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium mr-2">Charts:</span>
                    <div className="flex items-center bg-muted p-1 rounded-lg border border-border/50 gap-1">
                        <button
                            onClick={() => handleChartCountChange(1)}
                            className={`px-4 py-2 text-xs font-bold rounded-md transition-all duration-200 ${chartCount === 1
                                    ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                }`}
                        >
                            1
                        </button>
                        <button
                            onClick={() => handleChartCountChange(2)}
                            className={`px-4 py-2 text-xs font-bold rounded-md transition-all duration-200 ${chartCount === 2
                                    ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                }`}
                        >
                            2
                        </button>
                        <button
                            onClick={() => handleChartCountChange(3)}
                            className={`px-4 py-2 text-xs font-bold rounded-md transition-all duration-200 ${chartCount === 3
                                    ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                }`}
                        >
                            3
                        </button>
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
                    initialStrategy="RSI_MFI"
                    onZoomReset={zoomResetCounter}
                />

                {/* Chart 2 - Visible when chartCount >= 2 */}
                {chartCount >= 2 && (
                    <ChartInstance
                        symbol={symbol}
                        initialTimeframe="4h"
                        initialStrategy="BOLLINGER_BOUNCE"
                        onZoomReset={zoomResetCounter}
                    />
                )}

                {/* Chart 3 - Visible when chartCount === 3 */}
                {chartCount === 3 && (
                    <ChartInstance
                        symbol={symbol}
                        initialTimeframe="1h"
                        initialStrategy="VOLUME_BREAKOUT"
                        onZoomReset={zoomResetCounter}
                    />
                )}
            </div>
        </div>
    );
}
