## Problem

Today selecting a range requires three steps: tap verse A → close menu → tap verse B. The menu opens on the first tap and blocks further verse taps from extending the selection. Worse: even if the user dismisses, `handleActivateVerse` resets the anchor to the *last* verse tapped, so the "extend from anchor" mental model is broken.

## Goal

One continuous flow: tap verse A → menu opens → tap **Extend selection** → tap verse B → menu re-renders with the full range A–B, all actions (Highlight, Bookmark, Vault, Deep Dive, Selah) operate on the full range. No menu close required.

## Changes

### 1. `src/routes/reader.tsx` — selection state machine

- Add new state: `const [rangeAnchor, setRangeAnchor] = useState<number | null>(null);`
  - When non-null, the next verse tap extends from this anchor instead of replacing the selection.
- Rewrite `handleActivateVerse(verse)`:
  - **If `rangeAnchor` is set**: build `{ start: min(anchor, verse), end: max(anchor, verse) }`, set `selectedVerse = anchor` (preserve anchor identity), update `selectedRange`, clear `rangeAnchor`, keep menu open.
  - **Else** (normal first tap): existing behavior — set anchor verse, single-verse range, open menu.
- Remove the implicit "second tap extends" branch (lines 1693–1695). Extension only happens via the explicit Extend mode now — predictable.
- Add `enterRangeExtendMode = () => setRangeAnchor(selectedVerse)` exposed to the menu.
- Clear `rangeAnchor` whenever menu closes or selection resets.

### 2. `src/components/reader/QuantumVerseColumn.tsx` — visual affordance during extend mode

- Accept new optional prop `rangeAnchor: number | null`.
- When `rangeAnchor != null`, render a subtle gold ring around the anchor verse and a faint hover glow on every other verse (`cursor: crosshair`) signaling "tap any verse to complete the range."
- No gesture changes — taps still call `onActivateVerse`; reader.tsx decides whether it's a fresh select or a range completion.

### 3. `src/components/reader/ReaderQuantumMenu.tsx` — Extend control + improved copy

- Accept new props: `onExtendRange: () => void` and `extendActive: boolean`.
- Replace the confusing subtitle on line 146:
  - Single verse, not extending: `"Single verse"` + a small **"⤢ Extend selection"** button next to the X in the header.
  - Single verse, extending: `"Tap another verse to complete the range"` (subtitle changes, button toggles to a highlighted state, X still cancels).
  - Multi-verse range: `"${verseCount} verses · ${reference}"` + button reads **"Adjust range"** (re-enters extend mode using current `selectedRange.start` as anchor).
- Menu does NOT close when the user taps Extend. Reader.tsx keeps `menuOpen = true` throughout.

### 4. Wiring (reader.tsx render block ~line 2456 + ~line 2670)

- Pass `rangeAnchor` to `<QuantumVerseColumn>`.
- Pass `extendActive={rangeAnchor !== null}` and `onExtendRange={enterRangeExtendMode}` to `<ReaderQuantumMenu>`.
- On `setMenuOpen(false)` paths, also `setRangeAnchor(null)`.

## Out of scope

- Drag-to-select (separate gesture, can ship later if user requests).
- Keyboard shift-click (desktop polish, not required for the regression fix).
- Changes to long-press Vault or double-tap Immersive — both untouched.

## Verification

1. Tap John 3:16 → menu opens, subtitle "Single verse", header shows Extend button.
2. Tap **Extend selection** → menu stays open, subtitle changes to "Tap another verse to complete the range", verse 16 shows gold ring.
3. Tap John 3:18 → menu re-renders with reference "John 3:16–18", subtitle "3 verses", Highlight/Bookmark/Vault/Deep Dive/Selah all operate on the full passage.
4. Tap **Adjust range** → re-enters extend mode anchored at 16; tap verse 20 → range becomes 16–20.
5. X closes menu and clears range/anchor cleanly.
6. Long-press still opens Vault picker. Double-tap still toggles Immersive. No regressions.