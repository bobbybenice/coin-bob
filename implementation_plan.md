# Customizable Strategy Columns Implementation Plan

## Goal
Allow users to select specific strategies to display in the main Asset Screener. Access these settings via a new section named "**Strategies**" in the Analysis Engine. For each selected strategy, display **ENTRY** signals (Long/Short) across **All Major Timeframes** (1D, 4H, 1H, 30m, 15m, 5m).

## 1. Data Model Updates

### `lib/types.ts`
*   **Update `AssetTrends`**: Expand to hold multi-timeframe results for **ALL** available strategies.
    *   **Timeframes**: `1d`, `4h`, `1h`, `30m`, `15m`, `5m`.
    *   **Structure**: Each strategy key (e.g., `macd`, `ict`) will hold an object mapping timeframe to signal (`'LONG' | 'SHORT' | null`).
    *   Example:
        ```typescript
        interface AssetTrends {
            // ... existing trend data
            strategies: Record<StrategyName, Record<string, 'LONG' | 'SHORT' | null>>;
            lastUpdated: number;
        }
        ```
*   **Update `UserSettings`**: Add `visibleStrategies: StrategyName[]` to persist preferences.

## 2. Calculation Engine (`useTrendScanner`)
The `useTrendScanner` hook will be significantly upgraded to process **6 timeframes** per asset.
*   **Action**: Loop through assets (round-robin) and fetch history for: `1d`, `4h`, `1h`, `30m`, `15m`, `5m`.
*   **Strategy Execution**: Run all available strategies (`getAllStrategyNames()`) on each timeframe.
*   **Signal Extraction**: Only store **ENTRY** signals. Ignore 'WATCH', 'HOLD', etc.

## 3. Store Updates (`lib/store.tsx`)
*   Add `visibleStrategies` to `defaultSettings`.
*   Add action `toggleVisibleStrategy(strategy: StrategyName)`.

## 4. UI Implementation

### A. Strategy Selector (Analysis Engine)
*   **Location**: `components/analyze/AnalysisEngine.tsx`
*   **Feature**: Add a collapsible section named "**Strategies**".
*   **Component**: List of checkboxes for all strategies (MACD, Bollinger, ICT, EMA Cross, Volume, S/R, Golden).

### B. Screener Header (`AssetScreener.tsx`)
*   Dynamically render headers.
*   Header Format: `[Strategy Name]` (spans 6 sub-columns) or compact matrix.
*   Given the width, we might need a compact "Dot Matrix" representation per strategy column.
    *   Col: **MACD**
    *   Cell: `[5m][15][30][1H][4H][1D]` (6 dots). Green=Long, Red=Short, Grey=None.

### C. Screener Rows (`AssetRow.tsx`)
*   Render the matrix for each visible strategy.
*   **Visuals**: 6-dot row.
    *   Order left-to-right: Lower timeframes to Higher? Or High to Low?
    *   Standard: `5m 15m 30m 1H 4H 1D`.
    *   Green Dot = Long Entry.
    *   Red Dot = Short Entry.
    *   Empty/Dim = No Signal.

## Verification
*   Select "MACD" in Analysis Engine -> Verify MACD column appears in Screener.
*   Verify values match the Chart/Deep Analysis.
*   Check performance with all columns enabled.
