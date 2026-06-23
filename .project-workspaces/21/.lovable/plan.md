
# Compani Memory Architecture v2: "Living Memory"

## Status: Phase 0–6 DEPLOYED ✅

### Completed:
- ✅ Phase 0: Companion isolation — member_id filter added to useChatStreaming.ts
- ✅ Phase 1: Schema migration — tier, base_score, emotional_weight, vulnerability_score, retrieval_count, validation trigger, compute_memory_score(), memory_narratives table, memory_relationships table
- ✅ Phase 1: Chat retrieval upgraded — foundational memories always included, tier-aware scoring
- ✅ Phase 2: classify-memories edge function deployed — batch classifies existing memories into tiers
- ✅ Phase 3: extract-memories updated — auto-classifies tier + vulnerability at extraction time
- ✅ Phase 4: Theme-based semantic search — memories tagged with 3-8 semantic themes, current message keywords boost matching memories (+15 per match, max +45)
- ✅ DB helper functions: increment_memory_retrieval, get_contextual_memories, get_verification_candidates
- ✅ Retrieval practice boost: memory retrieval_count incremented on each chat use
- ✅ Tier-aware prompt formatting: CORE IDENTITY section for foundational/identity memories
- ✅ Phase 5: Narrative consolidation — groups 5+ related memories by theme overlap into rich narrative portraits stored in memory_narratives table
- ✅ Phase 6: Adaptive verification — loads stale identity memories (90+ days), injects natural verification hint into prompt; pg_cron daily job marks stale memories

### Architecture Summary:

#### Memory Flow:
1. User chats → extract-memories extracts facts with tier + themes
2. Memories accumulate → consolidate-memories groups by theme clusters → narrative portraits
3. Chat retrieval: foundational (always) + scored memories + narrative portraits + verification hints
4. Daily cron: marks 90+ day identity memories for verification
5. Companion naturally verifies stale facts when topic arises

---

## Tier System (LIVE)

| Tier | Base Score | Decay | Examples |
|------|-----------|-------|----------|
| foundational | 100 | NEVER | Phobias, trauma, health, core values |
| identity | 50 | 180 days | Career, relationships, major goals |
| episodic | 30 | 90 days | Events, stories, conversations |
| contextual | 20 | 30 days | Current projects, recent activities |
| transient | 10 | 7 days | Passing preferences, moods |

## Score Formula
```
base_score = tier_weight + emotional_weight + vulnerability_score + (retrieval_count * 2)  [GENERATED STORED]
computed_score = base_score + (20 / (1 + days_old / decay_days)) + theme_boost  [at query time]
theme_boost = min(45, matching_themes * 15)  [Phase 4]
```

## Theme-Based Semantic Search (LIVE — Phase 4)
- Each memory gets 3-8 lowercase semantic tags at extraction time
- At chat time, the user's latest message is tokenized into keywords
- Memories whose themes match message keywords get +15 per match (capped at +45)
- This surfaces contextually relevant old memories (e.g., mentioning "frogs" boosts the "frog phobia" memory)
- classify-memories backfill function also tags themes on existing memories

## Chat Retrieval (LIVE)
1. ALL foundational memories (always, no cap)
2. Remaining memories scored by tier-aware decay + theme relevance boost
3. Top N to fill 40 total slots
4. Filtered by member_id (companion isolation)
5. Retrieval count incremented for retrieval practice boost
6. Up to 3 narrative portraits loaded (theme-matched to current message)
7. 1 verification candidate injected if available (identity memory 90+ days old)

## Prompt Format (LIVE)
```
CORE IDENTITY:
- [foundational + identity memories]

Things you know about them:
- [general category recent memories]

Emotional patterns you've noticed:
- [emotional category recent memories]

DEEPER UNDERSTANDING (narrative portraits):
[Career & Entrepreneurship]
Rich paragraph weaving together related career facts...

MEMORY VERIFICATION:
You remember they once said: "..." (X days ago). If relevant, gently check if still true.
```

## Narrative Consolidation (LIVE — Phase 5)
- Triggered when user has 80+ unconsolidated memories
- Groups memories by theme overlap (need 2+ shared themes, 5+ memories per cluster)
- Generates rich narrative portraits via Claude: career_identity, emotional_landscape, health_wellness, relationships, lifestyle, growth_journey
- Stores in memory_narratives table with source_memory_ids
- Source memories marked consolidated=true (preserved, not deleted)
- Hard cap eviction: if 300+ memories, deletes oldest consolidated transient/contextual

## Adaptive Verification (LIVE — Phase 6)
- pg_cron runs daily at 3:00 AM UTC: marks identity memories 90+ days old for verification
- Chat loads 1 verification candidate per conversation via get_verification_candidates RPC
- Injects natural verification hint into system prompt
- Companion asks "is this still true?" only when topic arises naturally

## Auto-Classification (LIVE)
New memories extracted from chat are automatically classified with:
- tier (foundational/identity/episodic/contextual/transient)
- vulnerability_score (0-30)
- emotional_weight (0-30)
- themes (3-8 semantic tags)
