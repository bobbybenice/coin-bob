"use client";

import React, { use, useState, useEffect } from "react";
import { StrategyProvider, useStrategy } from "@/components/analysis/StrategyProvider";
import TradingViewChart from "@/components/analysis/TradingViewChart";
import { StrategyPanel } from "@/components/analysis/StrategyPanel";
import BobAIAdvisor from "@/components/BobAIAdvisor";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchHistoricalData } from "@/lib/services/market";
import { analyzeICT } from "@/lib/services/ict-engine";
import { ICTSignal } from "@/lib/types";

// Wrapper to provide text context to BobAI based on strategy
function AnalysisAdvisor({ symbol }: { symbol: string }) {
    const { ictState } = useStrategy();
    const [analysisContext, setAnalysisContext] = useState("");

    useEffect(() => {
        if (ictState) {
            setAnalysisContext(`
        Active Asset: ${symbol}
        Strategy: ICT (Inner Circle Trader)
        Current State: ${ictState.stage}
        Bias: ${ictState.type}
        Timeframe: ${ictState.timeframe}
        Killzone: ${ictState.killzoneLabel || "None"}
        Price: ${ictState.price}
        Confidence: ${ictState.confidence}%
      `);
        } else {
            setAnalysisContext(`Analyzing ${symbol} for potential ICT setups...`);
        }
    }, [ictState, symbol]);

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
    const { setICTState } = useStrategy();

    // Normalise symbol for API & Chart compatibility (e.g. BTC -> BTCUSDT)
    const pairSymbol = symbol.toUpperCase().endsWith("USDT")
        ? symbol.toUpperCase()
        : `${symbol.toUpperCase()}USDT`;

    // State for Timeframes (Default: Anchor=1h, Execution=1m)
    const [anchorTf, setAnchorTf] = useState("60");
    const [execTf, setExecTf] = useState("1");

    // Helper to get API interval from TV value
    const getApiInterval = (tvVal: string) => TV_INTERVALS.find(t => t.value === tvVal)?.api || "1h";

    useEffect(() => {
        // Poll for ICT state based on ANCHOR timeframe
        const fetchAnalysis = async () => {
            try {
                const apiInterval = getApiInterval(anchorTf);
                const history = await fetchHistoricalData(pairSymbol, apiInterval);

                if (history && history.length > 50) {
                    const signalAnalysis = analyzeICT(history);

                    const stateObj = {
                        id: `${symbol}-${Date.now()}`,
                        symbol: symbol,
                        timestamp: Date.now(),
                        type: signalAnalysis.signal === 'NONE' ? 'NEUTRAL' :
                            signalAnalysis.signal.includes('BULLISH') ? 'SCALP_LONG' : 'SCALP_SHORT',
                        stage: signalAnalysis.signal,
                        confidence: signalAnalysis.isHighProbability ? 85 : 50,
                        price: history[history.length - 1].close,
                        timeframe: apiInterval,
                        killzoneLabel: signalAnalysis.killzone
                    };

                    setICTState(stateObj as any);
                }
            } catch (e) {
                console.error(e);
            }
        };

        fetchAnalysis();
        const interval = setInterval(fetchAnalysis, 60000);
        return () => clearInterval(interval);
    }, [pairSymbol, anchorTf, setICTState]); // Re-run when Anchor TF changes

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
            {/* Header / Nav */}
            <header className="flex items-center gap-4 p-4 border-b border-border h-16 shrink-0 z-50 bg-background/95 backdrop-blur">
                <button
                    onClick={() => router.push("/")}
                    className="p-2 hover:bg-accent rounded-md transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-lg font-bold tracking-tight">{symbol}</h1>
                    <p className="text-xs text-muted-foreground">ICT Structural Analysis</p>
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
