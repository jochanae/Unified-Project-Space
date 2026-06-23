# LoadingSpinner

Single source of truth for loading affordances across the app. Pick a **context**, not a size.

## Quick reference

| Context     | Resolved size | Use for                                                              |
| ----------- | ------------- | -------------------------------------------------------------------- |
| `"page"`    | `lg` (96px)   | Full-page route loaders, auth gates, anything covering ≥ 60svh       |
| `"content"` | `lg` (96px)   | Main content-area loaders inside a route shell (lists, billing, etc) |
| `"section"` | `md` (48px)   | Sub-section / panel loaders, default fallback                        |
| `"inline"`  | `sm` (28px)   | Tight inline indicators (next to a label, in a row)                  |
| `"button"`  | `sm` (28px)   | Inside a button — usually paired with `className="scale-[0.55]"`     |

## Usage

```tsx
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Full-page
<LoadingSpinner context="page" text="Preparing your sanctuary…" />

// In a button
<button>{loading ? <LoadingSpinner context="button" className="scale-[0.55]" /> : "Save"}</button>
```

## The `size` prop

`size="sm" | "md" | "lg"` still exists as an **escape hatch** for one-off cases the
contexts don't cover. The spinner ESLint rule warns whenever it's used —
prefer `context` so all loaders stay coherent.

If both are passed, `size` wins.

## Fallback behavior

| Situation                                     | What happens                                  |
| --------------------------------------------- | --------------------------------------------- |
| Bare `<LoadingSpinner />`                     | Renders at `md`, dev console warns once       |
| `context="bogus"`                             | Renders at `md`, dev console warns once       |
| `size="bogus"`                                | Renders at `md`, dev console warns once       |
| Both `size` and `context`                     | Uses `size`, ESLint rule warns                |

## Tooling

- **`bun run audit:spinners`** — scans every `<LoadingSpinner />` in `src/` and
  writes `src/dev/spinner-audit.json`. Auto-runs once when `bun dev` starts.
- **`/__dev/spinners`** — DEV-only route that visualizes the audit (which files
  use which context, which still use explicit `size`, which are bare).
- **ESLint `local/spinner-context`** — warns on `size=` usage and on missing
  `context=`. Configured in `eslint.config.js`.
- **Vitest `loading-spinner.test.tsx`** — smoke tests covering size resolution
  and override precedence.
