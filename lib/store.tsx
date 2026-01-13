'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { UserSettings, FilterCriteria, Timeframe, AssetTrends } from './types';

const STORAGE_KEY = 'coinbob_user_settings';
const TREND_CACHE_KEY = 'coinbob_trend_cache';

const DEFAULT_SETTINGS: UserSettings = {
    favorites: [],
    filters: {
        favoritesOnly: false,
        minRsi: 0,
        maxRsi: 100,
        minBobScore: 0,
        oversold: false,
        goldenCross: false,
        aboveEma20: false,
        macdBullish: false,
        bbLow: false,
        ictBullishSweep: false,
        ictBearishSweep: false,
        ictBullishFVG: false,
        ictBearishFVG: false,
    },
    timeframe: '1d',
};

interface UserContextType {
    settings: UserSettings;
    isLoaded: boolean;
    trends: Record<string, AssetTrends>;
    toggleFavorite: (assetId: string) => void;
    updateFilters: (newFilters: Partial<FilterCriteria>) => void;
    updateAssetTrend: (symbol: string, data: Partial<AssetTrends>) => void;
    activeAsset: string | null;
    setActiveAsset: (symbol: string | null) => void;
    setTimeframe: (timeframe: Timeframe) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
    const [trends, setTrends] = useState<Record<string, AssetTrends>>({});
    const [isLoaded, setIsLoaded] = useState(false);
    const [activeAsset, setActiveAsset] = useState<string | null>(null);

    // Load settings
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setSettings({
                    ...DEFAULT_SETTINGS,
                    ...parsed,
                    filters: { ...DEFAULT_SETTINGS.filters, ...parsed.filters }
                });
            }
            // Load Trends Cache
            const storedTrends = localStorage.getItem(TREND_CACHE_KEY);
            if (storedTrends) {
                setTrends(JSON.parse(storedTrends));
            }
        } catch (e) {
            console.error('Failed to load user settings', e);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Save settings
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        }
    }, [settings, isLoaded]);

    // Save Trends (Debounced or just on change? It might update often. Let's do it.)
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(TREND_CACHE_KEY, JSON.stringify(trends));
        }
    }, [trends, isLoaded]);

    const setTimeframe = (timeframe: Timeframe) => {
        setSettings((prev) => ({ ...prev, timeframe }));
    };

    const updateAssetTrend = (symbol: string, data: Partial<AssetTrends>) => {
        setTrends(prev => ({
            ...prev,
            [symbol]: { ...prev[symbol], ...data, lastUpdated: Date.now() }
        }));
    };


    const toggleFavorite = (assetId: string) => {
        setSettings((prev) => {
            const isFav = prev.favorites.includes(assetId);
            return {
                ...prev,
                favorites: isFav
                    ? prev.favorites.filter((id) => id !== assetId)
                    : [...prev.favorites, assetId],
            };
        });
    };

    const updateFilters = (newFilters: Partial<FilterCriteria>) => {
        setSettings((prev) => ({
            ...prev,
            filters: { ...prev.filters, ...newFilters },
        }));
    };

    return (
        <UserContext.Provider value={{
            settings,
            isLoaded,
            trends,
            toggleFavorite,
            updateFilters,
            updateAssetTrend,
            activeAsset,
            setActiveAsset,
            setTimeframe
        }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUserStore() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUserStore must be used within a UserProvider');
    }
    return context;
}
