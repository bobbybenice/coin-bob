'use client';

import { useState, useEffect } from 'react';
import { Asset } from '../types';
import { subscribeToBinanceStream } from '../binance';
import { useUserStore } from '../store';

export function useMarketData() {
    const { settings, isFuturesMode } = useUserStore();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        // Subscribe to the simulation stream
        const unsubscribe = subscribeToBinanceStream(settings.timeframe, isFuturesMode, (data) => {
            setAssets(data);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [settings.timeframe, isFuturesMode]);

    return { assets, isLoading, error: null };
}
