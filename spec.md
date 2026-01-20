# CoinBob Specification

## Project Overview
CoinBob is a privacy-first, high-performance crypto analysis dashboard designed for rapid market screening and technical analysis. It operates entirely client-side, using direct exchange APIs (Binance) for real-time data without requiring a backend database or user login. The core philosophy is **Speed, Privacy, and Intelligence**.

## Tech Stack
-   **Framework**: Next.js 15 (App Router, Turbopack)
-   **Language**: TypeScript, React 19
-   **Styling**: Tailwind CSS 4 (Zinc/Slate dark mode palette)
-   **State Management**: React Context + LocalStorage (Custom Hooks)
-   **Data Fetching**: SWR (Stale-While-Revalidate), Binance Public API
-   **Charting**: Lightweight Charts (TradingView)
-   **Analysis**: `technicalindicators` library, Custom ICT Engine

## Core Features

### 1. Real-Time Asset Screener
The main dashboard provides a tabular view of crypto assets with real-time updates.
-   **Metrics**: Price, 24h Change, Volume, RSI (14), and **Bob Score**.
-   **Bob Score**: A proprietary 0-100 composite score derived from:
    -   **Trend**: EMA alignment (20/50/200).
    -   **Momentum**: RSI oversold/overbought conditions.
    -   **Volatilty**: Bollinger Band positioning.
    -   **Market Structure**: ICT concepts (Sweeps, FVGs).
-   **Futures Data**: Toggleable view for Funding Rates and Open Interest (Perpetuals).

### 2. Analysis Engine & ICT Logic
A sophisticated client-side analysis engine that processes OHLCV data to detect high-probability setups.
-   **Indicators**: RSI, MFI, MACD, Bollinger Bands, EMA (20, 50, 200).
-   **ICT Engine**: Automatically detects Inner Circle Trader concepts:
    -   **Liquidity Sweeps**: Bullish/Bearish highs/lows being taken.
    -   **Fair Value Gaps (FVG)**: Imbalances in price delivery.
    -   **Killzones**: London (02:00-05:00 EST) and New York (09:30-11:00 EST) session filters.

### 3. Detailed Analysis & Backtesting (`/analyze/[symbol]`)
A dedicated view for deep-diving into specific assets.
-   **MultiChartView**: Synchronization of multiple timeframes.
-   **Backtester**: A simulation engine to test strategies against historical data.
    -   **Settings**: Customizable Stop Loss, Risk/Reward Ratio, and Exit logic (Soft vs Hard).
    -   **Visualization**: Plots entry/exit markers directly on the chart.

### 4. BobAI Advisor
An intelligent market assistant that provides context-aware summaries.
-   **Logic**: Heuristic-based analysis (not LLM-dependent) for reliability and speed.
-   **Insights**: Summarizes market momentum, identifies overbought/oversold assets, interprets News sentiment, and flags Whale movements.

### 5. Supplemental Widgets
-   **News Feed**: Aggregates crypto news with sentiment analysis (Bullish/Bearish/Neutral).
-   **Whale Tracker**: Monitors high-value on-chain transactions.

## Architecture & Security

### Client-Side Only
-   **No Database**: All user preferences (favorites, filters, settings) are persisted in `localStorage`.
-   **Direct APIs**: The client connects directly to Binance for market data.
-   **Privacy**: No user tracking, cookies, or account creation required.

### Data Flow
1.  **Market Data**: Fetched via `useMarketData` hook (SWR) from Binance.
2.  **Processing**: Raw candles are passed to `lib/engine/analyzer.ts`.
3.  **State**: Processed results (Signals, Scores) are stored in React Context for global access.
4.  **UI Updates**: Components react efficiently to data changes using targeted re-renders.

### Directory Structure
-   `/app`: Next.js App Router pages.
-   `/components`: Reusable UI components.
-   `/lib/engine`: Core analysis logic (Indicators, Backtester, ICT).
-   `/lib/hooks`: Data fetching and state hooks.
-   `/lib/services`: External API integrations (Binance, News).
