"use client";

import React from "react";
import { useStrategy } from "./StrategyProvider";
import { Activity, Zap } from "lucide-react";

// Inline functional components for UI replacement
const Badge = ({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) => (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${className} ${variant === 'outline' ? 'border border-border' : 'bg-primary text-primary-foreground'}`}>
        {children}
    </span>
);
const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}>
        {children}
    </div>
);

export function StrategyPanel() {
    const { analysisState, strategyName } = useStrategy();

    // Mock state if null for visualization during dev
    const activeState = analysisState || {
        id: "loading",
        symbol: "...",
        timestamp: Date.now(),
        type: "NEUTRAL",
        stage: "ANALYZING...",
        confidence: 0,
        price: 0,
        timeframe: "--",
        metadata: {},
    };

    const isEntry = activeState.stage.includes("ENTRY");

    // Dynamic Metadata Logic
    const renderMetadata = () => {
        if (strategyName === 'ICT' && activeState.metadata?.killzone) {
            return (
                <Badge variant="secondary" className="text-xs">
                    {activeState.metadata.killzone}
                </Badge>
            );
        }
        if (strategyName === 'RSI_MFI' && activeState.metadata?.rsi) {
            return (
                <Badge variant="secondary" className="text-xs font-mono">
                    RSI: {Number(activeState.metadata.rsi).toFixed(1)}
                </Badge>
            );
        }
        return null;
    };

    return (
        <Card className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            {strategyName} Status
                        </h3>
                        <div className="flex items-center gap-2">
                            <Badge variant={isEntry ? "default" : "outline"} className={isEntry ? "bg-emerald-500 hover:bg-emerald-600 animate-pulse" : ""}>
                                {activeState.stage.replace("_", " ")}
                            </Badge>
                            {renderMetadata()}
                        </div>
                    </div>

                    <div className="h-8 w-px bg-border mx-2" />

                    <div className="flex items-center gap-2 text-sm">
                        <Activity className="w-4 h-4 text-primary" />
                        <span>
                            Bias: <span className={
                                activeState.type === "NEUTRAL" ? "text-muted-foreground" :
                                    activeState.type.includes("LONG") || activeState.type === "BULLISH" ? "text-emerald-500" : "text-rose-500"
                            }>{activeState.type}</span>
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Analysing</p>
                        <p className="font-mono text-sm">{activeState.timeframe} Structure</p>
                    </div>
                    <Zap className={`w-5 h-5 ${isEntry ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
                </div>
            </div>
        </Card>
    );
}
