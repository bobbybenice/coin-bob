'use client';

import { Timeframe } from '@/lib/types';
import { useUserStore } from '@/lib/store';
import { Clock } from 'lucide-react';

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '1h', '4h', '1d'];

export default function TimeframeSelector() {
    const { settings, setTimeframe } = useUserStore();

    return (
        <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-lg border border-border">
            <div className="px-2 flex items-center text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="flex bg-muted/50 rounded-md p-0.5">
                {TIMEFRAMES.map((tf) => (
                    <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`
                            px-2.5 py-1 text-xs font-bold rounded-sm transition-all
                            ${settings.timeframe === tf
                                ? 'bg-background text-emerald-400 shadow-sm ring-1 ring-border'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                            }
                        `}
                    >
                        {tf.toUpperCase()}
                    </button>
                ))}
            </div>
        </div>
    );
}
