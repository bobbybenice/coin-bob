'use client';

import { use } from 'react';
import { MultiChartView } from '@/components/analyze/MultiChartView';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface AnalyzePageProps {
    params: Promise<{
        symbol: string;
    }>;
}

/**
 * Analyze Page - Multi-chart analysis view for selected asset
 */
export default function AnalyzePage({ params }: AnalyzePageProps) {
    const { symbol } = use(params);

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header */}
            <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card shrink-0">
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Back to Screener</span>
                    </Link>

                    <div className="w-px h-6 bg-border" />

                    <div>
                        <h1 className="text-xl font-bold text-foreground">{symbol}</h1>
                        <p className="text-xs text-muted-foreground">Multi-Timeframe Analysis</p>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="flex-1 overflow-hidden">
                <MultiChartView symbol={symbol} />
            </div>
        </div>
    );
}
