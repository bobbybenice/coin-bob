# Skill: Strategy Architect

## Trigger
When I start a prompt with "Use blueprint: [Idea]", execute the following Quant Developer workflow.

## Rules
1. **Translate Logic**: Convert descriptive trading ideas into technical parameters (e.g., "oversold" -> RSI < 30).
2. **Modular Indicators**: Use existing functions in `lib/engine/indicators/` (RSI, MFI, EMA, etc.).
3. **Standardized Interface**: Use `StrategyResponse` for all outputs.
4. **Timeframe Context**: Adapt logic thresholds based on the selected timeframe (1m vs 1d).

## Code Requirements
- File path: `lib/engine/strategies/[name].ts`.
- States: `WATCH` (setup forming) | `ENTRY` (trigger hit) | `EXIT` (take profit/stop loss).
- Metadata: Always return raw indicator values for UI visualization.
- Risk/Reward: Default to 1:2 unless specified.

## Expected Output
1. A technical summary of the strategy.
2. The complete TypeScript code for the new strategy file.
3. Registration instructions for `lib/engine/strategies/index.ts`.