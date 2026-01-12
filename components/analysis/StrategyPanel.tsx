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
    const { ictState } = useStrategy();

    // Mock state if null for visualization during dev
    const activeState = ictState || {
        id: "loading",
        symbol: "...",
        timestamp: Date.now(),
        type: "NEUTRAL",
        stage: "ANALYZING...",
        confidence: 0,
        price: 0,
        timeframe: "--",
        killzoneLabel: undefined,
    };

    const isEntry = activeState.stage === "ENTRY_FVG" || activeState.stage === "ENTRY_MSS";

    return (
        <Card className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Strategy Status
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant={isEntry ? "default" : "outline"} className={isEntry ? "bg-green-500 hover:bg-green-600 animate-pulse" : ""}>
                                {activeState.stage.replace("_", " ")}
                            </Badge>
                            {activeState.killzoneLabel && (
                                <Badge variant="secondary" className="text-xs">
                                    {activeState.killzoneLabel}
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="h-8 w-px bg-border mx-2" />

                    <div className="flex items-center gap-2 text-sm">
                        <Activity className="w-4 h-4 text-primary" />
                        <span>
                            Bias: <span className={
                                activeState.type === "NEUTRAL" ? "text-muted-foreground" :
                                    activeState.type.includes("LONG") ? "text-green-500" : "text-red-500"
                            }>{activeState.type}</span>
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Analysing</p>
                        <p className="font-mono text-sm">{activeState.timeframe} Structure</p>
                    </div>
                    <Zap className={`w-5 h-5 ${isEntry ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`} />
                </div>
            </div>
        </Card>
    );
}
