# Implementation Plan

## Overview

This plan implements an unsaved-changes confirmation modal across the Verification Panel correction modal and the Manage Product Data create/edit modal. Work proceeds bottom-up: build the shared confirmation component and its dark-mode styles first, then wire dirty-state tracking and guarded close paths into each editing surface, and finally verify behavior and theming.

## Tasks

- [x] 1. Create the reusable ConfirmDiscardModal component
  - Create `omniscan-ui/src/components/admin/ConfirmDiscardModal.vue`
  - Props: `open: boolean`, `discardLabel: string`, `title?: string` (default "Unsaved Changes"), `message?: string` (default "You have unsaved changes. If you leave now, they will be lost.")
  - Emits: `keep`, `discard`
  - Teleport to `<body>`; render only when `open` is true; high z-index (above editing modals)
  - Backdrop click (`@click.self`) and Escape key both emit `keep`
  - "Keep Editing" button emits `keep` (styled as safe/primary); discard button shows `discardLabel` (styled destructive/secondary)
  - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 5.1, 5.3_

- [x] 2. Add dark-mode styles for the confirmation modal
  - Append dark-mode overrides for the ConfirmDiscardModal classes to `omniscan-ui/src/theme/dark-mode.css` using existing `--dm-*` tokens
  - Ensure overlay, card, title, message, and both buttons are legible in dark mode
  - _Requirements: 5.2_

- [x] 3. Wire dirty-state + guarded close into the Verification Panel
- [x] 3.1 Add dirty-state tracking to VerificationPanel.vue
  - Add refs: `baselineSnapshot` ({ logoId, note }), `showDiscardConfirm`
  - Add `isDirty` computed comparing `modalSelectedLogoId`/`modalNote` to the baseline
  - Capture baseline at the end of `openCorrectionModal(row)` after state is seeded
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
- [x] 3.2 Add guarded close path and confirmation handlers
  - Add `requestClose()`: no-op if `modalActing`; show confirm if dirty; else call existing `closeModal()`
  - Add `onKeepEditing()` (hide confirm) and `onDiscard()` (hide confirm + `closeModal()`)
  - Rewire Cancel button, × button, and overlay `@click.self` to call `requestClose()`
  - Render `<ConfirmDiscardModal>` with `discardLabel="Discard Changes"`, wired to `showDiscardConfirm` and the handlers
  - Leave `submitCorrection`/`submitDismiss` success paths unchanged
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.4, 4.1, 4.2_

- [x] 4. Wire dirty-state + guarded close into Manage Product Data
- [x] 4.1 Add dirty-state tracking to AdminManageProductData.vue
  - Add refs: `baselineSnapshot` (stable serialized string), `showDiscardConfirm`
  - Add a `snapshotOf(form, aliasTags)` helper producing a stable serialization (fixed key order; alias array lowercased + sorted)
  - Add `isDirty` computed comparing current `form`/`aliasTags` serialization to the baseline
  - Capture baseline at the end of both `openCreateModal()` and `openEditModal()` after seeding
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
- [x] 4.2 Add guarded close path and confirmation handlers
  - Add `requestClose()`: no-op if `saving`; show confirm if dirty; else call existing `closeModal()`
  - Add `onKeepEditing()` and `onDiscard()` handlers
  - Rewire Cancel button, × button, and overlay `@click.self` to call `requestClose()`
  - Render `<ConfirmDiscardModal>` with `discardLabel` = "Discard Item" (create) / "Discard Changes" (edit), wired to `showDiscardConfirm` and handlers
  - Leave `saveModal` success path unchanged
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.2, 4.1, 4.2_

- [x] 5. Verify behavior and theming
  - Build the project and resolve any compile errors
  - Manually verify for each surface: dirty close via Cancel/×/backdrop prompts; Keep Editing retains edits; Discard drops edits; clean close skips the prompt; mid-save close is blocked; successful save closes with no prompt
  - Verify the confirmation modal is legible in dark mode on both surfaces
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.3, 3.4, 4.1, 5.2_

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"], "description": "Build the shared ConfirmDiscardModal component" },
    { "wave": 2, "tasks": ["2", "3.1", "4.1"], "description": "Dark-mode styles and per-surface dirty-state tracking (depend on Task 1)" },
    { "wave": 3, "tasks": ["3.2", "4.2"], "description": "Guarded close paths and confirmation wiring (depend on 3.1 / 4.1 respectively)" },
    { "wave": 4, "tasks": ["5"], "description": "Build and verify behavior + dark-mode theming across both surfaces" }
  ]
}
```

- Task 1 is the foundation; everything else depends on it.
- Within each surface, the guarded-close subtask depends on its dirty-tracking subtask (3.2 after 3.1, 4.2 after 4.1).
- Tasks 3 and 4 are independent of each other and can be done in either order.
- Task 5 is the final verification gate after all implementation tasks.

## Notes

- Frontend-only change; no backend or database modifications are required.
- The existing `closeModal` teardown logic in both surfaces is preserved as-is and reused by the discard handlers, keeping successful-save and programmatic-close paths unchanged.
- Dirty comparison deliberately avoids a deep-equal dependency, using stable serialization instead (alias arrays are lowercased and sorted to prevent false positives).
