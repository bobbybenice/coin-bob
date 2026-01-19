---
description: How to implement a new feature in CoinBob
---

# Feature Implementation Workflow

This workflow outlines the standard process for adding new features to CoinBob, ensuring adherence to project standards like offline-first, no mock fallbacks but informative messages, and rigorous documentation.

## 1. Planning & Design
- [ ] **Review Requirements**: Understand the core user need.
- [ ] **Check Standards**: Ensure the feature aligns with `coin-bob-standards.md` (Next.js 15, Tailwind, No Server DB, Mock Data).
- [ ] **Update Task List**: Add the new feature to `task.md` with a breakdown of sub-steps.

## 2. Data & Services
- [ ] **Define Types**: Create TypeScript interfaces for new data structures in `types/`.
- [ ] **Create Service**: Implement the logic in `lib/services/`.
- [ ] **Implement Mock Data**: **CRITICAL**. Create a fallback mock data source. The app must work without API keys.
  - Pattern: `return useMock ? mockData : fetchRealData()`
- [ ] **LocalStorage**: If persistence is needed, use `localStorage`. Do NOT use a server database.

## 3. UI Implementation
- [ ] **Components**: Build reusable components in `components/`.
  - Use `shadcn/ui` primitives if applicable.
  - Ensure **Mobile Responsiveness** (Tailwind `md:`, `lg:` prefixes).
  - Dark mode is default.
- [ ] **Integration**: Add the component to `app/page.tsx` or the relevant page.
- [ ] **State Management**: Use React Hooks (`useState`, `useEffect`) or clear separation of concerns (Service -> Hook -> Component).

## 4. Verification
- [ ] **Lint**: Run generic lint command or check for visible errors.
- [ ] **Test Fallbacks**: Disconnect network or remove API keys to verify Mock Data works.
- [ ] **Responsiveness**: Check on simulated Mobile and Desktop views.
- [ ] **Testing**: Implement and run end-2-end and unit tests

## 5. Documentation
- [ ] **Update task.md**: Mark items as complete.
- [ ] **Comments**: Add JSDoc comments to complex service functions.