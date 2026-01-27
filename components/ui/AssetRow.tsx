import { Play } from 'lucide-react';
import { Asset, AssetTrends, UserSettings } from '@/lib/types';
import { Button } from './Button';

interface AssetRowProps {
    asset: Asset;
    trend?: AssetTrends;
    isActive: boolean;
    settings: UserSettings;
    onAnalyze: (symbol: string) => void;
}

export default function AssetRow({
    asset,
    trend,
    isActive,
    settings,
    onAnalyze,
}: AssetRowProps) {
    // Score Overlay Logic Removed --


    return (
        <tr
            className={`group transition-colors ${isActive ? 'bg-emerald-500/10' : 'hover:bg-muted/50'}`}
        >
            <td className="py-2.5 px-2 lg:px-4">
                <div className="flex flex-col">
                    <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        {asset.symbol}
                        {trend?.strategies?.['CONVERGENCE_OB'] && Object.values(trend.strategies['CONVERGENCE_OB']).some(s => s === 'LONG' || s === 'SHORT') && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 text-[9px] uppercase font-bold tracking-wider border border-amber-500/30">
                                Convergence
                            </span>
                        )}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium">{asset.name}</div>
                </div>
            </td>
            <td className="py-2.5 px-4 w-32 text-right font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors tabular-nums">
                ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </td>

            {/* Dynamic Strategy Columns */}
            {
                settings.visibleStrategies?.map((strategy) => (
                    <td key={strategy} className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                            {['5m', '15m', '30m', '1h', '4h', '1d'].map((tf) => {
                                const signal = trend?.strategies?.[strategy]?.[tf];
                                if (!signal) {
                                    // Loading State
                                    return (
                                        <div
                                            key={tf}
                                            title="Analyzing..."
                                            className="w-2 h-2 rounded-full bg-zinc-800 animate-pulse border border-white/5"
                                        />
                                    );
                                }
                                return (
                                    <div
                                        key={tf}
                                        title={`${strategy} (${tf}): ${signal || 'NEUTRAL'}`}
                                        className={`w-2 h-2 rounded-full ${signal === 'LONG' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' :
                                            signal === 'SHORT' ? 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]' :
                                                'bg-zinc-800'
                                            }`}
                                    />
                                );
                            })}
                        </div>
                    </td>
                ))
            }

            {/* Bias / Consensus Column */}
            <td className="py-2.5 px-4 text-center border-l border-white/5 bg-black/20">
                <div className="flex items-center justify-center gap-1">
                    {['5m', '15m', '30m', '1h', '4h', '1d'].map((tf) => {
                        // Calculate Consensus
                        let bull = 0;
                        let bear = 0;
                        let neutral = 0;
                        let hasData = false;

                        if (trend && trend.strategies) {
                            hasData = true;
                            Object.values(trend.strategies).forEach(stratMap => {
                                const sig = stratMap[tf];
                                if (sig === 'LONG') bull++;
                                else if (sig === 'SHORT') bear++;
                                else neutral++;
                            });
                        }

                        if (!hasData) {
                            return (
                                <div
                                    key={tf}
                                    title="Calculating Bias..."
                                    className="w-2.5 h-2.5 rounded-full ring-1 ring-black/50 bg-zinc-700/50 animate-pulse"
                                />
                            );
                        }

                        // Determine Bias using simple majority rule
                        // Show bullish if more LONG than SHORT (neutral doesn't matter)
                        // Show bearish if more SHORT than LONG (neutral doesn't matter)
                        // Only show neutral if equal or no directional signals

                        let finalSignal = 'NEUTRAL';
                        if (bull > bear) {
                            finalSignal = 'BULLISH';
                        } else if (bear > bull) {
                            finalSignal = 'BEARISH';
                        }
                        // If bull === bear, stays NEUTRAL

                        return (
                            <div
                                key={tf}
                                title={`BIAS (${tf}): ${finalSignal} (Bull:${bull} Bear:${bear} Neut:${neutral})`}
                                className={`w-2.5 h-2.5 rounded-full ring-1 ring-black/50 transition-all ${finalSignal === 'BULLISH' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]' :
                                    finalSignal === 'BEARISH' ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]' :
                                        'bg-zinc-700 opacity-40'
                                    }`}
                            />
                        );
                    })}
                </div>
            </td>

            <td className="py-2.5 px-4 text-center">
                <div className="flex items-center justify-center gap-2">
                    {/* Play Button - Navigate to Analyze */}
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAnalyze(asset.symbol);
                        }}
                        className="h-8 w-8 text-up bg-up/10 hover:bg-up/20 hover:scale-110 transition-all"
                        title="Analyze"
                    >
                        <Play className="w-4 h-4 fill-current" />
                    </Button>
                </div>
            </td>
        </tr >
    );
}
