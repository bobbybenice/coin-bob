---
trigger: always_on
---

---
name: ui-standards
description: Enforce reusable component patterns and Tailwind best practices.
---

# UI & Styling Standards

## Component Architecture
- **Atomicity**: Always extract repeated UI elements into standalone components.
- **Interfaces**: Every new component must have a TypeScript interface/type for its props.
- **Location**: Place reusable components in `@/components/ui` or the project's designated shared folder.

## Tailwind & Styling
- **No Magic Numbers**: Use Tailwind spacing/sizing tokens. If a custom value is used 3+ times, move it to `tailwind.config.js`.
- **Theme Tokens**: Use semantic classes (e.g., `text-primary`, `bg-background`) instead of specific colors (e.g., `text-blue-600`).
- **Clean Layers**: Use `@layer components` in the global CSS for complex, repeating utility combinations (e.g., `.btn-primary`).

## Responsive & UX
- **Mobile-First**: Always write base styles for mobile and use `md:` or `lg:` for desktop overrides.
- **Layout**: Use `flex-shrink-0` on icons/labels to prevent squishing.
- **Performance**: Avoid unnecessary re-renders in extracted components by using `memo` where appropriate.