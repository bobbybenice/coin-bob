---
description: How to diagnose and fix UI/UX issues
---

# UI/UX Fix Workflow

Standard process for resolving layout, animation, and responsive design issues.

## 1. Reproduction & Analysis
- [ ] **Isolate**: Determine if it's a Logic issue or CSS issue.
- [ ] **Viewport Check**: Is it broken on Mobile, Desktop, or both?
- [ ] **Component Check**: Which component is the culprit? (e.g., `AnalysisEngine`, `AssetScreener`).

## 2. Solution Strategy
- [ ] **Mobile First**: Fix for mobile (`base` styles) then check desktop (`md:`+).
- [ ] **Layout Stability**:
  - Avoid `width: auto` for animating containers if possible. Use fixed or percentage widths.
  - Use `flex-shrink-0` to prevent items from squishing.
- [ ] **Animations**:
  - Use simple CSS transitions or `framer-motion`.
  - Ensure `overflow` is handled correctly during expansion/collapse.

## 3. Implementation
- [ ] Apply the fix.
- [ ] **Clean Code**: Remove unused classes. Use Tailwind standards.
- [ ] **Consistency**: Ensure colors use the defined palette variables (e.g., `bg-background`, `text-primary`).

## 4. Verification
- [ ] **Resize Test**: Drag the browser window from small to large to ensure smooth reflow.
- [ ] **Console Check**: Ensure no Hydration Mismatch errors (common with responsive rendering).
