'use client';

import { useState, useEffect } from 'react';
import { Asset } from '../types';
import { subscribeToBinanceStream } from '../binance';

export function useMarketData() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Subscribe to the simulation stream
        const unsubscribe = subscribeToBinanceStream((data) => {
            setAssets(data);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { assets, isLoading, error: null };
}
