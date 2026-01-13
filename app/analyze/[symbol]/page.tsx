"use client";

import { useUserStore } from "@/lib/store";

import React, { use, useState, useEffect } from "react";
import { StrategyProvider, useStrategy, AnalysisState } from "@/components/analysis/StrategyProvider";
import TradingViewChart from "@/components/analysis/TradingViewChart";
import { StrategyPanel } from "@/components/analysis/StrategyPanel";
import BobAIAdvisor from "@/components/BobAIAdvisor";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchHistoricalData } from "@/lib/services/market";
import { strategyRSIMFI } from "@/lib/engine/strategies/rsi-mfi-confluence";
import { strategyICT } from "@/lib/engine/strategies/ict";
import { Play, Settings2 } from "lucide-react";

// Wrapper to provide text context to BobAI based on strategy
function AnalysisAdvisor({ symbol }: { symbol: string }) {
    const { analysisState, strategyName } = useStrategy();
    const [analysisContext, setAnalysisContext] = useState("");

    useEffect(() => {
        if (analysisState) {
            setAnalysisContext(`
        Active Asset: ${symbol}
        Strategy: ${strategyName}
        Current State: ${analysisState.stage}
        Bias: ${analysisState.type}
        Timeframe: ${analysisState.timeframe}
        Price: ${analysisState.price}
        Confidence: ${analysisState.confidence}%
      `);
        } else {
            setAnalysisContext(`Analyzing ${symbol} for potential ${strategyName} setups...`);
        }
    }, [analysisState, symbol, strategyName]);

    return (
        <div className="h-full">
            <BobAIAdvisor
                contextOverride={analysisContext}
            />
        </div>
    );
}

const TV_INTERVALS = [
    { label: "1m", value: "1", api: "1m" },
    { label: "5m", value: "5", api: "5m" },
    { label: "15m", value: "15", api: "15m" },
    { label: "1h", value: "60", api: "1h" },
    { label: "4h", value: "240", api: "4h" },
    { label: "1d", value: "D", api: "1d" },
];

function TimeframeSelector({
    value,
    onChange,
    options
}: {
    value: string,
    onChange: (val: string) => void,
    options: typeof TV_INTERVALS
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="bg-transparent border-none text-xs font-mono cursor-pointer focus:ring-0 text-foreground"
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-background text-foreground">
                    {opt.label}
                </option>
            ))}
        </select>
    );
}

function AnalysisPageContent({ params }: { params: Promise<{ symbol: string }> }) {
    const { symbol } = use(params);
    const router = useRouter();
    const { setAnalysisState, strategyName, setStrategyName } = useStrategy();
    const { settings, isLoaded } = useUserStore();

    // Normalise symbol for API & Chart compatibility (e.g. BTC -> BTCUSDT)
    const pairSymbol = symbol.toUpperCase().endsWith("USDT")
        ? symbol.toUpperCase()
        : `${symbol.toUpperCase()}USDT`;

    // State for Timeframes (Default: Anchor=1h, Execution=1m)
    const [anchorTf, setAnchorTf] = useState("60");
    const [execTf, setExecTf] = useState("1");

    // Sync Anchor TF with Global Settings
    useEffect(() => {
        if (isLoaded && settings.timeframe) {
            const match = TV_INTERVALS.find(t => t.label.toLowerCase() === settings.timeframe.toLowerCase());
            if (match) setAnchorTf(match.value);
        }
    }, [isLoaded, settings.timeframe]);

    // Helper to get API interval from TV value
    const getApiInterval = (tvVal: string) => TV_INTERVALS.find(t => t.value === tvVal)?.api || "1h";

    useEffect(() => {
        // Poll for state based on ANCHOR timeframe
        const fetchAnalysis = async () => {
            try {
                const apiInterval = getApiInterval(anchorTf);
                const history = await fetchHistoricalData(pairSymbol, apiInterval);

                if (history && history.length > 50) {
                    let stateObj: AnalysisState;

                    if (strategyName === 'ICT') {
                        const ict = strategyICT(history);
                        const metadata = ict.metadata as {
                            sweep?: 'BULLISH' | 'BEARISH';
                            fvg?: 'BULLISH' | 'BEARISH';
                            killzone?: string;
                            isHighProbability?: boolean;
                        };

                        // Reconstruct Signal String for UI
                        let signalString = 'NONE';
                        if (metadata?.sweep === 'BULLISH') signalString = 'BULLISH_SWEEP';
                        else if (metadata?.sweep === 'BEARISH') signalString = 'BEARISH_SWEEP';
                        else if (metadata?.fvg === 'BULLISH') signalString = 'BULLISH_FVG';
                        else if (metadata?.fvg === 'BEARISH') signalString = 'BEARISH_FVG';

                        stateObj = {
                            id: `${symbol}-${Date.now()}`,
                            symbol: symbol,
                            timestamp: Date.now(),
                            type: signalString === 'NONE' ? 'NEUTRAL' :
                                signalString.includes('BULLISH') ? 'SCALP_LONG' : 'SCALP_SHORT',
                            stage: signalString,
                            confidence: metadata?.isHighProbability ? 85 : 50,
                            price: history[history.length - 1].close,
                            timeframe: apiInterval,
                            metadata: { killzone: metadata?.killzone }
                        };
                    } else {
                        // RSI + MFI
                        const res = strategyRSIMFI(history);
                        const side = res.metadata?.side as string; // 'LONG' | 'SHORT'

                        stateObj = {
                            id: `${symbol}-${Date.now()}`,
                            symbol: symbol,
                            timestamp: Date.now(),
                            type: res.status === 'ENTRY' ? (side === 'LONG' ? 'SCALP_LONG' : 'SCALP_SHORT') : 'NEUTRAL',
                            stage: res.status === 'ENTRY' ? 'ENTRY_SIGNAL' : 'MONITORING',
                            confidence: 75, // Static for now
                            price: history[history.length - 1].close,
                            timeframe: apiInterval,
                            metadata: res.metadata
                        };
                    }

                    setAnalysisState(stateObj);
                }
            } catch (e) {
                console.error(e);
            }
        };

        fetchAnalysis();
        const interval = setInterval(fetchAnalysis, 60000);
        return () => clearInterval(interval);
    }, [pairSymbol, anchorTf, setAnalysisState, symbol, strategyName]);

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
            {/* Header / Nav */}
            <header className="flex items-center justify-between p-4 border-b border-border h-16 shrink-0 z-50 bg-background/95 backdrop-blur">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/")}
                        className="p-2 hover:bg-accent rounded-md transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
                            {symbol}
                            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                {strategyName} Analysis
                            </span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Strategy Selector */}
                    <div className="relative group">
                        <select
                            value={strategyName}
                            onChange={(e) => setStrategyName(e.target.value)}
                            className="bg-muted/50 border border-border text-xs rounded-md pl-3 pr-8 py-1.5 focus:ring-1 focus:ring-primary appearance-none cursor-pointer hover:bg-muted transition-colors"
                        >
                            <option value="ICT">Strategy: ICT</option>
                            <option value="RSI_MFI">Strategy: RSI+MFI</option>
                        </select>
                        <Settings2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    </div>

                    {/* Backtest Button */}
                    <button
                        onClick={() => router.push(`/backtest?symbol=${symbol}&strategy=${strategyName}&timeframe=${getApiInterval(anchorTf)}`)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-xs font-medium rounded-md border border-emerald-500/20 transition-all"
                    >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Backtest This
                    </button>
                </div>
            </header>

            {/* Main Content: Split View */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

                {/* Charts Container */}
                <div className="flex-1 flex flex-col h-full relative">
                    {/* Split Screen Charts */}
                    <div className="flex-1 flex flex-col md:flex-row h-full">

                        {/* Anchor Chart (Left/Top) */}
                        <div className="flex-1 border-r border-border flex flex-col min-h-[300px]">
                            <div className="flex items-center justify-between px-2 py-1 bg-background/50 border-b border-border text-xs font-mono text-muted-foreground">
                                <span>ANCHOR CHART</span>
                                <TimeframeSelector
                                    value={anchorTf}
                                    onChange={setAnchorTf}
                                    options={TV_INTERVALS}
                                />
                            </div>
                            <div className="flex-1 relative">
                                <TradingViewChart
                                    symbol={pairSymbol}
                                    interval={anchorTf}
                                    containerId={`tv-anchor-${symbol}`}
                                />
                            </div>
                        </div>

                        {/* Execution Chart (Right/Bottom) */}
                        <div className="flex-1 flex flex-col min-h-[300px]">
                            <div className="flex items-center justify-between px-2 py-1 bg-background/50 border-b border-border text-xs font-mono text-muted-foreground">
                                <span>EXECUTION CHART</span>
                                <TimeframeSelector
                                    value={execTf}
                                    onChange={setExecTf}
                                    options={TV_INTERVALS}
                                />
                            </div>
                            <div className="flex-1 relative">
                                <TradingViewChart
                                    symbol={pairSymbol}
                                    interval={execTf}
                                    containerId={`tv-exec-${symbol}`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Strategy Panel Overlay (Bottom) */}
                    <div className="shrink-0 z-20">
                        <StrategyPanel />
                    </div>
                </div>

                {/* AI Advisor Sidebar (Desktop: Right) */}
                <div className="hidden lg:block w-[350px] border-l border-border h-full overflow-y-auto bg-card/20">
                    <div className="p-4 h-full">
                        <AnalysisAdvisor symbol={symbol} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AnalysisPage(props: { params: Promise<{ symbol: string }> }) {
    return (
        <StrategyProvider>
            <AnalysisPageContent {...props} />
        </StrategyProvider>
    );
}
