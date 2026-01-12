'use client';

import { useWhaleData } from '@/lib/hooks/useWhaleData';
import { ArrowRight } from 'lucide-react';

export default function WhaleTracker() {
    const { transactions, isLoading, error } = useWhaleData();

    if (isLoading && transactions.length === 0) {
        return (
            <div className="flex flex-col h-full bg-card">
                <div className="p-3 border-b border-border flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                    <span className="font-bold text-sm tracking-tight text-orange-400">WHALE WATCHER (BTC)</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                    </span>
                    <span className="text-xs text-muted-foreground animate-pulse">
                        Connecting to Bitcoin membrane...
                    </span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col h-full bg-card">
                <div className="p-3 border-b border-border flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted"></div>
                    <span className="font-bold text-sm tracking-tight text-muted-foreground">WHALE WATCHER</span>
                </div>
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs p-4">
                    Status: {error}
                </div>
            </div>
        );
    }

    // Initial empty state while waiting for first transaction
    if (transactions.length === 0) {
        return (
            <div className="flex flex-col h-full bg-card">
                <div className="p-3 border-b border-border flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span className="font-bold text-sm tracking-tight text-orange-400">WHALE WATCHER (BTC)</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs p-4 text-center gap-2">
                    <span className="text-2xl">📡</span>
                    <span>Listening for transactions &gt; $1M...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-card">
            <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                    <span className="font-bold text-sm tracking-tight text-orange-400">WHALE WATCHER (BTC)</span>
                </div>
                <div className="text-[10px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/20">
                    $1M+
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-0">
                <div className="divide-y divide-border/50">
                    {transactions.map((tx) => (
                        <div key={tx.id} className="p-3 hover:bg-muted/30 transition-colors flex flex-col gap-1.5 group">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-sm text-foreground">{tx.symbol}</span>
                                    <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded uppercase tracking-wider">{tx.blockchain}</span>
                                </div>
                                <span className="text-xs font-mono font-medium text-orange-300">
                                    ${(tx.amount_usd / 1000000).toFixed(1)}M
                                </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                                    <span className="truncate" title={tx.from.owner || tx.from.address}>
                                        {tx.from.owner_type === 'exchange' ? '🏦 ' : ''}
                                        {tx.from.owner || 'Unknown Wallet'}
                                    </span>
                                </div>
                                <ArrowRight size={10} className="text-muted-foreground/50 shrink-0" />
                                <div className="flex items-center gap-1.5 truncate max-w-[120px] justify-end">
                                    <span className="truncate" title={tx.to.owner || tx.to.address}>
                                        {tx.to.owner_type === 'exchange' ? '🏦 ' : ''}
                                        {tx.to.owner || 'Unknown Wallet'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
