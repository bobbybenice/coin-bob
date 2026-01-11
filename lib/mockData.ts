import { Asset, NewsItem } from './types';

export const MOCK_ASSETS: Asset[] = [
    {
        id: 'bitcoin',
        symbol: 'BTC',
        name: 'Bitcoin',
        price: 64231.45,
        change24h: 2.14,
        volume24h: 35000000000,
        marketCap: 1200000000000,
        rsi: 55.4,
        bobScore: 78,
    },
    {
        id: 'ethereum',
        symbol: 'ETH',
        name: 'Ethereum',
        price: 3452.12,
        change24h: -1.05,
        volume24h: 15000000000,
        marketCap: 400000000000,
        rsi: 48.2,
        bobScore: 65,
    },
    {
        id: 'solana',
        symbol: 'SOL',
        name: 'Solana',
        price: 145.67,
        change24h: 5.89,
        volume24h: 4000000000,
        marketCap: 65000000000,
        rsi: 72.1,
        bobScore: 92,
    },
    {
        id: 'ripple',
        symbol: 'XRP',
        name: 'XRP',
        price: 0.62,
        change24h: 0.45,
        volume24h: 1200000000,
        marketCap: 34000000000,
        rsi: 51.0,
        bobScore: 45,
    },
    {
        id: 'cardano',
        symbol: 'ADA',
        name: 'Cardano',
        price: 0.45,
        change24h: -0.89,
        volume24h: 500000000,
        marketCap: 16000000000,
        rsi: 42.5,
        bobScore: 40,
    },
    {
        id: 'dogecoin',
        symbol: 'DOGE',
        name: 'Dogecoin',
        price: 0.16,
        change24h: 12.4,
        volume24h: 2000000000,
        marketCap: 23000000000,
        rsi: 85.0,
        bobScore: 50,
    },
    {
        id: 'chainlink',
        symbol: 'LINK',
        name: 'Chainlink',
        price: 18.23,
        change24h: 3.21,
        volume24h: 800000000,
        marketCap: 10000000000,
        rsi: 62.4,
        bobScore: 88,
    }
];

export const MOCK_NEWS: NewsItem[] = [
    {
        id: 101,
        title: "Bitcoin Surges Past $65k Amid Institutional Interest",
        url: "https://example.com/news/btc-surge",
        domain: "coindesk.com",
        published_at: new Date().toISOString(),
        currencies: [
            { code: "BTC", title: "Bitcoin", slug: "bitcoin" }
        ],
        votes: {
            positive: 45, negative: 2, important: 30, liked: 40, disliked: 1,
            lol: 0, toxic: 0, saved: 10, comments: 15
        },
        sentiment: "bullish",
        score: 0.9
    },
    {
        id: 102,
        title: "Ethereum Upgrade Successfully Deployed on Testnet",
        url: "https://example.com/news/eth-upgrade",
        domain: "cointelegraph.com",
        published_at: new Date(Date.now() - 3600000).toISOString(),
        currencies: [
            { code: "ETH", title: "Ethereum", slug: "ethereum" }
        ],
        votes: {
            positive: 38, negative: 1, important: 25, liked: 35, disliked: 0,
            lol: 2, toxic: 0, saved: 8, comments: 10
        },
        sentiment: "bullish",
        score: 0.85
    },
    {
        id: 103,
        title: "Market Analysis: Consolidation Expected for Major Alts",
        url: "https://example.com/news/market-analysis",
        domain: "cryptonews.com",
        published_at: new Date(Date.now() - 7200000).toISOString(),
        currencies: [
            { code: "SOL", title: "Solana", slug: "solana" },
            { code: "ADA", title: "Cardano", slug: "cardano" }
        ],
        votes: {
            positive: 10, negative: 8, important: 5, liked: 12, disliked: 2,
            lol: 1, toxic: 1, saved: 2, comments: 5
        },
        sentiment: "neutral",
        score: 0.1
    },
    {
        id: 104,
        title: "Regulatory Concerns Weigh on XRP Price Action",
        url: "https://example.com/news/xrp-regulations",
        domain: "bloomberg.com",
        published_at: new Date(Date.now() - 10800000).toISOString(),
        currencies: [
            { code: "XRP", title: "XRP", slug: "ripple" }
        ],
        votes: {
            positive: 5, negative: 30, important: 40, liked: 2, disliked: 15,
            lol: 0, toxic: 5, saved: 3, comments: 25
        },
        sentiment: "bearish",
        score: -0.7
    }
];
