import AssetScreener from '@/components/AssetScreener';
import AnalysisEngine from '@/components/AnalysisEngine';
import BobAIAdvisor from '@/components/BobAIAdvisor';
import NewsFeed from '@/components/NewsFeed';

import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 lg:grid-rows-[minmax(0,1fr)_auto] gap-6 p-4 h-screen max-h-screen overflow-hidden bg-background font-sans text-foreground selection:bg-emerald-500/30 relative">
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      {/* Main Content Area: Screener */}
      <main className="flex-1 lg:col-span-3 lg:row-span-1 min-h-[500px] lg:min-h-0 lg:h-full overflow-hidden order-1 rounded-xl border border-border bg-card">
        <AssetScreener />
      </main>

      {/* Right Sidebar: Analysis Engine */}
      <aside className="lg:col-span-1 lg:row-span-2 flex flex-col gap-4 h-full order-3 lg:order-2 overflow-hidden">
        <div className="h-full rounded-xl border border-border bg-card overflow-hidden">
          <AnalysisEngine />
        </div>
      </aside>

      {/* Bottom Area: BobAI Advisor & News */}
      <section className="lg:col-span-3 h-auto lg:h-64 order-2 lg:order-3 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden h-64 lg:h-full">
          <BobAIAdvisor />
        </div>
        <div className="lg:col-span-1 rounded-xl border border-border bg-card overflow-hidden h-64 lg:h-full">
          <NewsFeed />
        </div>
      </section>
    </div>
  );
}
