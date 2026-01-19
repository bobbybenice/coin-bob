'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useMarketData } from '@/lib/hooks/useMarketData';
import { useUserStore, useTrendsStore } from '@/lib/store';
import { Search, X, TrendingUp, Activity, Play } from 'lucide-react';
import TimeframeSelector from '@/components/TimeframeSelector';
import { useTrendScanner } from '@/lib/hooks/useTrendScanner';
import Link from 'next/link';

type SortField = 'price' | 'change24h' | 'rsi' | 'bobScore' | 'symbol' | 'volume24h';
type SortDirection = 'asc' | 'desc';

export default function AssetScreener() {
  const { settings, toggleFavorite, isLoaded, activeAsset, isFuturesMode, toggleFuturesMode } = useUserStore();
  const { trends } = useTrendsStore();
  const { assets, isLoading } = useMarketData();

  // Background Scanner only - Alerts UI moved to Analysis Engine
  useTrendScanner(assets);

  const [sortField, setSortField] = useState<SortField>('bobScore');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Command Palette State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global Key Listener for Type-Ahead
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Always allow Escape to close
      if (isSearchOpen && e.key === 'Escape') {
        e.preventDefault();
        setIsSearchOpen(false);
        setSearchQuery('');
        return;
      }

      // If search is closed but query exists, Escape clears it
      if (!isSearchOpen && searchQuery && e.key === 'Escape') {
        e.preventDefault();
        setSearchQuery('');
        return;
      }

      // Allow Enter to close but KEEP filter (Deep Search)
      if (isSearchOpen && e.key === 'Enter') {
        e.preventDefault();
        setIsSearchOpen(false);
        // Do NOT clear searchQuery
        return;
      }

      // Ignore if typing in an input or if modifiers are held
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      ) {
        return;
      }

      // If search is NOT open and key is alphanumeric, open search
      if (!isSearchOpen && /^[a-zA-Z0-9]$/.test(e.key)) {
        e.preventDefault();
        setIsSearchOpen(true);
        setSearchQuery(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, searchQuery]);

  // Focus input when search opens
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Command Palette Filtered Data
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return assets.filter(asset =>
      asset.symbol.toLowerCase().includes(query) ||
      asset.name.toLowerCase().includes(query)
    ).sort((a, b) => {
      // Prioritize exact symbol matches or startsWith
      const aStarts = a.symbol.toLowerCase().startsWith(query);
      const bStarts = b.symbol.toLowerCase().startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    }).slice(0, 7); // Limit results for clean UI
  }, [assets, searchQuery]);

  // Main Table Filter (No longer depends on searchQuery)
  const filteredAssets = useMemo(() => {
    if (!isLoaded) return [];

    return assets.filter(asset => {
      // 0. Sync Main List with Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!asset.symbol.toLowerCase().includes(query) && !asset.name.toLowerCase().includes(query)) {
          return false;
        }
      }

      // 1. Favorites Only
      if (settings.filters.favoritesOnly && !settings.favorites.includes(asset.id)) {
        return false;
      }
      // 2. RSI Range
      if (settings.filters.minRsi !== undefined && asset.rsi < settings.filters.minRsi) return false;
      if (settings.filters.maxRsi !== undefined && asset.rsi > settings.filters.maxRsi) return false;

      // 3. Bob Score
      if (settings.filters.minBobScore !== undefined && asset.bobScore < settings.filters.minBobScore) return false;

      // 4. Advanced Strategies
      if (settings.filters.oversold && asset.rsi >= 30) return false;

      const hasGoldenCross = asset.ema50 && asset.ema200 && asset.ema50 > asset.ema200;
      if (settings.filters.goldenCross && !hasGoldenCross) return false;

      const isUptrend = asset.ema20 && asset.price > asset.ema20;
      if (settings.filters.aboveEma20 && !isUptrend) return false;

      const isMacdBullish = asset.macd && asset.macd.histogram && asset.macd.histogram > 0;
      if (settings.filters.macdBullish && !isMacdBullish) return false;

      const isBBLow = asset.bb && asset.price < asset.bb.lower;
      if (settings.filters.bbLow && !isBBLow) return false;

      // 5. ICT Filters
      const signal = asset.ictAnalysis?.signal;
      if (settings.filters.ictBullishSweep && signal !== 'BULLISH_SWEEP') return false;
      if (settings.filters.ictBearishSweep && signal !== 'BEARISH_SWEEP') return false;
      if (settings.filters.ictBullishFVG && signal !== 'BULLISH_FVG') return false;
      if (settings.filters.ictBearishFVG && signal !== 'BEARISH_FVG') return false;

      return true;
    }).sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDir === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      return sortDir === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [settings, sortField, sortDir, isLoaded, assets, searchQuery]); // Removed isLoading from deps

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-zinc-600 ml-1">⇅</span>;
    return <span className="text-emerald-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  if (!isLoaded) return <div className="h-full flex items-center justify-center text-muted-foreground">Initializing...</div>;

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      <div className="p-4 border-b border-border bg-card flex justify-between items-center shrink-0 backdrop-blur-sm">
        <h2 className="text-lg font-medium text-foreground tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Market Screener
        </h2>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            {/* Timeframe Selector Moved Here */}
            <TimeframeSelector />

            <div className="flex items-center bg-muted p-1 rounded-lg border border-border/50 gap-1">
              <button
                onClick={() => { if (isFuturesMode) toggleFuturesMode(); }}
                className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 ${!isFuturesMode
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
              >
                SPOT
              </button>
              <button
                onClick={() => { if (!isFuturesMode) toggleFuturesMode(); }}
                className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 ${isFuturesMode
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500 shadow-emerald-900/20'
                  : 'text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10'}`}
              >
                PERPS
              </button>
            </div>

            <button
              onClick={() => { setIsSearchOpen(true); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 hover:bg-muted transition-all border border-transparent hover:border-border group ${searchQuery ? 'text-foreground font-medium ring-1 ring-emerald-500/20 bg-emerald-500/5' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Search className={`w-3.5 h-3.5 ${searchQuery ? 'text-emerald-500' : ''}`} />
              <span className="text-xs font-medium">{searchQuery || "Search"}</span>
              {!searchQuery && (
                <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 group-hover:text-foreground">
                  <span className="text-xs">A-Z</span>
                </kbd>
              )}
            </button>

            <div className="flex items-center gap-3 text-xs font-mono">
              {isLoading ? (
                <span className="text-amber-500 flex items-center gap-1.5 animate-pulse w-[80px]">
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  SYNCING
                </span>
              ) : (
                <span className="text-emerald-500 flex items-center gap-1.5 w-[80px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  LIVE
                </span>
              )}
              <span className="w-px h-3 bg-white/10"></span>
              <span className="text-muted-foreground">{filteredAssets.length} ASSETS</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar w-full">
        {isLoading && assets.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-2 border-zinc-800 border-t-emerald-500 animate-spin" />
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/10" />
            </div>
            <p className="text-xs font-mono tracking-widest uppercase">Initializing Uplink...</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-background/80 backdrop-blur-md shadow-sm border-b border-border">
              <tr>
                <th
                  className="py-3 px-2 lg:px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-300 transition-colors select-none whitespace-nowrap"
                  onClick={() => handleSort('symbol')}
                >
                  Asset <SortIcon field="symbol" />
                </th>
                <th
                  className="py-3 px-4 w-[120px] text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:text-zinc-300 transition-colors select-none"
                  onClick={() => handleSort('price')}
                >
                  Price <SortIcon field="price" />
                </th>
                <th
                  className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:text-zinc-300 transition-colors select-none"
                  onClick={() => handleSort('change24h')}
                >
                  24h% <SortIcon field="change24h" />
                </th>
                {isFuturesMode ? (
                  <>
                    <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">
                      Funding Rate
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">
                      Open Interest
                    </th>
                  </>
                ) : (
                  <th
                    className="py-3 px-4 w-[120px] text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:text-zinc-300 transition-colors select-none"
                    onClick={() => handleSort('volume24h')}
                  >
                    Vol (24h) <SortIcon field="volume24h" />
                  </th>
                )}
                <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">
                  Trend (4H/1H/15m)
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">
                  RSI (4H/1H/15m)
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">
                  MFI (4H/1H/15m)
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">
                  Strategy Matrix
                </th>
                <th
                  className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:text-zinc-300 transition-colors select-none"
                  onClick={() => handleSort('bobScore')}
                >
                  Score <SortIcon field="bobScore" />
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">
                  Act
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAssets.map((asset) => {
                const isGolden = asset.ema50 && asset.ema200 && asset.ema50 > asset.ema200;
                const isUptrend = asset.ema20 && asset.price > asset.ema20;
                const macdVal = asset.macd?.histogram;
                const isMacd = macdVal && macdVal > 0;
                // const isBbLow = asset.bb && asset.price < asset.bb.lower;
                const isActive = activeAsset === asset.symbol;

                const signal = asset.ictAnalysis?.signal;

                return (
                  <tr
                    key={asset.id}
                    className={`group transition-colors ${isActive ? 'bg-emerald-500/10' : 'hover:bg-muted/50'}`}
                  >
                    <td className="py-2.5 px-2 lg:px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted ring-1 ring-border flex items-center justify-center text-[10px] font-bold text-muted-foreground group-hover:text-foreground group-hover:ring-emerald-500/30 transition-all">
                          {asset.symbol[0]}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            {asset.symbol}
                            {/* Detailed badges */}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-medium">{asset.name}</div>
                        </div>
                        {/* Indicators Row inside Asset Column for density? No, keep it clean. */}

                      </div>
                    </td>
                    <td className="py-2.5 px-4 w-[120px] text-right font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors tabular-nums">
                      ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-mono text-sm font-medium ${asset.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {asset.change24h > 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                    </td>

                    {isFuturesMode ? (
                      <>
                        <td className={`py-2.5 px-4 text-right font-mono text-sm font-medium ${(asset.fundingRate || 0) > 0.01 ? 'text-emerald-400' :
                          (asset.fundingRate || 0) < 0 ? 'text-rose-400' : 'text-muted-foreground'
                          }`}>
                          {(asset.fundingRate || 0).toFixed(4)}%
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-sm text-muted-foreground">
                          {asset.openInterest ? `$${(asset.openInterest).toLocaleString()}` : '-'}
                        </td>
                      </>
                    ) : (
                      <td className="py-2.5 px-4 w-[120px] text-right font-mono text-sm text-muted-foreground tabular-nums">
                        <span className="text-foreground font-medium">{(asset.volume24h / 1000000).toFixed(1)}</span>
                        <span className="text-zinc-600 text-[10px] ml-0.5">M</span>
                      </td>
                    )}
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* 4H */}
                        <div className={`w-3 h-3 rounded-sm ${trends[asset.symbol]?.t4h === 'UP' ? 'bg-emerald-500' : trends[asset.symbol]?.t4h === 'DOWN' ? 'bg-rose-500' : 'bg-zinc-800'}`} title="4H Trend" />
                        {/* 1H */}
                        <div className={`w-3 h-3 rounded-sm ${trends[asset.symbol]?.t1h === 'UP' ? 'bg-emerald-500' : trends[asset.symbol]?.t1h === 'DOWN' ? 'bg-rose-500' : 'bg-zinc-800'}`} title="1H Trend" />
                        {/* 15m */}
                        <div className={`w-3 h-3 rounded-sm ${trends[asset.symbol]?.t15m === 'UP' ? 'bg-emerald-500' : trends[asset.symbol]?.t15m === 'DOWN' ? 'bg-rose-500' : 'bg-zinc-800'}`} title="15m Trend" />
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* 4H */}
                        <div className={`w-6 h-5 rounded flex items-center justify-center text-[9px] font-mono font-bold ${(trends[asset.symbol]?.rsi4h ?? 50) < 30 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          (trends[asset.symbol]?.rsi4h ?? 50) > 70 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50'}`}
                          title="4H RSI">
                          {(!trends[asset.symbol]?.rsi4h || isNaN(trends[asset.symbol]?.rsi4h as number)) ? '-' : trends[asset.symbol]?.rsi4h?.toFixed(0)}
                        </div>
                        {/* 1H */}
                        <div className={`w-6 h-5 rounded flex items-center justify-center text-[9px] font-mono font-bold ${(trends[asset.symbol]?.rsi1h ?? 50) < 30 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          (trends[asset.symbol]?.rsi1h ?? 50) > 70 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50'}`}
                          title="1H RSI">
                          {(!trends[asset.symbol]?.rsi1h || isNaN(trends[asset.symbol]?.rsi1h as number)) ? '-' : trends[asset.symbol]?.rsi1h?.toFixed(0)}
                        </div>
                        {/* 15m */}
                        <div className={`w-6 h-5 rounded flex items-center justify-center text-[9px] font-mono font-bold ${(trends[asset.symbol]?.rsi15m ?? 50) < 30 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          (trends[asset.symbol]?.rsi15m ?? 50) > 70 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50'}`}
                          title="15m RSI">
                          {(!trends[asset.symbol]?.rsi15m || isNaN(trends[asset.symbol]?.rsi15m as number)) ? '-' : trends[asset.symbol]?.rsi15m?.toFixed(0)}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* 4H */}
                        <div className={`w-6 h-5 rounded flex items-center justify-center text-[9px] font-mono font-bold ${(trends[asset.symbol]?.mfi4h ?? 50) < 20 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          (trends[asset.symbol]?.mfi4h ?? 50) > 80 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50'}`}
                          title="4H MFI">
                          {(!trends[asset.symbol]?.mfi4h || isNaN(trends[asset.symbol]?.mfi4h as number)) ? '-' : trends[asset.symbol]?.mfi4h?.toFixed(0)}
                        </div>
                        {/* 1H */}
                        <div className={`w-6 h-5 rounded flex items-center justify-center text-[9px] font-mono font-bold ${(trends[asset.symbol]?.mfi1h ?? 50) < 20 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          (trends[asset.symbol]?.mfi1h ?? 50) > 80 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50'}`}
                          title="1H MFI">
                          {(!trends[asset.symbol]?.mfi1h || isNaN(trends[asset.symbol]?.mfi1h as number)) ? '-' : trends[asset.symbol]?.mfi1h?.toFixed(0)}
                        </div>
                        {/* 15m */}
                        <div className={`w-6 h-5 rounded flex items-center justify-center text-[9px] font-mono font-bold ${(trends[asset.symbol]?.mfi15m ?? 50) < 20 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          (trends[asset.symbol]?.mfi15m ?? 50) > 80 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50'}`}
                          title="15m MFI">
                          {(!trends[asset.symbol]?.mfi15m || isNaN(trends[asset.symbol]?.mfi15m as number)) ? '-' : trends[asset.symbol]?.mfi15m?.toFixed(0)}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* RSI Indicator */}
                        <div className="flex flex-col items-center gap-0.5 group/ind">
                          <span className="text-[8px] text-zinc-600 font-mono group-hover/ind:text-zinc-400">RSI</span>
                          <div className={`w-2 h-2 rounded-full ${isNaN(asset.rsi) ? 'bg-zinc-800' : asset.rsi < 30 ? 'bg-emerald-500 animate-pulse shadow-[0_0_5px_currentColor]' : asset.rsi > 70 ? 'bg-rose-500 shadow-[0_0_5px_currentColor]' : 'bg-zinc-800'}`} />
                        </div>
                        {/* MACD Indicator */}
                        <div className="flex flex-col items-center gap-0.5 group/ind">
                          <span className="text-[8px] text-zinc-600 font-mono group-hover/ind:text-zinc-400">MCD</span>
                          <div className={`w-2 h-2 rounded-full ${(macdVal === undefined || isNaN(macdVal)) ? 'bg-zinc-800' : isMacd ? 'bg-emerald-500' : 'bg-rose-800'}`} />
                        </div>
                        {/* Trend Indicator */}
                        <div className="flex flex-col items-center gap-0.5 group/ind">
                          <span className="text-[8px] text-zinc-600 font-mono group-hover/ind:text-zinc-400">TRD</span>
                          <div className={`w-2 h-2 rounded-full ${isGolden ? 'bg-amber-400 animate-pulse' : isUptrend ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
                        </div>
                        {/* ICT Indicator */}
                        <div className="flex flex-col items-center gap-0.5 group/ind">
                          <span className="text-[8px] text-zinc-600 font-mono group-hover/ind:text-zinc-400">ICT</span>
                          <div className={`w-2 h-2 rounded-full ${signal?.includes('BULLISH') ? 'bg-emerald-500 shadow-[0_0_8px_currentColor]' : signal?.includes('BEARISH') ? 'bg-rose-500 shadow-[0_0_8px_currentColor]' : 'bg-zinc-800'}`} />
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex justify-end">
                        <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-1 ring-inset ${asset.bobScore > 60 ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30' :
                          asset.bobScore < 40 ? 'bg-rose-900/10 text-rose-500 ring-rose-500/20' :
                            'bg-muted text-muted-foreground ring-border'
                          }`}>
                          {asset.bobScore.toFixed(0)}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Play Button - Navigate to Analyze */}
                        <Link
                          href={`/analyze/${asset.symbol}`}
                          className="p-1.5 rounded-md transition-all text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 hover:scale-110"
                          title="Analyze"
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </Link>

                        {/* Favorite Star */}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(asset.id); }}
                          className={`p-1.5 rounded-md transition-all ${settings.favorites.includes(asset.id)
                            ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }`}
                          title="Favorite"
                        >
                          {settings.favorites.includes(asset.id) ? '★' : '☆'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-20 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      {isLoading ? (
                        <>
                          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          <p className="text-sm font-medium animate-pulse">Syncing {settings.timeframe} data...</p>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl opacity-20">∅</span>
                          <p className="text-sm font-medium">No assets match your criteria</p>
                          <p className="text-xs text-muted-foreground">Try adjusting the filters in the Analysis Engine</p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Command Palette Modal */}
      {
        isSearchOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative border-b border-border">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search symbol..."
                  className="w-full h-12 bg-transparent pl-11 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1.5">
                {searchResults.length > 0 ? (
                  <div className="space-y-1">
                    {searchResults.map((asset) => (
                      <button
                        key={asset.id}
                        onClick={() => {
                          setIsSearchOpen(false);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 group transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground ring-1 ring-border group-hover:ring-emerald-500/30">
                            {asset.symbol[0]}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-foreground">{asset.symbol}</div>
                            <div className="text-xs text-muted-foreground group-hover:text-emerald-500/80 transition-colors">{asset.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono text-foreground">${asset.price.toLocaleString()}</div>
                          <div className={`text-xs font-mono flex items-center justify-end gap-1 ${asset.change24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {asset.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                            {Math.abs(asset.change24h).toFixed(2)}%
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <p className="text-sm">No assets found</p>
                  </div>
                )}
              </div>

              <div className="px-3 py-2 bg-muted/20 border-t border-border flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Quick Select</span>
                <kbd className="inline-flex h-5 items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">ESC</span> to close
                </kbd>
              </div>
            </div>
            {/* Backdrop Click to Close */}
            <div className="absolute inset-0 -z-10" onClick={() => setIsSearchOpen(false)} />
          </div>
        )
      }
    </div >
  );
}
