'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { Asset, AssetTrends, UserSettings } from '@/lib/types';
import { Button } from './Button';
import { ScoreOverlay } from './ScoreOverlay';

interface AssetRowProps {
    asset: Asset;
    trend?: AssetTrends;
    isActive: boolean;
    isFuturesMode: boolean;
    settings: UserSettings;
    onAnalyze: (symbol: string) => void;
}

export default function AssetRow({
    asset,
    trend,
    isActive,
    // isFuturesMode, // Unused
    settings,
    onAnalyze,
}: AssetRowProps) {
    const [overlay, setOverlay] = useState<{ show: boolean, x: number, y: number } | null>(null);

    const handleScoreClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (overlay?.show) {
            setOverlay(null);
        } else {
            setOverlay({ show: true, x: e.clientX, y: e.clientY });
        }
    };

    return (
        <tr
            className={`group transition-colors ${isActive ? 'bg-emerald-500/10' : 'hover:bg-muted/50'}`}
        >
            <td className="py-2.5 px-2 lg:px-4">
                <div className="flex flex-col">
                    <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        {asset.symbol}
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

            <td className="py-2.5 px-4 text-center cursor-pointer" onClick={handleScoreClick}>
                <div className="flex items-center justify-center">
                    {/* NOISE REDUCTION: Only show signal if Trigger is active */}
                    {asset.trigger && asset.bobScore >= 70 ? (
                        <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 whitespace-nowrap shadow-[0_0_10px_rgba(16,185,129,0.2)] animate-pulse">
                            STRONG BUY
                        </div>
                    ) : asset.trigger && asset.bobScore <= 30 ? (
                        <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-500 border border-rose-500/30 whitespace-nowrap shadow-[0_0_10px_rgba(244,63,94,0.2)] animate-pulse">
                            STRONG SELL
                        </div>
                    ) : (
                        <div className="text-[10px] font-mono text-zinc-700 select-none">
                            WAIT
                        </div>
                    )}
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

                    {/* Render Overlay inside a Portal-like behavior (fixed) but structurally valid */}
                    {overlay && overlay.show && (
                        <>
                            <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={(e) => { e.stopPropagation(); setOverlay(null); }} />
                            <ScoreOverlay
                                score={asset.bobScore}
                                breakdown={asset.scoreBreakdown || []}
                                onClose={() => setOverlay(null)}
                                position={{ x: overlay.x, y: overlay.y }}
                            />
                        </>
                    )}
                </div>
            </td>
        </tr >
    );
}
