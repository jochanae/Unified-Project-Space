---
name: Builder Lens Identity
description: The three Flow lenses have distinct personalities; Builder's schema aesthetic is intentional and must not drift toward Storyteller's prose style.
---

## Rule
Builder lens must feel like a database specification document — monospace throughout, type-grouped sections (requirements / decisions / sprints / out_of_scope), colon-suffix metadata (`: must`, `: decision · open`), no prose, no card-boxes, no rounded badge chips.

## Why
The user explicitly identified this regression (status-grouped flat list with card boxes and colored badges looked too close to Storyteller). The three lenses have contractual distinct mental modes:
- Designer → "What are we creating?" (spatial graph, constellations)
- Builder  → "What do we do next?" (schema spec, execution plan)
- Storyteller → "How did we get here?" (narrative, essay-like chapters)

## How to apply
When editing FlowPanel.tsx Builder section: 
- Group by NODE TYPE (requirements / decisions / sprints / blockers / priorities / out_of_scope), NOT by status (open/resolved/blocked)
- Use monospace font for all text; section headers are lowercase slug-style
- Each item: `○/✓ label ... : type · meta` — resolved items get ✓ prefix and muted color
- `// SCHEMA · V0.1` header, `// seed: {goal.label}` box, `↓ join on goal_id` footer
- Status dashboard (PROJECT_STATUS %, per-section counts) above schema rows — compact 2-column grid, no prose
- No `renderItem` card boxes. No colored badge chips. No `sectionHead` dots. Pure monospace lines.
