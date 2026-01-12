"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
// import { ICTSignal } from "@/lib/types"; 
// Removed unused import

export interface AnalysisState {
    id: string;
    symbol: string;
    timestamp: number;
    type: string;
    stage: string;
    confidence: number;
    price: number;
    timeframe: string;
    killzoneLabel?: string;
}

interface StrategyContextType {
    strategyName: string;
    ictState: AnalysisState | null;
    setICTState: (state: AnalysisState) => void;
    // Placeholder for future strategies
    meta: Record<string, unknown>;
    setMeta: (meta: Record<string, unknown>) => void;
}

const StrategyContext = createContext<StrategyContextType | undefined>(undefined);

export function StrategyProvider({ children }: { children: ReactNode }) {
    const [strategyName] = useState("ICT_v1");
    const [ictState, setICTState] = useState<AnalysisState | null>(null);
    const [meta, setMeta] = useState({});

    return (
        <StrategyContext.Provider
            value={{
                strategyName,
                ictState,
                setICTState,
                meta,
                setMeta,
            }}
        >
            {children}
        </StrategyContext.Provider>
    );
}

export function useStrategy() {
    const context = useContext(StrategyContext);
    if (context === undefined) {
        throw new Error("useStrategy must be used within a StrategyProvider");
    }
    return context;
}
