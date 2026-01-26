'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { UserSettings, FilterCriteria, Timeframe, AssetTrends, StrategyName } from './types';
import { BacktestOptions } from './engine/backtester';

const SETTINGS_CACHE_KEY = 'coinbob_user_settings_v1';
const TREND_CACHE_KEY = 'coinbob_trend_cache_v3';

const DEFAULT_SETTINGS: UserSettings = {
    favorites: [],
    filters: {
        favoritesOnly: false,
        minRsi: 0,
        maxRsi: 100,
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
    visibleStrategies: ['RSI_MFI', 'BOLLINGER_BOUNCE'],
};


interface UserContextType {
    settings: UserSettings;
    isLoaded: boolean;
    toggleFavorite: (assetId: string) => void;
    updateFilters: (newFilters: Partial<FilterCriteria>) => void;
    activeAsset: string | null;
    setActiveAsset: (symbol: string | null) => void;
    setTimeframe: (timeframe: Timeframe) => void;
    toggleVisibleStrategy: (strategy: StrategyName) => void;

    // Futures Logic
    isFuturesMode: boolean;
    toggleFuturesMode: () => void;

    // Backtest Mode
    isBacktestMode: boolean;
    toggleBacktestMode: () => void;
    backtestOptions: BacktestOptions;
    updateBacktestOptions: (options: Partial<BacktestOptions>) => void;
}

interface TrendsContextType {
    trends: Record<string, AssetTrends>;
    updateAssetTrend: (symbol: string, data: Partial<AssetTrends>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);
const TrendsContext = createContext<TrendsContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState(false);
    const [activeAsset, setActiveAsset] = useState<string | null>(null);

    // MARK: - Hydration Check
    useEffect(() => {
        setIsLoaded(true);
    }, []);

    // Save to LocalStorage on change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
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

    const toggleVisibleStrategy = (strategy: StrategyName) => {
        setSettings((prev) => {
            const isVisible = prev.visibleStrategies?.includes(strategy);
            return {
                ...prev,
                visibleStrategies: isVisible
                    ? prev.visibleStrategies.filter((s) => s !== strategy)
                    : [...(prev.visibleStrategies || []), strategy],
            };
        });
    };

    const [isFuturesMode, setIsFuturesMode] = useState(true);

    const toggleFuturesMode = () => {
        setIsFuturesMode(prev => !prev);
    };

    const [isBacktestMode, setIsBacktestMode] = useState(false);

    const toggleBacktestMode = () => {
        setIsBacktestMode(prev => !prev);
    };

    const [backtestOptions, setBacktestOptions] = useState<BacktestOptions>({
        initialBalance: 10000,
        stopLossPercent: 2.0,
        riskRewardRatio: 2.0,

    });

    const updateBacktestOptions = (newOptions: Partial<BacktestOptions>) => {
        setBacktestOptions(prev => ({ ...prev, ...newOptions }));
    };

    return (
        <UserContext.Provider value={{
            settings,
            isLoaded,
            toggleFavorite,
            updateFilters,
            activeAsset,
            setActiveAsset,
            setTimeframe,
            toggleVisibleStrategy,
            isFuturesMode,
            toggleFuturesMode,
            isBacktestMode,
            toggleBacktestMode,
            backtestOptions,
            updateBacktestOptions
        }}>
            {children}
        </UserContext.Provider>
    );
}

export function TrendsProvider({ children }: { children: ReactNode }) {
    const [trends, setTrends] = useState<Record<string, AssetTrends>>({});

    // Load Trends Cache (Once on mount)
    useEffect(() => {
        try {
            const storedTrends = localStorage.getItem(TREND_CACHE_KEY);
            if (storedTrends) {
                setTrends(JSON.parse(storedTrends));
            }
        } catch (e) {
            console.error('Failed to load trends cache', e);
        }
    }, []);

    // Save Trends Cache (Debounced effect - simplified here as immediate for consistency with existing logic)
    useEffect(() => {
        if (Object.keys(trends).length > 0) {
            localStorage.setItem(TREND_CACHE_KEY, JSON.stringify(trends));
        }
    }, [trends]);

    const updateAssetTrend = (symbol: string, data: Partial<AssetTrends>) => {
        setTrends(prev => ({
            ...prev,
            [symbol]: { ...prev[symbol], ...data, lastUpdated: Date.now() }
        }));
    };

    return (
        <TrendsContext.Provider value={{ trends, updateAssetTrend }}>
            {children}
        </TrendsContext.Provider>
    );
}

export function useUserStore() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUserStore must be used within a UserProvider');
    }
    return context;
}

export function useTrendsStore() {
    const context = useContext(TrendsContext);
    if (context === undefined) {
        throw new Error('useTrendsStore must be used within a TrendsProvider');
    }
    return context;
}
