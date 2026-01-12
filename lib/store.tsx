'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { UserSettings, FilterCriteria, Timeframe } from './types';

const STORAGE_KEY = 'coinbob_user_settings';

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
    },
    timeframe: '1d',
};

interface UserContextType {
    settings: UserSettings;
    isLoaded: boolean;
    toggleFavorite: (assetId: string) => void;
    updateFilters: (newFilters: Partial<FilterCriteria>) => void;
    activeAsset: string | null;
    setActiveAsset: (symbol: string | null) => void;
    setTimeframe: (timeframe: Timeframe) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState(false);
    const [activeAsset, setActiveAsset] = useState<string | null>(null);

    // Load from local storage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                // Merge with default to handle new fields if they don't exist in partial stored data
                const parsed = JSON.parse(stored);
                setSettings({
                    ...DEFAULT_SETTINGS,
                    ...parsed,
                    filters: { ...DEFAULT_SETTINGS.filters, ...parsed.filters }
                });
            }
        } catch (e) {
            console.error('Failed to load user settings', e);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Save to local storage whenever settings change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        }
    }, [settings, isLoaded]);

    const setTimeframe = (timeframe: Timeframe) => {
        setSettings((prev) => ({ ...prev, timeframe }));
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
        <UserContext.Provider value={{ settings, isLoaded, toggleFavorite, updateFilters, activeAsset, setActiveAsset, setTimeframe }}>
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
