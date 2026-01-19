'use client';

import { useUserStore } from '@/lib/store';
import { useMarketData } from '@/lib/hooks/useMarketData';
import { useNews } from '@/lib/hooks/useNews';
import { useWhaleData } from '@/lib/hooks/useWhaleData';

export default function BobAIAdvisor({ contextOverride }: { contextOverride?: string }) {
    const { settings } = useUserStore();
    const { assets, isLoading } = useMarketData();
    const { news, error: newsError } = useNews();
    const { transactions: whaleData } = useWhaleData();

    // Simple "AI" logic for mockup
    const getInsight = () => {
        if (contextOverride) {
            // Split override by newlines or formatting if needed, but for now just return it as a message or split it
            return contextOverride.trim().split('\n').filter(line => line.trim().length > 0);
        }

        if (isLoading) return [`Analyzing ${settings.timeframe} market data...`];

        if (settings.filters.favoritesOnly && settings.favorites.length === 0) {
            return ["It looks like you haven't selected any favorites yet. Mark assets with the star icon to track them here."];
        }

        const messages: string[] = [];
        messages.push(`Analyzing market on the [${settings.timeframe}] chart...`);

        const highRsi = assets.filter(a => a.rsi > 70).map(a => a.symbol).slice(0, 5);
        const highPotential = assets.filter(a => a.bobScore > 80).map(a => a.symbol).slice(0, 5);

        // 1. Market Momentum
        if (highPotential.length > 0) {
            messages.push(`Market Analysis: ${highPotential.join(', ')} are showing strong momentum (Bob Score > 80).`);
        } else {
            messages.push(`Market Analysis: No strong momentum signals detected right now.`);
        }

        // 2. Cautionary Indicators
        if (highRsi.length > 0) {
            messages.push(`Caution: ${highRsi.join(', ')} are currently overbought (RSI > 70).`);
        } else {
            messages.push(`RSI levels appear neutral across major assets.`);
        }

        // 3. News Sentiment Integration
        if (newsError) {
            messages.push(`Note: News sentiment unavailable (${newsError}).`);
            messages.push(`Analysis based on technicals only.`);
        } else {
            const bullishNews = news.filter(n => n.sentiment === 'bullish');
            const bearishNews = news.filter(n => n.sentiment === 'bearish');

            if (bullishNews.length > 0 || bearishNews.length > 0) {
                if (bullishNews.length > bearishNews.length) {
                    messages.push(`News Sentiment LEANING BULLISH based on ${bullishNews.length} positive signals.`);
                } else if (bearishNews.length > bullishNews.length) {
                    messages.push(`News Sentiment LEANING BEARISH based on ${bearishNews.length} negative signals.`);
                } else {
                    messages.push(`News Sentiment is MIXED.`);
                }

                // Find most significant news
                const significantNews = [...news].sort((a, b) => Math.abs(b.score) - Math.abs(a.score))[0];
                if (significantNews && Math.abs(significantNews.score) > 0.4) {
                    messages.push(`Top Story: "${significantNews.title}" (${significantNews.domain}).`);
                }
            }
        }

        messages.push("Consider watching for entry points on dips.");

        // 4. Whale Watcher Integration
        if (whaleData && whaleData.length > 0) {
            const recentMegaWhale = whaleData.find(tx => tx.amount_usd > 10000000); // Alert on > $10M
            if (recentMegaWhale) {
                // Blockchain.com API might not show owner, so we simplify the alert
                messages.unshift(`WHALE ALERT: Massive BTC movement detected on-chain ($${(recentMegaWhale.amount_usd / 1000000).toFixed(1)}M).`);
            }
        }

        // 5. ICT High Probability Alerts
        const ictSetups = assets.filter(a => a.ictAnalysis?.isHighProbability);
        if (ictSetups.length > 0) {
            ictSetups.forEach(a => {
                const signal = a.ictAnalysis?.signal;
                const killzone = a.ictAnalysis?.killzone;
                const killzoneName = killzone === 'LONDON' ? 'London' : 'New York';

                let action = "monitoring";
                if (signal?.includes('SWEEP')) action = `Swept Liquidity`;
                if (signal?.includes('FVG')) action = `formed a Fair Value Gap`;

                const type = signal?.includes('BULLISH') ? 'LONG' : 'SHORT';

                messages.push(`[ICT ALERT] ${a.symbol} has ${action} during ${killzoneName} Killzone. Potential [${type}] setup.`);
            });
        }

        return messages;
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
                <div className="flex flex-col gap-4">
                    {getInsight().map((msg, index) => (
                        <div key={index} className="flex gap-3 items-start">
                            <span className="text-indigo-500 select-none shrink-0 font-bold">~ $</span>
                            <div className="typing-effect leading-relaxed">
                                {msg.split(/(\[ICT ALERT\]|\[LONG\]|\[SHORT\]|\b[A-Z]{2,5}\b)/g).map((part, i) => {
                                    if (part === '[ICT ALERT]') {
                                        return <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 mx-1">ICT ALERT</span>;
                                    }
                                    if (part === '[LONG]') {
                                        return <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 mx-1">LONG</span>;
                                    }
                                    if (part === '[SHORT]') {
                                        return <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/50 mx-1">SHORT</span>;
                                    }
                                    // Symbol detection
                                    if (/^[A-Z]{2,5}$/.test(part)) {
                                        const isAsset = assets.some(a => a.symbol === part);
                                        if (isAsset) {
                                            return (
                                                <span
                                                    key={i}
                                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 mx-0.5"
                                                >
                                                    {part}
                                                </span>
                                            );
                                        }
                                    }
                                    return <span key={i}>{part}</span>;
                                })}
                                {/* Only show cursor on the last line */}
                                {index === getInsight().length - 1 && (
                                    <span className="inline-block w-1.5 h-3 align-middle bg-indigo-500 ml-1 animate-pulse"></span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
