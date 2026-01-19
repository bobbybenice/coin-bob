---
trigger: always_on
---

- Framework: Next.js 15 + Tailwind (Dark Mode).
- Package manager: pnpm
- Privacy: LocalStorage only. No server DB.
- Resilience: No APIs should have Mock Data fallbacks. If no real data, display appropriate message instead. 
- Documentation: Always update task.md after changes.
- Math: Use 'technicalindicators' library for RSI/EMA, etc.
- Style: Direct, clean code. Minimal prose.
- Testing: Always implement and run end-to-end and unit tests