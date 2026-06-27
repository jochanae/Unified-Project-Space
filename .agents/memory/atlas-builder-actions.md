---
name: Atlas Builder Actions
description: What file operation protocols exist, how they parse, apply, and undo — the full pipeline from system prompt to disk.
---

## What is built (as of Task #59)

| Protocol | Status | Parser | Apply endpoint | UI |
|---|---|---|---|---|
| FILE_EDIT | ✅ live | extractAllFileEdits | apply-local (files[]) | DiffViewer / InlineDiffCard |
| LINE_PATCH | ✅ live | extractAllLinePatches | apply-local (after conversion) | InlineDiffCard |
| FILE_DELETE | ✅ live | extractAllFileDeletes | apply-local (fileDeletes[]) | DELETE row (ember-red) |
| FILE_MOVE | ✅ live | extractAllFileMoves | apply-local (fileMoves[]) | MOVE row (gold, from→to) |
| FILE_READ_REQUEST | ✅ live | regex at stream end | GET /api/fs/:id/file | none (auto-injected next turn) |

## Pipeline: system prompt → disk

1. **System prompt** teaches Atlas the block syntax (chat.ts ~line 665–678)
2. **Parsers** (chat.ts): extractAllLinePatches → extractAllFileEdits → extractAllFileDeletes → extractAllFileMoves — each strips its blocks from visible content
3. **finalPayload** (chat.ts ~line 3900): fileDeletes/fileMoves added alongside fileEdits/linePatches
4. **SSE done event** carries all four arrays
5. **useChatStream** (both handlers) reads fds/fms from res and spreads into ChatMessage
6. **ChatMessage type** (workspace.tsx): `fileDeletes?` / `fileMoves?` added after `linePatches`
7. **InlineDiffCard** (AssistantBubble.tsx): receives all four, renders DELETE/MOVE rows, creates checkpoint before apply, shows ↩ Undo after apply

## Checkpoint / rollback (NEW in Task #59)

- `POST /api/fs/:projectId/checkpoint` — reads current file contents, writes `.atlas-checkpoints/{id}.json` inside project workspace. Call BEFORE apply.
- `POST /api/fs/:projectId/rollback` — restores files; null content = file was absent = delete current version.
- Checkpoint creation is non-fatal: if it fails, apply proceeds, Undo button just absent.
- Rollback button only appears when `inlineApplied && checkpointId && !rollbackDone`.

## apply-local (POST /api/github/apply-local)

Accepts:
```typescript
{
  files?: Array<{ path, content }>,     // FILE_EDIT
  fileDeletes?: Array<{ path }>,         // FILE_DELETE
  fileMoves?: Array<{ from, to }>,       // FILE_MOVE
  projectId?: number,
}
```
Returns: `{ applied, deleted, moved, requiresServerBuild, projectWorkspace }`

## Blocked paths

FILE_DELETE and FILE_MOVE parsers check BLOCKED_PATH_RE and BLOCKED_DIR_RE at parse time. apply-local's resolveWorkspacePath provides a second path-traversal guard.

## FILE_DELETE/MOVE in GitHub flow

Deletes and moves always apply locally (project workspace) — never via GitHub modal. If `fileDeletes.length > 0 || fileMoves.length > 0`, handleApply() bypasses GitHub modal and calls applyLocal() directly.

**Why:** GitHub API requires file SHAs for deletion/move; local apply is sufficient for current architecture.

## Batch grouping

InlineDiffCard header shows `totalOps = fileEdits.length + fileDeletes.length + fileMoves.length`. When > 1: displays `"filename.tsx +N"`.

## Previous state (pre-Task #59)

- FILE_DELETE and FILE_MOVE were missing from the protocol entirely
- No checkpoint/rollback existed
- apply-local only handled files[] (FILE_EDIT content)
- InlineDiffCard had no delete/move rows or Undo button
