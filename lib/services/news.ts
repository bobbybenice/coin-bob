'use server';

import { WATCHLIST, SYMBOL_MAP } from '@/lib/binance';
import { NewsItem } from '@/lib/types';

interface CryptoPanicPost {
    id: number;
    title: string;
    slug: string; // Used to construct URL
    domain?: string;
    published_at: string;
    currencies?: { code: string; title: string; slug: string; }[];
    votes: {
        negative: number;
        positive: number;
        important: number;
        liked: number;
        disliked: number;
        lol: number;
        toxic: number;
        saved: number;
        comments: number;
    };
}

export async function fetchCryptoNews(): Promise<NewsItem[]> {
    const apiKey = process.env.CRYPTOPANIC_API_KEY;

    if (!apiKey) {
        console.error("Missing CRYPTOPANIC_API_KEY environment variable");
        throw new Error("Service Configuration Error: Missing API Key");
    }

    try {
        // Use developer v2 endpoint as verified - REMOVED filter=important to ensure BTC/market breadth
        const url = `https://cryptopanic.com/api/developer/v2/posts/?auth_token=${apiKey}&public=true`;

        const response = await fetch(url, {
            cache: 'no-store',
            headers: {
                'User-Agent': 'CoinBob/1.0 (Node.js)'
            }
        });

        if (!response.ok) {
            throw new Error(`Upstream API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Prepare watchlist symbols (remove USDT)
        const relevantSymbols = new Set(WATCHLIST.map(s => s.replace('USDT', '')));

        if (!data.results) {
            return [];
        }

        const news = data.results.filter((item: CryptoPanicPost) => {
            // New Logic: If no currencies listed, keep it as "General News" (might be broad market)
            if (!item.currencies) return true;

            // Otherwise, check if it matches our watchlist
            // But also be lenient if it's "important"
            const matchesWatchlist = item.currencies.some((c) => relevantSymbols.has(c.code));
            return matchesWatchlist;
        }).map((item: CryptoPanicPost) => {
            const votes = item.votes || {};
            const pos = votes.positive || 0;
            const neg = votes.negative || 0;

            let score = (pos - neg) / (pos + neg + 1);
            let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';

            // If no votes, try simple keyword analysis
            if (pos === 0 && neg === 0) {
                const titleLower = item.title.toLowerCase();
                const bullishTerms = ['soars', 'surges', 'rally', 'bull', 'high', 'gains', 'jump', 'adoption', 'launch', 'record', 'payout', 'upgrade', 'success', 'rockets'];
                const bearishTerms = ['crash', 'drop', 'bear', 'low', 'loss', 'dump', 'ban', 'risk', 'warns', 'lawsuit', 'hack', 'scam', 'fraud', 'prison', 'sentencing'];

                let bullCount = 0;
                let bearCount = 0;

                bullishTerms.forEach(term => { if (titleLower.includes(term)) bullCount++; });
                bearishTerms.forEach(term => { if (titleLower.includes(term)) bearCount++; });

                if (bullCount > bearCount) {
                    score = 0.5; // Artificial score
                    sentiment = 'bullish';
                } else if (bearCount > bullCount) {
                    score = -0.5;
                    sentiment = 'bearish';
                }
            } else {
                // Existing logic
                if (score >= 0.2) sentiment = 'bullish';
                else if (score <= -0.2) sentiment = 'bearish';
            }

            // Keyword analysis for Asset Tagging (Fix for empty currencies in API)
            const inferredCurrencies = [...(item.currencies || [])];
            if (inferredCurrencies.length === 0) {
                const titleLower = item.title.toLowerCase();
                relevantSymbols.forEach(symbol => {
                    // Look up full name from shared map
                    const info = SYMBOL_MAP[`${symbol}USDT`];
                    const fullName = info ? info.name.toLowerCase() : '';

                    // Match Symbol (surrounded by boundary or space to avoid partial matches mostly)
                    // Also partial match for "XRP" might catch "XRP" at start of string
                    if (titleLower.includes(` ${symbol.toLowerCase()} `) ||
                        titleLower.includes(`$${symbol.toLowerCase()}`) ||
                        titleLower.startsWith(`${symbol.toLowerCase()} `) ||
                        (fullName && titleLower.includes(fullName))) {

                        inferredCurrencies.push({
                            code: symbol,
                            title: info ? info.name : symbol,
                            slug: info ? info.id : symbol.toLowerCase()
                        });
                    }
                });
            }

            return {
                id: item.id,
                title: item.title,
                url: `https://cryptopanic.com/news/${item.id}/${item.slug}`,
                domain: item.domain || 'cryptopanic.com',
                published_at: item.published_at,
                currencies: inferredCurrencies,
                votes: votes as any, // Cast because we might have mocked an empty object
                sentiment,
                score
            } as NewsItem;
        });

        return news;

    } catch (error) {
        console.error("Failed to fetch crypto news:", error);
        throw new Error(error instanceof Error ? error.message : "Service Unavailable");
    }
}
