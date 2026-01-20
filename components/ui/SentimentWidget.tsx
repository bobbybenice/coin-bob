'use client';

import { Frown, Smile, Laugh } from 'lucide-react';
import { FearAndGreedData } from '@/lib/services/fng';

interface SentimentWidgetProps {
    data: FearAndGreedData | null;
    isExpanded: boolean;
}

export default function SentimentWidget({ data, isExpanded }: SentimentWidgetProps) {
    if (!data) return null;

    if (isExpanded) {
        return (
            <div className="w-full bg-background/50 border border-border rounded-lg p-2.5 flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Market Sentiment</span>
                    <span className={`text-xs font-bold ${Number(data.value) > 50 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {data.value_classification}
                    </span>
                </div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-muted/30 border border-border font-mono text-sm font-bold ${Number(data.value) > 50 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {data.value}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-1 mt-2" title={`Sentiment: ${data.value_classification}`}>
            {Number(data.value) <= 30 ? (
                <Frown className="w-5 h-5 text-rose-500" />
            ) : Number(data.value) <= 60 ? (
                <Smile className="w-5 h-5 text-foreground" />
            ) : (
                <Laugh className="w-5 h-5 text-emerald-500" />
            )}
            <span className={`text-[10px] font-bold ${Number(data.value) > 50 ? 'text-emerald-500' : Number(data.value) <= 30 ? 'text-rose-500' : 'text-foreground'}`}>
                {data.value}
            </span>
        </div>
    );
}
