'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useMarketData } from '@/lib/hooks/useMarketData';
import { useFearAndGreed } from '@/lib/hooks/useFearAndGreed';
import { useUserStore } from '@/lib/store';
import { Search, X, TrendingUp, Activity, Gauge } from 'lucide-react';

type SortField = 'price' | 'change24h' | 'rsi' | 'bobScore' | 'symbol';
type SortDirection = 'asc' | 'desc';

export default function AssetScreener() {
  const { settings, toggleFavorite, isLoaded, activeAsset, setActiveAsset } = useUserStore();
  const { assets, isLoading, error } = useMarketData();
  const { data: fngData, isLoading: isFngLoading } = useFearAndGreed();
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
    if (!isLoaded || isLoading) return [];

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
  }, [settings, sortField, sortDir, isLoaded, assets, isLoading, searchQuery]);

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



            {isFngLoading ? (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/30 border border-border animate-pulse">
                <span className="w-16 h-3 bg-muted rounded"></span>
              </div>
            ) : error ? (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-rose-500/10 border border-rose-500/20" title={error}>
                <Gauge className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-xs font-bold text-rose-500">N/A</span>
              </div>
            ) : fngData && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/30">
                <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">F&G:</span>
                <span className={`text-xs font-bold ${fngData.value >= 75 ? 'text-blue-500' :
                  fngData.value >= 50 ? 'text-emerald-500' :
                    fngData.value >= 25 ? 'text-amber-500' :
                      'text-rose-500'
                  }`}>
                  {fngData.value}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase opacity-70">
                  {fngData.value_classification}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 text-xs font-mono">
              {isLoading ? (
                <span className="text-emerald-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  LIVE FEED
                </span>
              ) : (
                <span className="text-muted-foreground">FEED ACTIVE</span>
              )}
              <span className="w-px h-3 bg-white/10"></span>
              <span className="text-muted-foreground">{filteredAssets.length} ASSETS</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
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
                  className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-300 transition-colors select-none"
                  onClick={() => handleSort('symbol')}
                >
                  Asset <SortIcon field="symbol" />
                </th>
                <th
                  className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:text-zinc-300 transition-colors select-none"
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
                <th
                  className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:text-zinc-300 transition-colors select-none"
                  onClick={() => handleSort('rsi')}
                >
                  RSI <SortIcon field="rsi" />
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
                const isMacd = asset.macd && asset.macd.histogram && asset.macd.histogram > 0;
                // const isBbLow = asset.bb && asset.price < asset.bb.lower;
                const isActive = activeAsset === asset.symbol;

                return (
                  <tr
                    key={asset.id}
                    onClick={() => setActiveAsset(isActive ? null : asset.symbol)}
                    className={`group transition-colors cursor-pointer ${isActive ? 'bg-emerald-500/10 hover:bg-emerald-500/20' : 'hover:bg-muted/50'}`}
                  >
                    <td className="py-2.5 px-4">
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
                        <div className="flex gap-1 ml-2 opacity-50 group-hover:opacity-100 transition-opacity">
                          {isGolden && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]" title="Golden Cross"></div>}
                          {isUptrend && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" title="Uptrend"></div>}
                          {isMacd && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" title="MACD Bullish"></div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-mono text-sm font-medium ${asset.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {asset.change24h > 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-bold min-w-[32px] justify-center ${asset.rsi < 30 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        asset.rsi > 70 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          'text-muted-foreground bg-muted/40'
                        }`}>
                        {asset.rsi.toFixed(0)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex justify-end">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-1 ring-inset ${asset.bobScore > 80 ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-900/10 text-emerald-400 ring-emerald-500/30' :
                          asset.bobScore > 50 ? 'bg-muted text-muted-foreground ring-border' :
                            'bg-rose-900/10 text-rose-500 ring-rose-500/20'
                          }`}>
                          {asset.bobScore.toFixed(0)}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(asset.id); }}
                        className={`p-1.5 rounded-md transition-all ${settings.favorites.includes(asset.id)
                          ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }`}
                      >
                        {settings.favorites.includes(asset.id) ? '★' : '☆'}
                      </button>
                    </td>
                  </tr>
                )
              })}

              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-2xl opacity-20">∅</span>
                      <p className="text-sm font-medium">No assets match your criteria</p>
                      <p className="text-xs text-muted-foreground">Try adjusting the filters in the Analysis Engine</p>
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
                          setActiveAsset(asset.symbol);
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
