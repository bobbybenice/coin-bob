'use client';

import { useState, useMemo, useEffect } from 'react';
import { useMarketData } from '@/lib/hooks/useMarketData';
import { useUserStore, useTrendsStore } from '@/lib/store';
import { Search } from 'lucide-react';
import TimeframeSelector from '@/components/TimeframeSelector';
import { useTrendScanner } from '@/lib/hooks/useTrendScanner';
import CommandPalette from './ui/CommandPalette';
import AssetRow from './ui/AssetRow';
import { Button } from './ui/Button';
import { useRouter } from 'next/navigation';
import { STRATEGIES } from '@/lib/engine/strategies';
import { StrategyName } from '@/lib/types';

type SortField = 'price' | 'symbol' | StrategyName | 'bias';
type SortDirection = 'asc' | 'desc';

export default function AssetScreener() {
  const router = useRouter();
  const { settings, isLoaded, activeAsset } = useUserStore();
  const { trends } = useTrendsStore();
  const { assets, isLoading } = useMarketData();

  // Background Scanner only - Alerts UI moved to Analysis Engine
  useTrendScanner(assets);

  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  // Helper: Count LONG/SHORT signals for a strategy
  const getStrategyScore = (assetSymbol: string, strategy: StrategyName): number => {
    const trend = trends[assetSymbol];
    if (!trend?.strategies) return -1000; // Put assets without data at the end

    const signals = trend.strategies[strategy];
    if (!signals) return -1000;

    let longCount = 0;
    let shortCount = 0;

    ['5m', '15m', '30m', '1h', '4h', '1d'].forEach((tf) => {
      if (signals[tf] === 'LONG') longCount++;
      if (signals[tf] === 'SHORT') shortCount++;
    });

    // Create a score that properly ranks assets
    // For bullish (desc): prioritize LONG count, penalize SHORT count
    // For bearish (asc): prioritize SHORT count, penalize LONG count
    if (sortDir === 'desc') {
      // Bullish: (LONG * 10) - SHORT
      // Example: 3 LONG, 0 SHORT = 30, beats 1 LONG, 0 SHORT = 10
      return (longCount * 10) - shortCount;
    } else {
      // Bearish: (SHORT * 10) - LONG
      // Example: 3 SHORT, 0 LONG = 30, beats 1 SHORT, 0 LONG = 10
      return (shortCount * 10) - longCount;
    }
  };

  // Helper: Count bullish/bearish consensus in BIAS column
  const getBiasScore = (assetSymbol: string): number => {
    const trend = trends[assetSymbol];
    if (!trend?.strategies) return -1000;

    let bullishCount = 0;
    let bearishCount = 0;

    ['5m', '15m', '30m', '1h', '4h', '1d'].forEach((tf) => {
      // Calculate consensus for this timeframe
      let bull = 0;
      let bear = 0;

      if (trend.strategies) {
        Object.values(trend.strategies).forEach((stratMap) => {
          const sig = stratMap[tf];
          if (sig === 'LONG') bull++;
          else if (sig === 'SHORT') bear++;
        });
      }

      if (bull > bear) bullishCount++;
      else if (bear > bull) bearishCount++;
    });

    // Create a score that properly ranks assets
    if (sortDir === 'desc') {
      // Bullish: (bullish * 10) - bearish
      return (bullishCount * 10) - bearishCount;
    } else {
      // Bearish: (bearish * 10) - bullish
      return (bearishCount * 10) - bullishCount;
    }
  };

  // Command Palette State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Global Keydown Listener for "Type to Search" and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Escape: Reset search if not in modal (modal handles its own escape)
      if (e.key === 'Escape' && !isSearchOpen) {
        setSearchQuery('');
        return;
      }

      // 2. Type to Search (if Not in Input)
      if (
        !isSearchOpen &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault(); // Prevent browser from typing the char again (duplicates)
        setSearchQuery(e.key); // Capture first char and reset previous query
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  // Main Table Filter
  const filteredAssets = useMemo(() => {
    if (!isLoaded) return [];

    return assets.filter(asset => {
      // 0. Text Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!asset.symbol.toLowerCase().includes(query) && !asset.name.toLowerCase().includes(query)) {
          return false;
        }
      }



      // 2. RSI Range
      if (settings.filters.minRsi !== undefined && asset.rsi < settings.filters.minRsi) return false;
      if (settings.filters.maxRsi !== undefined && asset.rsi > settings.filters.maxRsi) return false;




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
      // Strategy column sorting
      if (sortField !== 'price' && sortField !== 'symbol') {
        if (sortField === 'bias') {
          const aScore = getBiasScore(a.symbol);
          const bScore = getBiasScore(b.symbol);
          return bScore - aScore; // Higher score first
        } else {
          // Strategy sorting
          const aScore = getStrategyScore(a.symbol, sortField as StrategyName);
          const bScore = getStrategyScore(b.symbol, sortField as StrategyName);
          return bScore - aScore; // Higher score first
        }
      }

      // Default sorting for price/symbol
      if (sortField === 'price' || sortField === 'symbol') {
        const aValue = a[sortField];
        const bValue = b[sortField];

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDir === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }

        return sortDir === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }

      return 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, sortField, sortDir, isLoaded, assets, searchQuery, trends]);

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

    // For strategy columns: desc = bullish (green ↓), asc = bearish (red ↑)
    const isDescending = sortDir === 'desc';
    const color = isDescending ? 'text-emerald-500' : 'text-rose-500';
    const arrow = isDescending ? '↓' : '↑';

    return <span className={`${color} ml-1`}>{arrow}</span>;
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

            <div className="hidden">
              {/* Space reserved for future filters if needed */}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => { setIsSearchOpen(true); }}
              className="flex items-center gap-2 bg-muted/50 border-transparent hover:border-border group text-muted-foreground hover:text-foreground"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Search</span>
              <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 group-hover:text-foreground">
                <span className="text-xs">A-Z</span>
              </kbd>
            </Button>

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

                {/* REMOVED: 24h% / Vol / Funding / Open Interest */}
                {/* REMOVED: Trend / RSI / MFI */}

                {/* Dynamic Strategy Columns */}
                {settings.visibleStrategies?.map((strategy) => (
                  <th
                    key={strategy}
                    className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center cursor-pointer hover:text-zinc-300 transition-colors select-none"
                    onClick={() => handleSort(strategy as SortField)}
                  >
                    {STRATEGIES[strategy]?.displayName || strategy} <SortIcon field={strategy as SortField} />
                  </th>
                ))}

                <th
                  className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center border-l border-white/5 bg-black/20 cursor-pointer hover:text-zinc-300 transition-colors select-none"
                  onClick={() => handleSort('bias')}
                >
                  BIAS <SortIcon field="bias" />
                </th>

                <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">
                  Analyze
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAssets.map((asset) => (
                <AssetRow
                  key={asset.id}
                  asset={asset}
                  trend={trends[asset.symbol]}
                  isActive={activeAsset === asset.symbol}
                  settings={settings}
                  onAnalyze={(symbol) => router.push(`/analyze/${symbol}`)}
                />
              ))}

              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-20 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      {isLoading ? (
                        <>
                          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          <p className="text-sm font-medium animate-pulse">Syncing {settings.timeframe} data...</p>
                        </>
                      ) : assets.length === 0 ? (
                        <>
                          <span className="text-2xl opacity-20">⚠</span>
                          <p className="text-sm font-medium">Data Unavailable</p>
                          <p className="text-xs text-muted-foreground w-64">
                            Unable to fetch Futures data. This may be due to regional restrictions or API limits.
                          </p>
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

      <CommandPalette
        assets={assets}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        currentQuery={searchQuery}
        onQueryChange={setSearchQuery}
        onSearch={(query) => {
          setSearchQuery(query);
          setIsSearchOpen(false);
        }}
        onClear={() => setSearchQuery('')}
      />
    </div >
  );
}
