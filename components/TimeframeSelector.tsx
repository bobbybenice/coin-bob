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
        <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-lg border border-border">
            <div className="px-2 flex items-center text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="flex bg-muted/50 rounded-md p-0.5 gap-0.5">
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
