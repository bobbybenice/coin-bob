'use client';

import { useState } from 'react';
import AssetScreener from '@/components/AssetScreener';
import AnalysisEngine from '@/components/AnalysisEngine';
import BobAIAdvisor from '@/components/BobAIAdvisor';
import NewsFeed from '@/components/NewsFeed';
import { ThemeToggle } from '@/components/theme-toggle';
import { LayoutDashboard, Settings2, Zap } from 'lucide-react';

export default function Home() {
  const [mobileTab, setMobileTab] = useState<'market' | 'analysis' | 'intel'>('market');

  return (
    <div className="h-screen max-h-screen bg-background font-sans text-foreground selection:bg-emerald-500/30 overflow-hidden flex flex-col">
      {/* Mobile Top Bar */}
      <div className="lg:hidden h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="font-bold text-lg tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          CoinBob
        </div>
        <ThemeToggle />
      </div>

      {/* Desktop Toggle (Absolute) */}
      <div className="hidden lg:block absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {/* DESKTOP LAYOUT (Grid) - Hidden on Mobile */}
        <div className="hidden lg:grid grid-cols-4 grid-rows-[minmax(0,1fr)_auto] gap-6 p-4 h-full">
          {/* Main Content Area: Screener */}
          <main className="col-span-3 row-span-1 h-full overflow-hidden rounded-xl border border-border bg-card">
            <AssetScreener />
          </main>

          {/* Right Sidebar: Analysis Engine */}
          <aside className="col-span-1 row-span-2 flex flex-col gap-4 h-full overflow-hidden">
            <div className="h-full rounded-xl border border-border bg-card overflow-hidden">
              <AnalysisEngine />
            </div>
          </aside>

          {/* Bottom Area: BobAI Advisor & News */}
          <section className="col-span-3 h-64 grid grid-cols-3 gap-6">
            <div className="col-span-2 rounded-xl border border-border bg-card overflow-hidden h-full">
              <BobAIAdvisor />
            </div>
            <div className="col-span-1 rounded-xl border border-border bg-card overflow-hidden h-full">
              <NewsFeed />
            </div>
          </section>
        </div>

        {/* MOBILE LAYOUT (Tabs) - Hidden on Desktop */}
        <div className="lg:hidden h-full w-full">
          {mobileTab === 'market' && (
            <div className="h-full w-full">
              <AssetScreener />
            </div>
          )}
          {mobileTab === 'analysis' && (
            <div className="h-full w-full bg-card">
              <AnalysisEngine />
            </div>
          )}
          {mobileTab === 'intel' && (
            <div className="h-full w-full flex flex-col bg-muted/10">
              <div className="flex-1 overflow-hidden border-b border-border">
                <BobAIAdvisor />
              </div>
              <div className="flex-1 overflow-hidden">
                <NewsFeed />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden h-16 border-t border-border bg-card flex items-center justify-around shrink-0 pb-safe">
        <button
          onClick={() => setMobileTab('market')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${mobileTab === 'market' ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-medium">Market</span>
        </button>
        <button
          onClick={() => setMobileTab('analysis')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${mobileTab === 'analysis' ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Settings2 size={20} />
          <span className="text-[10px] font-medium">Analysis</span>
        </button>
        <button
          onClick={() => setMobileTab('intel')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${mobileTab === 'intel' ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Zap size={20} />
          <span className="text-[10px] font-medium">Intel</span>
        </button>
      </div>
    </div>
  );
}
