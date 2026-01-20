'use client';

import { useNews } from '@/lib/hooks/useNews';
import { useUserStore } from '@/lib/store';

import { Newspaper } from 'lucide-react';
import { Button } from './ui/Button';

export default function NewsFeed() {
    const { activeAsset } = useUserStore();
    // Fetch news specific to the active asset if selected, otherwise global news
    const { news, isLoading: loading, error, refresh } = useNews(activeAsset || undefined);

    return (
        <div className="flex flex-col h-full bg-card overflow-hidden relative group">
            <div className="p-3 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
                <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)] animate-pulse"></span>
                    News Wire: {activeAsset || 'MARKET'}
                </h2>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={refresh}
                        disabled={loading}
                        className="text-[10px] text-muted-foreground hover:text-foreground h-auto p-1 hover:bg-transparent"
                        title="Refresh"
                    >
                        REFRESH
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                {error ? (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-red-400 font-medium text-sm">Connection Error</p>
                            <p className="text-muted-foreground text-xs mt-1 font-mono">{error}</p>
                        </div>
                        <Button
                            variant="secondary"
                            onClick={refresh}
                            className="px-4 h-8 text-xs font-medium"
                        >
                            Retry Connection
                        </Button>
                    </div>
                ) : loading ? (
                    <div className="space-y-4 p-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="animate-pulse space-y-2">
                                <div className="h-4 bg-muted/20 rounded w-3/4"></div>
                                <div className="flex gap-2">
                                    <div className="h-3 bg-muted/20 rounded w-16"></div>
                                    <div className="h-3 bg-muted/20 rounded w-12"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : news.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center select-none opacity-60 hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center ring-1 ring-border/50 mb-4">
                            <Newspaper className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="max-w-[160px] space-y-1">
                            <p className="text-xs font-medium text-foreground">No News Found</p>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                No recent stories for {activeAsset || 'tracked assets'}.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {news.map((item) => (
                            <a
                                key={item.id}
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-4 hover:bg-white/[0.02] transition-colors group/item relative"
                            >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex flex-wrap gap-1.5">
                                        {item.currencies.length === 0 ? (
                                            <span className="text-[9px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                                                MARKET
                                            </span>
                                        ) : (
                                            item.currencies.slice(0, 3).map(c => {
                                                let badgeColor = "bg-muted text-muted-foreground border-border";
                                                if (c.code === 'BTC') badgeColor = "bg-orange-500/10 text-orange-500 border-orange-500/20";
                                                if (c.code === 'ETH') badgeColor = "bg-blue-500/10 text-blue-500 border-blue-500/20";
                                                if (c.code === 'SOL') badgeColor = "bg-purple-500/10 text-purple-500 border-purple-500/20";

                                                return (
                                                    <span key={c.code} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}>
                                                        {c.code}
                                                    </span>
                                                );
                                            })
                                        )}
                                        {item.sentiment === 'bullish' && (
                                            <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                                                <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                                                BULLISH
                                            </span>
                                        )}
                                        {item.sentiment === 'bearish' && (
                                            <span className="text-[9px] font-bold bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20 flex items-center gap-1">
                                                <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                                BEARISH
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap shrink-0">
                                        {new Date(item.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                <h3 className="text-sm font-medium text-foreground leading-snug group-hover/item:text-emerald-400 transition-colors pr-4">
                                    {item.title}
                                </h3>

                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-2 text-muted-foreground group-hover/item:text-foreground transition-colors">
                                        <span className="text-[10px] uppercase tracking-wider font-medium">
                                            {item.domain}
                                        </span>
                                        <svg className="w-3 h-3 opacity-0 group-hover/item:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </div>
                                    {/* Sentiment Bar if score exists */}
                                    {Math.abs(item.score) > 0.1 && (
                                        <div className="flex items-center gap-1.5" title={`Sentiment Score: ${item.score.toFixed(2)}`}>
                                            <div className="h-1 w-12 bg-zinc-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${item.score > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                                    style={{ width: `${Math.abs(item.score * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
