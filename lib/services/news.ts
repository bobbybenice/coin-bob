'use server';

import { WATCHLIST, SYMBOL_MAP } from '@/lib/constants';
import { NewsItem } from '@/lib/types';

interface FreeNewsItem {
    title: string;
    link: string;
    description?: string;
    pubDate: string;
    source: string;
    sourceKey?: string;
    category?: string;
    timeAgo?: string;
    tickers?: string[]; // API might return this, but we'll simulate/infer if missing
}

interface NewsResponse {
    articles: FreeNewsItem[];
}

export async function fetchCryptoNews(): Promise<NewsItem[]> {
    try {
        const url = 'https://free-crypto-news.vercel.app/api/news';

        const response = await fetch(url, {
            next: { revalidate: 300 }, // Cache for 5 minutes
            headers: {
                'User-Agent': 'CoinBob/1.0'
            }
        });

        if (!response.ok) {
            console.error(`News API Error: ${response.status} ${response.statusText}`);
            return [];
        }

        const data: NewsResponse = await response.json();

        if (!data.articles || !Array.isArray(data.articles)) {
            return [];
        }

        return processArticles(data.articles);

    } catch (error) {
        console.error("Failed to fetch crypto news:", error);
        return [];
    }
}

export async function fetchNewsForAsset(symbol: string): Promise<NewsItem[]> {
    try {
        // The API supports search
        const url = `https://free-crypto-news.vercel.app/api/search?q=${encodeURIComponent(symbol)}`;

        const response = await fetch(url, {
            next: { revalidate: 300 }
        });

        if (!response.ok) return [];

        const data: NewsResponse = await response.json();

        if (!data.articles || !Array.isArray(data.articles)) {
            return [];
        }

        return processArticles(data.articles);

    } catch (error) {
        console.error(`Failed to fetch news for ${symbol}:`, error);
        return [];
    }
}

function processArticles(articles: FreeNewsItem[]): NewsItem[] {
    // Prepare watchlist symbols for tagging
    const relevantSymbols = new Set(WATCHLIST.map(s => s.replace('USDT', '')));

    return articles.map((item, index) => {
        // Clean URL (remove CDATA if present)
        let cleanLink = item.link;
        if (cleanLink.startsWith('<![CDATA[')) {
            cleanLink = cleanLink.replace('<![CDATA[', '').replace(']]>', '');
        }

        // Generate a stable-ish ID
        const id = `news-${index}-${Date.now()}`;

        // Sentiment Analysis (Simple Keyword Based)
        let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
        let score = 0;

        const text = (item.title + ' ' + (item.description || '')).toLowerCase();

        const bullishTerms = ['soars', 'surges', 'rally', 'bull', 'high', 'gains', 'jump', 'adoption', 'launch', 'record', 'payout', 'upgrade', 'success', 'rockets', 'buy', 'invests'];
        const bearishTerms = ['crash', 'drop', 'bear', 'low', 'loss', 'dump', 'ban', 'risk', 'warns', 'lawsuit', 'hack', 'scam', 'fraud', 'prison', 'sentencing', 'sell'];

        let bullCount = 0;
        let bearCount = 0;

        bullishTerms.forEach(term => { if (text.includes(term)) bullCount++; });
        bearishTerms.forEach(term => { if (text.includes(term)) bearCount++; });

        if (bullCount > bearCount) {
            score = 0.5;
            sentiment = 'bullish';
        } else if (bearCount > bullCount) {
            score = -0.5;
            sentiment = 'bearish';
        }

        // Asset Inferences
        const currencies: { code: string; title: string; slug: string; }[] = [];

        // Check for tickers in title/desc
        relevantSymbols.forEach(symbol => {
            const info = SYMBOL_MAP[`${symbol}USDT`];
            const fullName = info ? info.name.toLowerCase() : '';

            // Boundary checks for symbol to avoid "AT" matching "BAT" etc.
            // Using regex for word boundaries
            const symbolRegex = new RegExp(`\\b${symbol}\\b`, 'i');

            if (symbolRegex.test(text) || (fullName && text.includes(fullName))) {
                currencies.push({
                    code: symbol,
                    title: info ? info.name : symbol,
                    slug: info ? info.id : symbol.toLowerCase()
                });
            }
        });

        // Limit to 3 currencies
        const uniqueCurrencies = currencies.slice(0, 3);

        return {
            id,
            title: item.title,
            url: cleanLink,
            domain: item.source || 'CryptoNews',
            published_at: item.pubDate,
            currencies: uniqueCurrencies,
            votes: {
                negative: 0,
                positive: 0,
                important: 0,
                liked: 0,
                disliked: 0,
                lol: 0,
                toxic: 0,
                saved: 0,
                comments: 0
            },
            sentiment,
            score
        };
    });
}
