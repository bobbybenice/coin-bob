'use client';

import { useEffect, useState } from 'react';
import { useTrendsStore } from '@/lib/store';
import { useMarketData } from '@/lib/hooks/useMarketData';
import { useAlerts } from '@/lib/hooks/useAlerts';

export default function SignalMonitor() {
    const { trends } = useTrendsStore();
    const { assets } = useMarketData();
    const { triggerAlert } = useAlerts();

    // Migrated state for Alerts
    // Note: In the original AnalysisEngine, this was initialized to false and never changed.
    // If we want alerts to actually work, this should default to true or be toggleable?
    // For now, I will keep it logic-equivalent but enable it if the user wants "God Mode" alerts active.
    // Let's assume always active for now, or controlled by settings?
    // The previous code had: const [alertsEnabled] = useState(false);
    // Which means it essentially did nothing. I will fix this to be true by default, or better yet, check settings?
    // User requested "Performance Optimization", not "Enable Alerts".
    // I will set it to false to strictly match previous behavior (and avoid spamming alerts if that was the intent).
    // However, the code logic implies it *should* work. I'll stick to false for safety, but make it easily toggleable.
    const [alertsEnabled] = useState(false);

    useEffect(() => {
        if (!alertsEnabled) return;

        assets.forEach(asset => {
            const assetTrend = trends[asset.symbol];
            const signal = asset.ictAnalysis?.signal;
            if (signal && signal !== 'NONE') {
                if (assetTrend) {
                    const isBullish = signal.includes('BULLISH');
                    const isBearish = signal.includes('BEARISH');
                    // Alert if 4H trend aligns with signal (High Probability)
                    const aligned = (isBullish && assetTrend.t4h === 'UP') || (isBearish && assetTrend.t4h === 'DOWN');

                    if (aligned) {
                        triggerAlert(asset, signal);
                    }
                }
            }
        });
    }, [assets, alertsEnabled, trends, triggerAlert]);

    return null; // Logic monitoring only
}
