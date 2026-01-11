'use client';

import useSWR from 'swr';
import { fetchCryptoNews } from '@/lib/services/news';
import { NewsItem } from '@/lib/types';

export function useNews() {
    const { data, error, isLoading, mutate } = useSWR<NewsItem[]>('crypto-news', fetchCryptoNews, {
        refreshInterval: 1000 * 60 * 15, // Refresh every 15 minutes (aligns with server cache)
        revalidateOnFocus: false,
        dedupingInterval: 1000 * 60 * 5, // Dedupe requests within 5 minutes
        fallbackData: [],
    });

    return {
        news: data || [],
        isLoading,
        error: error ? (error instanceof Error ? error.message : 'Failed to load news') : null,
        refresh: () => mutate(),
    };
}
