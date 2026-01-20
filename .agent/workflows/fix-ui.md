---
description: How to diagnose and fix UI/UX issues
---

# UI/UX Fix Workflow

Standard process for resolving layout, animation, and responsive design issues.

---
name: fix-ui
description: Refactor components for reusability, modernize UI, and update Tailwind config.
---

# UI/UX Refactor & Fix Workflow

## 1. Analysis & Modularization
- [ ] **Scan**: Identify repeated UI patterns and monolithic components.
- [ ] **Audit**: Check responsiveness and existing Tailwind utility bloat.
- [ ] **Plan**: List components to extract in `implementation_plan.md`.

## 2. Global Styling (Tailwind Config)
- [ ] **Theme Sync**: Move common values (colors, spacing, shadows) to `tailwind.config.js`.
- [ ] **Reusable Classes**: Add a `@layer components` section in your global CSS for repetitive patterns (e.g., `.btn-primary`, `.card-wrapper`).
- [ ] **Variables**: Ensure all colors use theme tokens (e.g., `text-primary`) rather than hex codes.

## 3. Component Extraction
- [ ] **Modularize**: Move UI logic to standalone files with clear TypeScript interfaces.
- [ ] **Mobile First**: Implement `base` styles first, then `md:` breakpoints.
- [ ] **Stability**: Use `flex-shrink-0` and manage `overflow` for animations.

## 4. Verification & Cleanup
- [ ] **Optimization**: Remove unused Tailwind classes and dead code.
- [ ] **Resize Test**: Ensure smooth reflow and zero hydration errors.
- [ ] **Final Check**: Verify new reusable components work across different parent layouts.