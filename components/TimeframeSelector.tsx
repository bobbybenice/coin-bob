'use client';

import { Timeframe } from '@/lib/types';
import { useUserStore } from '@/lib/store';
import { Clock } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '1d'];

export default function TimeframeSelector() {
    const { settings, setTimeframe } = useUserStore();

    return (
        <div className="flex items-center gap-2 lg:p-1 lg:bg-muted/30 lg:rounded-lg lg:border lg:border-border">
            <div className="hidden lg:flex px-2 items-center text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
            </div>

            {/* Mobile: Native Select */}
            <div className="lg:hidden">
                <select
                    value={settings.timeframe}
                    onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                    className="h-7 text-xs font-bold bg-transparent border-none focus:ring-0 text-foreground"
                >
                    {TIMEFRAMES.map((tf) => (
                        <option key={tf} value={tf} className="bg-zinc-900">
                            {tf.toUpperCase()}
                        </option>
                    ))}
                </select>
            </div>

            {/* Desktop: Button Group */}
            <div className="hidden lg:flex bg-muted/50 rounded-md p-0.5 gap-0.5">
                {TIMEFRAMES.map((tf) => (
                    <Button
                        key={tf}
                        variant="ghost"
                        size="xs"
                        onClick={() => setTimeframe(tf)}
                        className={cn(
                            "font-bold transition-all h-auto py-1",
                            settings.timeframe === tf
                                ? 'bg-background text-emerald-400 shadow-sm ring-1 ring-border hover:bg-background'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                        )}
                    >
                        {tf.toUpperCase()}
                    </Button>
                ))}
            </div>
        </div>
    );
}
