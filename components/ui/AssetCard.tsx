import { Asset, AssetTrends, UserSettings } from '@/lib/types';
import { Play } from 'lucide-react';
import { STRATEGIES } from '@/lib/engine/strategies';

interface AssetCardProps {
    asset: Asset;
    trend?: AssetTrends;
    isActive: boolean;
    settings: UserSettings;
    onAnalyze: (symbol: string) => void;
}

export default function AssetCard({
    asset,
    trend,
    isActive,
    settings,
    onAnalyze,
}: AssetCardProps) {

    // Helper to calculate bias for a specific timeframe set (simplified for card view)
    const getBias = () => {
        if (!trend?.strategies) return 'NEUTRAL';
        let bull = 0;
        let bear = 0;

        // Scan all visible strategies across all timeframes
        settings.visibleStrategies?.forEach(strat => {
            const stratData = trend.strategies?.[strat];
            if (stratData) {
                Object.values(stratData).forEach(sig => {
                    if (sig === 'LONG') bull++;
                    if (sig === 'SHORT') bear++;
                });
            }
        });

        if (bull > bear) return 'BULLISH';
        if (bear > bull) return 'BEARISH';
        return 'NEUTRAL';
    };

    const bias = getBias();
    const isConvergence = trend?.strategies?.['CONVERGENCE_OB'] &&
        Object.values(trend.strategies['CONVERGENCE_OB']).some(s => s === 'LONG' || s === 'SHORT');

    return (
        <div
            onClick={() => onAnalyze(asset.symbol)}
            className={`
                relative p-4 rounded-xl border mb-3 transition-all active:scale-[0.98]
                ${isActive
                    ? 'bg-emerald-500/10 border-emerald-500/50'
                    : 'bg-card border-border hover:border-emerald-500/30'
                }
            `}
        >
            {/* Header: Symbol & Price */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-foreground tracking-tight">
                            {asset.symbol}
                        </span>
                        {isConvergence && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 text-[9px] uppercase font-bold tracking-wider border border-amber-500/30">
                                Conv
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">{asset.name}</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="font-mono text-lg font-medium text-foreground tracking-tight">
                        ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </span>
                    {/* Bias Indicator */}
                    <div className={`
                        flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border
                        ${bias === 'BULLISH' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            bias === 'BEARISH' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                'bg-zinc-800 text-zinc-400 border-zinc-700'}
                    `}>
                        <div className={`w-1.5 h-1.5 rounded-full ${bias === 'BULLISH' ? 'bg-emerald-500 animate-pulse' :
                            bias === 'BEARISH' ? 'bg-rose-500 animate-pulse' : 'bg-zinc-500'
                            }`} />
                        {bias}
                    </div>
                </div>
            </div>

            {/* Active Strategy Signals (Badges) - Grouped for Clarity */}
            <div className="flex flex-col gap-2 mb-2">
                {/* 1. Bullish Signals */}
                <div className="flex flex-wrap gap-2">
                    {settings.visibleStrategies?.map(strategy => {
                        const stratData = trend?.strategies?.[strategy];
                        if (!stratData) return null;

                        // Check for Longs
                        const hasLong = Object.values(stratData).some(s => s === 'LONG');
                        if (!hasLong) return null;

                        return (
                            <div key={`${strategy}-long`} className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                                <span className="text-[10px] font-bold text-emerald-400">{STRATEGIES[strategy]?.displayName}</span>
                                <span className="text-[9px] font-extrabold px-1 py-0.5 bg-emerald-500 text-black rounded-sm leading-none">LONG</span>
                            </div>
                        );
                    })}
                </div>

                {/* 2. Bearish Signals */}
                <div className="flex flex-wrap gap-2">
                    {settings.visibleStrategies?.map(strategy => {
                        const stratData = trend?.strategies?.[strategy];
                        if (!stratData) return null;

                        // Check for Shorts
                        const hasShort = Object.values(stratData).some(s => s === 'SHORT');
                        if (!hasShort) return null;

                        return (
                            <div key={`${strategy}-short`} className="flex items-center gap-1.5 px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20">
                                <span className="text-[10px] font-bold text-rose-400">{STRATEGIES[strategy]?.displayName}</span>
                                <span className="text-[9px] font-extrabold px-1 py-0.5 bg-rose-500 text-white rounded-sm leading-none">SHORT</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Tap to Analyze Hint */}
            <div className="absolute right-4 bottom-4 opacity-0 group-active:opacity-100 transition-opacity">
                <Play className="w-4 h-4 text-emerald-500 fill-current" />
            </div>
        </div>
    );
}
