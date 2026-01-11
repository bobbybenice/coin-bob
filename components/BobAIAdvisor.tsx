'use client';

import { useUserStore } from '@/lib/store';
import { useMarketData } from '@/lib/hooks/useMarketData';
import { fetchCryptoNews } from '@/lib/services/news';
import { NewsItem } from '@/lib/types';
import { useState, useEffect } from 'react';

export default function BobAIAdvisor() {
    const { settings } = useUserStore();
    const { assets, isLoading } = useMarketData();
    const [news, setNews] = useState<NewsItem[]>([]);

    useEffect(() => {
        fetchCryptoNews().then(setNews).catch(console.error);
    }, []);

    // Simple "AI" logic for mockup
    const getInsight = () => {
        if (isLoading) return "Analyzing real-time market data...";

        if (settings.filters.favoritesOnly && settings.favorites.length === 0) {
            return "It looks like you haven't selected any favorites yet. Mark assets with the star icon to track them here.";
        }

        const highRsi = assets.filter(a => a.rsi > 70).map(a => a.symbol).slice(0, 5);
        const highPotential = assets.filter(a => a.bobScore > 80).map(a => a.symbol).slice(0, 5);

        let insight = `Market Analysis: `;
        if (highPotential.length > 0) {
            insight += `${highPotential.join(', ')} are showing strong momentum (Bob Score > 80). `;
        } else {
            insight += `No strong momentum signals detected right now. `;
        }

        if (highRsi.length > 0) {
            insight += `Caution: ${highRsi.join(', ')} are currently overbought (RSI > 70). `;
        } else {
            insight += `RSI levels appear neutral across major assets. `;
        }

        // News Sentiment Integration
        const bullishNews = news.filter(n => n.sentiment === 'bullish');
        const bearishNews = news.filter(n => n.sentiment === 'bearish');

        if (bullishNews.length > 0 || bearishNews.length > 0) {
            if (bullishNews.length > bearishNews.length) {
                insight += `News Sentiment LEANING BULLISH based on ${bullishNews.length} positive signals. `;
            } else if (bearishNews.length > bullishNews.length) {
                insight += `News Sentiment LEANING BEARISH based on ${bearishNews.length} negative signals. `;
            } else {
                insight += `News Sentiment is MIXED. `;
            }

            // Find most significant news
            const significantNews = [...news].sort((a, b) => Math.abs(b.score) - Math.abs(a.score))[0];
            if (significantNews && Math.abs(significantNews.score) > 0.4) {
                insight += `Top Story: "${significantNews.title}" (${significantNews.domain}). `;
            }
        }

        insight += "Consider watching for entry points on dips.";

        return insight;
    };

    return (
        <div className="flex flex-col h-full bg-card">
            <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                    <h2 className="text-xs font-bold text-indigo-300 tracking-widest uppercase">BobAI Intelligence</h2>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">V 2.4.0 • CONNECTED</div>
            </div>
            <div className="flex-1 p-4 font-mono text-xs md:text-sm leading-relaxed text-muted-foreground bg-background/50 inner-shadow overflow-auto custom-scrollbar">
                <div className="flex gap-3">
                    <span className="text-indigo-500 select-none">root@bob-ai:~#</span>
                    <div className="typing-effect">
                        {getInsight().split(/(\b[A-Z]{2,5}\b)/).map((part, i) => {
                            if (i % 2 === 1) { // Matched ticker
                                return <span key={i} className="font-bold text-foreground bg-muted px-1 rounded mx-0.5 border border-border">{part}</span>
                            }
                            return part;
                        })}
                        <span className="inline-block w-2 h-4 align-middle bg-indigo-500 ml-1 animate-pulse"></span>
                    </div>
                </div>
            </div>
        </div>
    );
}
