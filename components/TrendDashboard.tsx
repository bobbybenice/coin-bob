'use client';

import { Asset, TrendDirection } from '@/lib/types';
import { useTrendsStore } from '@/lib/store';
import { useTrendScanner } from '@/lib/hooks/useTrendScanner';

interface TrendDashboardProps {
    symbol: string;
}

export function TrendDashboard({ symbol }: TrendDashboardProps) {
    // Construct minimal asset for scanner
    // generic Asset fields are not used by the scanner for fetching
    const asset: Asset = {
        id: symbol,
        symbol,
        name: symbol,
        price: 0,
        change24h: 0,
        volume24h: 0,
        marketCap: 0,
        rsi: 0,
        isPerpetual: true
    };

    // Force scanner to run for this asset
    useTrendScanner([asset]);

    const { trends } = useTrendsStore();
    const assetTrend = trends[symbol];

    // Helper to get color and icon
    const getTrendDisplay = (trend?: TrendDirection) => {
        if (trend === 'UP') return { color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: '↑', label: 'BULLISH' };
        if (trend === 'DOWN') return { color: 'text-rose-400', bg: 'bg-rose-400/10', icon: '↓', label: 'BEARISH' };
        return { color: 'text-slate-400', bg: 'bg-slate-800/50', icon: '-', label: 'NEUTRAL' };
    };

    const timeframes = [
        { label: '15m', value: assetTrend?.t15m },
        { label: '1H', value: assetTrend?.t1h },
        { label: '4H', value: assetTrend?.t4h },
        { label: '1D', value: assetTrend?.t1d },
    ];

    return (
        <div className="grid grid-cols-4 gap-2 w-full">
            {timeframes.map((tf) => {
                const { color, bg, icon } = getTrendDisplay(tf.value);
                return (
                    <div
                        key={tf.label}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border border-white/5 ${bg} transition-all hover:bg-opacity-20 aspect-square`}
                    >
                        <span className="text-[10px] font-bold text-muted-foreground mb-1">{tf.label}</span>
                        <span className={`text-xl leading-none ${color}`}>{icon}</span>
                    </div>
                );
            })}
        </div>
    );
}
