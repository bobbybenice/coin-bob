import React from 'react';
import { ScoreComponent } from '@/lib/types';
import { X, TrendingUp, TrendingDown, Activity, Layers } from 'lucide-react';

interface ScoreOverlayProps {
    score: number;
    breakdown: ScoreComponent[];
    onClose: () => void;
    position: { x: number; y: number };
}

export function ScoreOverlay({ score, breakdown, onClose, position }: ScoreOverlayProps) {
    return (
        <div
            className="fixed z-50 w-80 bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            style={{
                top: Math.min(window.innerHeight - 400, position.y + 10),
                left: Math.min(window.innerWidth - 320, position.x - 160)
            }}
        >
            {/* Header */}
            <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold">Bob Score Analysis</div>
                    <div className={`px-2 py-0.5 rounded text-xs font-bold ${score > 60 ? 'bg-emerald-500/20 text-emerald-500' :
                        score < 40 ? 'bg-rose-500/20 text-rose-500' :
                            'bg-zinc-500/20 text-zinc-400'
                        }`}>
                        {score.toFixed(0)} / 100
                    </div>
                </div>
                <button onClick={onClose} className="hover:bg-zinc-800 rounded p-1 transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                </button>
            </div>

            {/* List */}
            <div className="p-2 max-h-[300px] overflow-y-auto space-y-2">
                {breakdown.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-xs">
                        No active factors influencing score.
                        <br />
                        Base Score: 50 (Neutral)
                    </div>
                ) : (
                    breakdown.map((item, idx) => (
                        <div key={idx} className="p-2 rounded bg-zinc-900/50 border border-zinc-800/50">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                    {item.category === 'TREND' && <TrendingUp className="w-3 h-3 text-blue-400" />}
                                    {item.category === 'STRATEGY' && <Layers className="w-3 h-3 text-purple-400" />}
                                    {item.category === 'INDICATOR' && <Activity className="w-3 h-3 text-orange-400" />}
                                    <span className="text-xs font-medium text-foreground">{item.label}</span>
                                </div>
                                <span className={`text-xs font-bold ${item.value > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {item.value > 0 ? '+' : ''}{item.value}
                                </span>
                            </div>
                            <div className="text-[10px] text-zinc-400 leading-tight">
                                {item.description}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer Legend */}
            <div className="p-2 bg-muted/20 border-t border-border flex justify-between text-[10px] text-zinc-500">
                <span>Base: 50</span>
                <span>Max: 100</span>
            </div>
        </div>
    );
}
