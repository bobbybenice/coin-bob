import { useState, useEffect } from 'react';
import { fetchFearAndGreedIndex, FearAndGreedData } from '@/lib/services/fng';

export function useFearAndGreed() {
    const [data, setData] = useState<FearAndGreedData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        async function loadData() {
            try {
                setError(null);
                const result = await fetchFearAndGreedIndex();
                if (mounted) {
                    setData(result);
                }
            } catch (err) {
                console.error(err);
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Failed to load');
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        }

        loadData();

        return () => {
            mounted = false;
        };
    }, []);

    return { data, isLoading, error };
}
