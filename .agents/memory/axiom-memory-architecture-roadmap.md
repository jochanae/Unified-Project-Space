---
name: Axiom Memory Architecture Roadmap
description: Agreed V2–V5 sequencing for project memory, retrieval, and RAG — do not skip phases
---

## The roadmap

```
V2   → synthesizeProjectMemory() + three triggers + "Refresh Atlas Memory"
         ✅ COMPLETE
         (make the snapshot smarter)

V3   → Query interface (text search over ledger/sessions/parking)
         ✅ COMPLETE
         GET /api/search?q=&projectId= — ILIKE across entries/sessions/nexus/thoughts
         SearchModal.tsx — Cmd+K command palette, grouped results, keyword highlight
         (make the data findable without code)

V4   → Vector embeddings + semantic retrieval
         ✅ COMPLETE
         pgvector 0.8.0 installed; embeddings table (vector(1536), unique on entity_type+entity_id)
         embeddings.ts: embedText/upsertEmbedding/vectorSearch/buildRagBlock using text-embedding-3-small
         Fire-and-forget indexing hooked into entries/sessions/thoughts creation routes
         search.ts: ILIKE + vector results merged, deduped, sorted by score then recency
         NOTE: drizzle-kit push can't create the table non-interactively — table was created via raw SQL.
               Future: run CREATE TABLE IF NOT EXISTS in boot migrations if schema drifts.
         (make the data findable by meaning)

V5   → Full RAG loop (Atlas retrieves before answering)
         ✅ COMPLETE
         nexus.ts: vectorSearch called before systemPrompt is built (when focusProjectId set + OPENAI_API_KEY present)
         top-6 hits (minScore 0.38) injected as SEMANTICALLY RELEVANT CONTEXT block after focusMemory
         (close the loop)
```

## V2 detail (complete)

- `synthesizeProjectMemory(projectId, projectName)` — pulls Genome + Sessions + Entries into `ProjectMemory`
- `pushAtlasMdToRepo(projectId, userId, logger?)` — GET SHA → PUT ATLAS.md; fire-and-forget
- `ProjectMemory` type lives in `githubBootstrap.ts`; `projectMemory.ts` imports it (no circular deps)
- `generateAtlasMd(memory: ProjectMemory)` — fills Architecture (stack[]), Protected Areas, Do Not Change (constraints[]), Current Stage, Active Sessions, Recent Ledger Context
- New genome fields: `stack: text[]`, `protectedAreas: text[]` — auto-pushed on boot; PATCH /genome handles them
- Three regeneration triggers (all fire-and-forget):
  - **Event 1 — Activation**: `POST /projects/:id/activate` → fires after status set to "committed"
  - **Event 2 — Major genome change**: diff-based in PATCH /genome (purpose/wedge/audience/stack/protectedAreas/constraints)
  - **Event 3 — Manual**: `POST /projects/:id/refresh-atlas-memory` → returns `{ ok: true }`
- `thoughts` table is user-level (no projectId) — not used in synthesis; parking lot not per-project
- `linkedRepo` stored as text JSON string `{"fullName":"user/repo",...}`; `parseLinkedRepo()` handles

## Three memory layers (architectural principle)

```
Human layer   →  PROJECT.md  (what is this, why, who, what's unresolved)
Agent layer   →  ATLAS.md    (how should I behave inside this project)
System layer  →  Genome + Ledger + Sessions + Parking Lot
```

## Why RAG is not now

- RAG quality depends entirely on data quality and structure
- The work done to fix COMMIT lifecycle, genome seeding, session seeding IS the RAG prerequisite
- V3 (text search over existing SQL) is 80% there already — it's a product decision not a prerequisite
- Don't build V5 without V2 being solid; the snapshot must be trustworthy before retrieval is useful

**Why:** skipping phases produces confident-sounding wrong answers, which is worse than no retrieval.
**How to apply:** when RAG/embeddings come up, check that V2 synthesizeProjectMemory() is solid first.
