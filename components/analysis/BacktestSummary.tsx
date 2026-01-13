'use client';

import { Activity } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BacktestSummaryProps {
    results: any;
    strategy: string;
    symbol: string;
    timeframe: string;
}

export default function BacktestSummary({ results, strategy, symbol, timeframe }: BacktestSummaryProps) {
    const [summary, setSummary] = useState<string[]>([]);

    useEffect(() => {
        if (!results) return;

        const generate = () => {
            const lines: string[] = [];

            // 1. Overview
            const pnlPrefix = results.pnl >= 0 ? '+' : '-';
            const performance = results.pnl >= 0 ? 'PROFITABLE' : 'UNPROFITABLE';
            lines.push(`ANALYSIS COMPLETE: ${strategy} on ${symbol} [${timeframe}] is ${performance}.`);
            lines.push(`Net Result: ${pnlPrefix}$${Math.abs(results.pnl).toFixed(2)} across ${results.totalTrades} trades.`);

            // 2. Logic & Exit Strategy Explanation
            lines.push(''); // Spacer
            lines.push('--- STRATEGY LOGIC ---');

            if (strategy === 'ICT') {
                lines.push('• ENTRY: Aggressive entry on Liquidity Sweeps (Raiding Swing Highs/Lows).');
                lines.push('• FILTER: Trades are filtered by London/New York Killzones for high probability.');
                lines.push('• EXIT: Dynamic Stop Loss at swing points. Take Profit targets 2:1 Reward/Risk ratio.');
            } else if (strategy === 'RSI_MFI') {
                lines.push('• ENTRY: Mean Reversion Confluence (RSI < 30 AND MFI < 30 for Longs).');
                lines.push(`• MOMENTUM: Volatility capture logic.`);
                lines.push('• EXIT: Fixed Bracket + Mean Reversion.');
                lines.push('  - Stop Loss: 3% from entry (Hard Stop).');
                lines.push('  - Take Profit: 6% from entry (2R Target).');
                lines.push('  - Soft Exit: Momentum Neutralizes (RSI ~50).');
            }

            // 3. AI Insights
            lines.push('');
            lines.push('--- AI INSIGHTS ---');

            if (results.winRate > 60) {
                lines.push(`High Win Rate (${results.winRate.toFixed(1)}%) suggests strong signal reliability.`);
            } else if (results.winRate < 40) {
                lines.push(`Low Win Rate (${results.winRate.toFixed(1)}%). Consider tightening Stop Losses or confirming with trend direction.`);
            } else {
                lines.push(`Win Rate is balanced (${results.winRate.toFixed(1)}%). Profitability depends heavily on R:R ratio.`);
            }

            if (results.totalTrades < 5) {
                lines.push('WARNING: Low sample size. Results may not be statistically significant.');
            }

            return lines;
        };

        setSummary(generate());
    }, [results, strategy, symbol, timeframe]);

    if (!results) return null;

    return (
        <div className="bg-card border border-border rounded-xl p-6 h-fit mt-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                AI Strategy Analysis
            </h2>

            <div className="font-mono text-xs md:text-sm leading-relaxed text-muted-foreground bg-muted/20 p-4 rounded-lg border border-border">
                {summary.map((line, i) => (
                    <div key={i} className={`mb-1 ${line.startsWith('---') ? 'text-indigo-400 font-bold mt-2' : ''} ${line.includes('PROFITABLE') ? 'text-emerald-500 font-bold' : ''} ${line.includes('UNPROFITABLE') ? 'text-rose-500 font-bold' : ''}`}>
                        {line}
                    </div>
                ))}
                <div className="mt-4 flex items-center gap-2 animate-pulse text-indigo-500">
                    <span className="w-2 h-4 bg-indigo-500 block"></span>
                    <span>Waiting for command...</span>
                </div>
            </div>
        </div>
    );
}
