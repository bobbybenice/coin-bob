# CoinBob Specification

## Architecture
- **Performance**: <1s initial load.
- **Rendering**: React Server Components (RSC) for initial shell, Client Components for interactive dashboard.
- **Privacy Policy**: 'No-Login' architecture.
- **State Management**: LocalStorage via custom TypeScript hooks for all user filters and watchlists. No server-side user data storage.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Library**: React 19
- **Styling**: Tailwind CSS (Zinc/Slate palette)

## Dashboard Layout
1.  **Asset Screener (Left/Main)**: Sortable, real-time crypto assets table.
    - Columns: Price, 24h Change, RSI, Bob’s Score.
2.  **Analysis Engine (Right)**: Entry/Exit Criteria filters.
3.  **BobAI Advisor (Bottom/Sidebar)**: AI-driven market summaries.

## Security
- API keys stored in `.env.local`.
