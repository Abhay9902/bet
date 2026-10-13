---
paths:
  - 'frontend/**'
---

# Frontend conventions (Next.js 16, React 19, Tailwind 4)

- Next.js 16 has breaking changes vs older versions. Check
  `frontend/node_modules/next/dist/docs/` before using routing, caching, data fetching, or
  middleware/proxy APIs.
- App Router only. Default to Server Components; add `'use client'` only for interactivity
  (game canvases, forms, sockets). Keep client components small and leaf-level.
- Mobile-first: design at 360–430 px wide first, then scale up. Bottom navigation on mobile; tap
  targets ≥44 px; respect safe-area insets.
- Theme: dark blue. Colours, radii, and spacing are Tailwind theme tokens defined in
  `src/app/globals.css` (`@theme`). Don't hard-code hex values in components.
- Animations: CSS/Tailwind transitions or `requestAnimationFrame` on canvas for game visuals.
  Respect `prefers-reduced-motion`.
- The client never calculates outcomes, payouts, or balances. Display values exactly as the server
  sends them; use the `@bet/shared` formatter for coin amounts (minor units → display).
- Optimistic UI is allowed for display only; always reconcile with the server response or socket
  event, and show the server's result if they differ.
- Every coin-moving request sends an idempotency key generated once per user action (not per retry).
- Auth tokens live in httpOnly cookies set by the backend; never store tokens in localStorage.
- `/admin` routes are protected server-side (layout checks the session role); hiding links is not
  access control.
- Accessibility: semantic elements, labelled controls, visible focus states, sufficient contrast on
  the dark theme.
