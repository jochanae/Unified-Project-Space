---
name: Workspace Chat Streaming
description: /api/chat callModel streaming implementation — what was changed and why
---

## Rule
`callModel()` in `artifacts/api-server/src/routes/chat.ts` now accepts an
optional `onToken?: (chunk: string) => void` callback. When provided, the
Claude branch uses `anthropic.messages.stream()` instead of `.create()` and
pipes text deltas to the caller. The main /api/chat call site passes a callback
that writes `{type:"token",content:chunk}` SSE events immediately.

## Why
The original non-streaming call made the server buffer the entire Anthropic
response (including full FILE_EDIT scaffold blocks = thousands of tokens)
before writing anything to the SSE stream. Users saw 15–60s of silence with
only "Analyzing your request…" blinking. Build-handoff responses are the
worst case — they contain complete file scaffolds.

## How to apply
- Follow-up callModel calls (FILE_READ intercept, FILE_TREE intercept, agentic
  loop at lines ~3322, ~3353, ~3400) intentionally do NOT pass onToken — they
  run after the first stream has begun and their content is folded into the
  final `done` event.
- GPT-4o and Gemini paths remain non-streaming; they fall through to their
  existing `.create()` / `generateContent()` calls.
- The frontend placeholder/pacer pattern (useChatStream.ts) already handles
  token events correctly — no frontend changes were needed.
- max_tokens bumped to 16000 in the streaming path (was 8192) to accommodate
  large build-handoff scaffolds.
