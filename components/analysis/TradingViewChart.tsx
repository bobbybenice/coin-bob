"use client";

import React, { useEffect, useRef, memo } from "react";

interface TradingViewChartProps {
    symbol: string;
    interval: string; // "1", "5", "60", "240", "D"
    containerId: string;
    theme?: "light" | "dark";
    autosize?: boolean;
}

declare global {
    interface Window {
        TradingView: {
            widget: new (config: any) => any;
        };
    }
}

function TradingViewChart({ symbol, interval, containerId, theme = "dark", autosize = true }: TradingViewChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Determine the exchange suffix if needed, typically BINANCE:BTCUSDT
        // Assuming symbol comes in as 'BTCUSDT' or similar.
        const formattingSymbol = symbol.includes(":") ? symbol : `BINANCE:${symbol}`;

        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/tv.js";
        script.async = true;
        script.onload = () => {
            if (window.TradingView) {
                new window.TradingView.widget({
                    autosize: autosize,
                    symbol: formattingSymbol,
                    interval: interval,
                    timezone: "Etc/UTC",
                    theme: theme,
                    style: "1",
                    locale: "en",
                    toolbar_bg: "#f1f3f6",
                    enable_publishing: false,
                    hide_side_toolbar: true,
                    allow_symbol_change: false,
                    container_id: containerId,
                    disabled_features: [
                        "header_widget",
                        "header_resolutions",
                        "header_symbol_search",
                        "header_chart_type",
                        "header_settings",
                        "header_indicators",
                        "header_compare",
                        "header_undo_redo",
                        "header_screenshot",
                        "header_fullscreen_button",
                        "left_toolbar",
                        "timeframes_toolbar",
                        "volume_force_overlay"
                    ],
                    studies: [
                        // "RSI@tv-basicstudies" // Optional: Add studies if needed
                    ],
                });
            }
        };

        // Append script to document
        const currentContainer = containerRef.current;
        if (currentContainer) {
            currentContainer.appendChild(script);
        }

        return () => {
            // Cleanup script if necessary, but standard TV widget usually replaces content.
            if (currentContainer && script.parentNode === currentContainer) {
                currentContainer.removeChild(script);
            }
        }
    }, [symbol, interval, containerId, theme, autosize]);

    return (
        <div id={containerId} ref={containerRef} className="w-full h-full min-h-[400px]" />
    );
}

export default memo(TradingViewChart);
