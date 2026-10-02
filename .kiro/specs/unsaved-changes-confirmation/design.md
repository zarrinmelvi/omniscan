# Design Document

## Overview

This feature adds an "unsaved changes" confirmation step to the two admin editing surfaces that currently close instantly: the Verification Panel correction modal and the Manage Product Data create/edit modal. The design introduces a small reusable confirmation modal plus per-view dirty-state tracking, implemented entirely in the frontend (Vue 3 `<script setup>` components). No backend changes are required.

The approach is intentionally lightweight: each editing surface already holds its working state in refs. We add (1) a baseline snapshot taken when the modal opens, (2) an `isDirty` computed that deep-compares current state to the baseline, and (3) a guarded close path that routes through the confirmation modal when dirty.

## Architecture

### Component inventory

- `ConfirmDiscardModal.vue` (new) — a presentational, reusable confirmation dialog. Emits `keep` and `discard` events. Teleported to `<body>`, styled to match existing admin modals.
- `VerificationPanel.vue` (modified) — wires dirty tracking around its existing correction modal.
- `AdminManageProductData.vue` (modified) — wires dirty tracking around its shared create/edit modal.
- `dark-mode.css` (modified) — dark-mode overrides for the new confirmation modal.

### Control flow (per editing surface)

```
User clicks Cancel / × / backdrop
        │
        ▼
  requestClose()
        │
   isDirty? ──no──► close immediately (existing closeModal logic)
        │
       yes
        │
        ▼
  show ConfirmDiscardModal
        │
   ┌────┴────┐
 Keep       Discard
   │           │
   ▼           ▼
 hide        close editing modal +
 confirm     reset state (existing closeModal logic)
 (stay)
```

A save-in-progress short-circuits `requestClose()` so nothing happens mid-request (preserves existing guard).

## Components and Interfaces

### ConfirmDiscardModal.vue

Props:
- `open: boolean` — controls visibility.
- `discardLabel: string` — the discard button text ("Discard Item" or "Discard Changes").
- `title?: string` — optional heading, default "Unsaved Changes".
- `message?: string` — optional body text, default "You have unsaved changes. If you leave now, they will be lost."

Emits:
- `keep` — user chose to keep editing (also fired on backdrop click / Escape).
- `discard` — user chose to discard.

Behavior:
- Teleports to `<body>`, renders only when `open` is true.
- Backdrop click (`@click.self`) and Escape key both emit `keep`.
- "Keep Editing" button emits `keep`; discard button emits `discard`.
- Has a high z-index so it layers above the editing modal it guards.

### VerificationPanel.vue changes

New state:
- `baselineSnapshot` — a plain object captured when the correction modal opens, holding `{ logoId, note }`.
- `showDiscardConfirm` — boolean controlling the confirmation modal.
- `isDirty` — computed: true when `modalSelectedLogoId !== baselineSnapshot.logoId` OR `modalNote !== baselineSnapshot.note`.

Baseline capture:
- In `openCorrectionModal(row)` (which seeds `modalSelectedLogoId = null`, `modalNote = ''`), set `baselineSnapshot = { logoId: null, note: '' }` after seeding.

Guarded close:
- Introduce `requestClose()`:
  - If `modalActing` is true, return (no-op).
  - If `isDirty`, set `showDiscardConfirm = true`.
  - Else call existing `closeModal()`.
- Rewire the Cancel button, the × button, and the overlay `@click.self` to call `requestClose()` instead of `closeModal()` directly.
- Confirmation handlers:
  - `onKeepEditing()` → `showDiscardConfirm = false`.
  - `onDiscard()` → `showDiscardConfirm = false; closeModal()`.
- `discardLabel` is always "Discard Changes" for this surface.
- The successful `submitCorrection` / `submitDismiss` paths are unchanged — they already clear state directly, which naturally resets dirtiness.

### AdminManageProductData.vue changes

New state:
- `baselineSnapshot` — a JSON-serializable snapshot of the relevant fields at open time. For allergen mode it also includes a sorted copy of `aliasTags`.
- `showDiscardConfirm` — boolean controlling the confirmation modal.
- `isDirty` — computed comparing the current `form` (and `aliasTags` for allergen mode) against `baselineSnapshot` via stable JSON comparison.

Baseline capture:
- At the end of both `openCreateModal()` and `openEditModal()`, after `form` and `aliasTags` are seeded, capture `baselineSnapshot = snapshotOf(form, aliasTags)` where `snapshotOf` produces a stable serialized form (object fields plus a sorted alias array).

Guarded close:
- Introduce `requestClose()`:
  - If `saving` is true, return (no-op).
  - If `isDirty`, set `showDiscardConfirm = true`.
  - Else call existing `closeModal()`.
- Rewire the Cancel button, the × button, and the overlay `@click.self` to call `requestClose()`.
- Confirmation handlers mirror the Verification Panel (`onKeepEditing`, `onDiscard`).
- `discardLabel` is "Discard Item" when `modalMode === 'create'`, otherwise "Discard Changes".
- The successful `saveModal` path is unchanged — it closes directly on success, resetting dirtiness.

### Dirty comparison strategy

A single helper per component builds a stable string from the tracked fields:
- Object fields are read in a fixed key order.
- Array fields (alias tags) are lowercased, sorted, and joined so order/case changes do not create false positives (matching Requirement 1.5 and the existing `aliasesChanged()` semantics).

This avoids pulling in a deep-equal dependency and keeps the comparison predictable.

## Data Models

No persistent data models change. The only new in-memory shapes are:

```ts
// Verification Panel
interface CorrectionSnapshot {
	logoId: number | null
	note: string
}

// Manage Product Data — snapshot is a stable serialized string
type FormSnapshot = string
```

## Error Handling

- The confirmation modal is purely client-side; it performs no network calls and cannot error.
- Existing save error handling is untouched. A failed save keeps the editing modal open and the surface dirty, so a subsequent close attempt still prompts correctly.
- If `baselineSnapshot` is somehow unset (modal opened without seeding), `isDirty` defaults to false so the user is never blocked from closing a surface that was never edited.

## Correctness Properties

These are invariants the implementation must uphold, independent of specific inputs.

### Property 1: No data loss without consent
The editing modal SHALL NOT close while dirty unless the user explicitly chose the discard action.

**Validates: Requirements 2.1, 2.2, 2.3, 3.4**

### Property 2: No false prompts
WHEN the surface is clean, closing SHALL always proceed immediately with no confirmation modal.

**Validates: Requirements 2.4**

### Property 3: Revert symmetry
For any sequence of edits that returns every tracked field to its baseline value, `isDirty` SHALL evaluate to false.

**Validates: Requirements 1.3, 1.5**

### Property 4: Save resets state
After any successful save, the surface SHALL be clean such that an immediate re-open starts from a fresh baseline.

**Validates: Requirements 4.1, 4.2**

### Property 5: Mid-save lock
WHILE a save is in progress, neither the editing modal nor the confirmation modal SHALL cause the editing modal to close.

**Validates: Requirements 2.5**

### Property 6: Safe confirmation dismiss
Dismissing the confirmation modal by backdrop or Escape SHALL never discard edits; it is equivalent to "Keep Editing".

**Validates: Requirements 3.3, 3.6**

### Property 7: Idempotent close path
Invoking the guarded close while the confirmation modal is already open SHALL NOT stack additional confirmation modals.

**Validates: Requirements 3.1**

## Testing Strategy

### Unit / component tests
- `ConfirmDiscardModal`: emits `keep` on Keep button, backdrop, and Escape; emits `discard` on discard button; renders the provided `discardLabel`.
- Verification Panel dirty logic: clean on open; dirty after selecting a logo or typing a note; clean again after reverting both.
- Manage Product Data dirty logic (all three tabs): clean on open; dirty after editing any tracked field; alias add/remove flips dirty; reverting restores clean; create-vs-edit discard label is correct.

### Integration / manual verification
- For each surface: open, make an edit, attempt all three close paths (Cancel, ×, backdrop) → confirmation appears.
- Keep Editing returns with edits intact; Discard closes and drops edits.
- Open, make no edits, close via each path → no confirmation.
- Begin a save, attempt to close mid-save → no close, no confirmation.
- Successful save → closes with no confirmation.
- Verify dark-mode legibility of the confirmation modal.

## Design Decisions and Rationale

1. **Reusable modal component over duplicated markup** — both surfaces share identical confirmation UX, so a single `ConfirmDiscardModal` avoids divergence and centralizes dark-mode styling.
2. **Snapshot + computed over per-field watchers** — a baseline snapshot compared by a stable serialization is simpler and less error-prone than tracking individual field watchers, and it naturally satisfies the "revert makes it clean again" requirement.
3. **Guard function (`requestClose`) rather than changing `closeModal`** — keeps the existing `closeModal` as the single source of truth for the actual teardown, so the successful-save and programmatic-close paths remain unchanged and low-risk.
4. **Confirmation dismiss defaults to safe** — treating the confirmation modal's own backdrop/Escape as "Keep Editing" ensures an accidental click never destroys work, consistent with the feature's whole intent.
