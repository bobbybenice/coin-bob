"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export interface AnalysisState {
    id: string;
    symbol: string;
    timestamp: number;
    type: string;
    stage: string;
    confidence: number;
    price: number;
    timeframe: string;
    metadata?: Record<string, unknown>;
}

interface StrategyContextType {
    strategyName: string;
    setStrategyName: (name: string) => void;
    analysisState: AnalysisState | null;
    setAnalysisState: (state: AnalysisState | null) => void;
}

const StrategyContext = createContext<StrategyContextType | undefined>(undefined);

export function StrategyProvider({ children }: { children: ReactNode }) {
    const [strategyName, setStrategyName] = useState("ICT");
    const [analysisState, setAnalysisState] = useState<AnalysisState | null>(null);

    return (
        <StrategyContext.Provider
            value={{
                strategyName,
                setStrategyName,
                analysisState,
                setAnalysisState,
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
