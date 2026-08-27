---
name: vercel-react-best-practices
description: React and Next.js performance optimization guidelines from Vercel Engineering. Use when designing components, optimizing rendering, managing server/client boundaries, and eliminating data waterfalls.
---

# Vercel React & Next.js Best Practices

Performance, architecture, and rendering optimization guidelines for Next.js App Router and React applications.

## 1. Server vs Client Component Boundaries
- **Default to Server Components**: Keep data fetching, heavy logic, and static templating in React Server Components (`RSC`).
- **Push Client Boundaries Down**: Add `'use client'` only at the leaf nodes where user interactivity, browser APIs, or stateful hooks (`useState`, `useEffect`) are strictly necessary.
- **Pass Server Components as Children**: Avoid nesting Server Components directly inside Client Components; pass them as `children` or props to keep them rendered on the server.

## 2. Eliminating Waterfalls & Data Fetching
- **Parallel Data Fetching**: Initiate independent asynchronous operations concurrently with `Promise.all()` instead of sequential `await`s.
- **Colocate Data Needs**: Fetch data close to the components that need it to avoid prop drilling and overfetching.

## 3. Touch & Mobile Optimization
- Strictly follow the Touch-Only UI policy (`docs/04-ui-components/touch-interaction-policy.md`).
- Never use `:hover`, `cursor-pointer`, or DOM `title` attributes.
- Use `active:` feedback, `focus-visible:`, and `aria-label` for responsive mobile touch UX.

## 4. Re-render & Bundle Optimization
- Avoid declaring functions or object literals inline inside render loops unless memoized or trivial.
- Keep bundle size minimal by avoiding massive third-party icon libraries or heavy runtime dependencies in client bundles.
