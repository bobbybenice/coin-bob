'use client';

import { Play } from 'lucide-react';
import { Asset, AssetTrends } from '@/lib/types';
import { Button } from './Button';

interface AssetRowProps {
    asset: Asset;
    trend?: AssetTrends;
    isActive: boolean;
    isFuturesMode: boolean;
    settings: {
        favorites: string[];
        timeframe: string;
    };
    onToggleFavorite: (id: string) => void;
    onAnalyze: (symbol: string) => void;
}

export default function AssetRow({
    asset,
    trend,
    isActive,
    isFuturesMode,
    settings,
    onToggleFavorite,
    onAnalyze,
}: AssetRowProps) {
    const isGolden = asset.ema50 && asset.ema200 && asset.ema50 > asset.ema200;
    const isUptrend = asset.ema20 && asset.price > asset.ema20;
    const macdVal = asset.macd?.histogram;
    const isMacd = macdVal && macdVal > 0;
    const signal = asset.ictAnalysis?.signal;

    return (
        <tr
            className={`group transition-colors ${isActive ? 'bg-emerald-500/10' : 'hover:bg-muted/50'}`}
        >
            <td className="py-2.5 px-2 lg:px-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted ring-1 ring-border flex items-center justify-center text-[10px] font-bold text-muted-foreground group-hover:text-foreground group-hover:ring-emerald-500/30 transition-all">
                        {asset.symbol[0]}
                    </div>
                    <div>
                        <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            {asset.symbol}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-medium">{asset.name}</div>
                    </div>
                </div>
            </td>
            <td className="py-2.5 px-4 w-32 text-right font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors tabular-nums">
                ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </td>
            <td className={`py-2.5 px-4 text-right font-mono text-sm font-medium ${asset.change24h >= 0 ? 'text-up' : 'text-down'}`}>
                {asset.change24h > 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
            </td>

            {isFuturesMode ? (
                <>
                    <td className={`py-2.5 px-4 text-right font-mono text-sm font-medium ${(asset.fundingRate || 0) > 0.01 ? 'text-up' :
                        (asset.fundingRate || 0) < 0 ? 'text-down' : 'text-muted-foreground'
                        }`}>
                        {(asset.fundingRate || 0).toFixed(4)}%
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-sm text-muted-foreground">
                        {asset.openInterest ? `$${(asset.openInterest).toLocaleString()}` : '-'}
                    </td>
                </>
            ) : (
                <td className="py-2.5 px-4 w-32 text-right font-mono text-sm text-muted-foreground tabular-nums">
                    <span className="text-foreground font-medium">{(asset.volume24h / 1000000).toFixed(1)}</span>
                    <span className="text-zinc-600 text-xs ml-0.5">M</span>
                </td>
            )}
            <td className="py-2.5 px-4 text-center">
                <div className="flex items-center justify-center gap-1">
                    {/* 4H */}
                    <div className={`w-3 h-3 rounded-sm ${trend?.t4h === 'UP' ? 'bg-up' : trend?.t4h === 'DOWN' ? 'bg-down' : 'bg-zinc-800'}`} title="4H Trend" />
                    {/* 1H */}
                    <div className={`w-3 h-3 rounded-sm ${trend?.t1h === 'UP' ? 'bg-up' : trend?.t1h === 'DOWN' ? 'bg-down' : 'bg-zinc-800'}`} title="1H Trend" />
                    {/* 15m */}
                    <div className={`w-3 h-3 rounded-sm ${trend?.t15m === 'UP' ? 'bg-up' : trend?.t15m === 'DOWN' ? 'bg-down' : 'bg-zinc-800'}`} title="15m Trend" />
                </div>
            </td>
            <td className="py-2.5 px-4 text-center">
                <div className="flex items-center justify-center gap-1">
                    {/* 4H */}
                    <div className={`w-6 h-5 rounded flex items-center justify-center text-[9px] font-mono font-bold ${(trend?.rsi4h ?? 50) < 30 ? 'bg-up/20 text-up border border-up/30' :
                        (trend?.rsi4h ?? 50) > 70 ? 'bg-down/20 text-down border border-down/30' :
                            'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50'}`}
                        title="4H RSI">
                        {(!trend?.rsi4h || isNaN(trend?.rsi4h as number)) ? '-' : trend?.rsi4h?.toFixed(0)}
                    </div>
                    {/* 1H */}
                    <div className={`w-6 h-5 rounded flex items-center justify-center text-[9px] font-mono font-bold ${(trend?.rsi1h ?? 50) < 30 ? 'bg-up/20 text-up border border-up/30' :
                        (trend?.rsi1h ?? 50) > 70 ? 'bg-down/20 text-down border border-down/30' :
                            'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50'}`}
                        title="1H RSI">
                        {(!trend?.rsi1h || isNaN(trend?.rsi1h as number)) ? '-' : trend?.rsi1h?.toFixed(0)}
                    </div>
                    {/* 15m */}
                    <div className={`w-6 h-5 rounded flex items-center justify-center text-[9px] font-mono font-bold ${(trend?.rsi15m ?? 50) < 30 ? 'bg-up/20 text-up border border-up/30' :
                        (trend?.rsi15m ?? 50) > 70 ? 'bg-down/20 text-down border border-down/30' :
                            'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50'}`}
                        title="15m RSI">
                        {(!trend?.rsi15m || isNaN(trend?.rsi15m as number)) ? '-' : trend?.rsi15m?.toFixed(0)}
                    </div>
                </div>
            </td>
            <td className="py-2.5 px-4 text-center">
                <div className="flex items-center justify-center gap-1">
                    {/* 4H MFI */}
                    <div className={`w-6 h-5 rounded flex items-center justify-center text-[9px] font-mono font-bold ${(trend?.mfi4h ?? 50) < 20 ? 'bg-up/20 text-up border border-up/30' :
                        (trend?.mfi4h ?? 50) > 80 ? 'bg-down/20 text-down border border-down/30' :
                            'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50'}`}
                        title="4H MFI">
                        {(!trend?.mfi4h || isNaN(trend?.mfi4h as number)) ? '-' : trend?.mfi4h?.toFixed(0)}
                    </div>
                    {/* 1H MFI */}
                    <div className={`w-6 h-5 rounded flex items-center justify-center text-[9px] font-mono font-bold ${(trend?.mfi1h ?? 50) < 20 ? 'bg-up/20 text-up border border-up/30' :
                        (trend?.mfi1h ?? 50) > 80 ? 'bg-down/20 text-down border border-down/30' :
                            'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50'}`}
                        title="1H MFI">
                        {(!trend?.mfi1h || isNaN(trend?.mfi1h as number)) ? '-' : trend?.mfi1h?.toFixed(0)}
                    </div>
                    {/* 15m MFI */}
                    <div className={`w-6 h-5 rounded flex items-center justify-center text-[9px] font-mono font-bold ${(trend?.mfi15m ?? 50) < 20 ? 'bg-up/20 text-up border border-up/30' :
                        (trend?.mfi15m ?? 50) > 80 ? 'bg-down/20 text-down border border-down/30' :
                            'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50'}`}
                        title="15m MFI">
                        {(!trend?.mfi15m || isNaN(trend?.mfi15m as number)) ? '-' : trend?.mfi15m?.toFixed(0)}
                    </div>
                </div>
            </td>
            <td className="py-2.5 px-4 text-center">
                <div className="flex items-center justify-center gap-2">
                    {/* RSI Indicator */}
                    <div className="flex flex-col items-center gap-0.5 group/ind">
                        <span className="text-[8px] text-zinc-600 font-mono group-hover/ind:text-zinc-400">RSI</span>
                        <div className={`w-2 h-2 rounded-full ${isNaN(asset.rsi) ? 'bg-zinc-800' : asset.rsi < 30 ? 'bg-up animate-pulse shadow-[0_0_5px_currentColor]' : asset.rsi > 70 ? 'bg-down shadow-[0_0_5px_currentColor]' : 'bg-zinc-800'}`} />
                    </div>
                    {/* MACD Indicator */}
                    <div className="flex flex-col items-center gap-0.5 group/ind">
                        <span className="text-[8px] text-zinc-600 font-mono group-hover/ind:text-zinc-400">MCD</span>
                        <div className={`w-2 h-2 rounded-full ${(macdVal === undefined || isNaN(macdVal)) ? 'bg-zinc-800' : isMacd ? 'bg-up' : 'bg-rose-800'}`} />
                    </div>
                    {/* Trend Indicator */}
                    <div className="flex flex-col items-center gap-0.5 group/ind">
                        <span className="text-[8px] text-zinc-600 font-mono group-hover/ind:text-zinc-400">TRD</span>
                        <div className={`w-2 h-2 rounded-full ${isGolden ? 'bg-amber-400 animate-pulse' : isUptrend ? 'bg-up' : 'bg-zinc-800'}`} />
                    </div>
                    {/* ICT Indicator */}
                    <div className="flex flex-col items-center gap-0.5 group/ind">
                        <span className="text-[8px] text-zinc-600 font-mono group-hover/ind:text-zinc-400">ICT</span>
                        <div className={`w-2 h-2 rounded-full ${signal?.includes('BULLISH') ? 'bg-up shadow-[0_0_8px_currentColor]' : signal?.includes('BEARISH') ? 'bg-down shadow-[0_0_8px_currentColor]' : 'bg-zinc-800'}`} />
                    </div>
                </div>
            </td>
            <td className="py-2.5 px-4 text-right">
                <div className="flex justify-end">
                    <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-1 ring-inset ${asset.bobScore > 60 ? 'bg-up/10 text-up ring-up/30' :
                        asset.bobScore < 40 ? 'bg-down/10 text-down ring-down/20' :
                            'bg-muted text-muted-foreground ring-border'
                        }`}>
                        {asset.bobScore.toFixed(0)}
                    </div>
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

                    {/* Favorite Star */}
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(asset.id); }}
                        className={`h-8 w-8 transition-all ${settings.favorites.includes(asset.id)
                            ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }`}
                        title="Favorite"
                    >
                        {settings.favorites.includes(asset.id) ? '★' : '☆'}
                    </Button>
                </div>
            </td>
        </tr>
    );
}
