# Requirements Document

## Introduction

Admin editing surfaces in the OmniScan Admin Portal currently allow users to close or exit an editing modal instantly — via a Cancel button, an × close button, or by clicking the overlay backdrop — with no warning when unsaved edits exist. This causes accidental data loss when an admin spends time filling out a correction or a dictionary record and then dismisses the modal by mistake.

This feature introduces a consistent "unsaved changes" confirmation modal that intercepts close/exit attempts when the current editing surface has unsaved edits, offering the user a choice to keep editing or discard their changes.

The affected editing surfaces are:
- **Verification Panel** — the Halal certifying-body correction modal (logo selection + admin note).
- **Manage Product Data** — the shared create/edit modal used across three tabs: Allergen Dictionary, Halal Logo Library, and Ingredient Mappings.

## Requirements

### Requirement 1: Dirty-state detection

**User Story:** As an admin, I want the system to know when I have made edits that are not yet saved, so that it can warn me before I lose them.

#### Acceptance Criteria

1. WHEN an editing modal is opened THEN the system SHALL capture a baseline snapshot of the initial form/selection state.
2. WHEN the current form/selection state differs from the baseline snapshot THEN the system SHALL consider the editing surface "dirty" (has unsaved changes).
3. WHEN the current form/selection state is identical to the baseline snapshot THEN the system SHALL consider the editing surface "clean" (no unsaved changes).
4. The dirty check SHALL account for all editable fields in the surface, including:
   - Verification Panel: selected Halal logo and the admin note text.
   - Manage Product Data (Allergen): name, scientific name, predefined flag, and the alias/mapping tag list.
   - Manage Product Data (Halal): certifier code, full name, logo image path, source URL.
   - Manage Product Data (Ingredient): raw OCR term, simplified term, mapped allergen.
5. WHEN a field is changed and then reverted to its original value THEN the system SHALL treat the surface as clean again.

### Requirement 2: Intercepting close attempts

**User Story:** As an admin, I want to be warned before exiting an editing surface with unsaved edits, so that I do not accidentally lose my work.

#### Acceptance Criteria

1. WHEN the user attempts to close an editing modal via the Cancel button AND the surface is dirty THEN the system SHALL display the unsaved changes confirmation modal instead of closing immediately.
2. WHEN the user attempts to close an editing modal via the × close button AND the surface is dirty THEN the system SHALL display the unsaved changes confirmation modal instead of closing immediately.
3. WHEN the user attempts to close an editing modal by clicking the overlay backdrop AND the surface is dirty THEN the system SHALL display the unsaved changes confirmation modal instead of closing immediately.
4. WHEN the user attempts to close an editing modal via any of the above AND the surface is clean THEN the system SHALL close the modal immediately with no confirmation.
5. WHEN a save/submit operation is in progress THEN the system SHALL NOT allow the modal to close by any means (existing behavior preserved).

### Requirement 3: Confirmation modal behavior

**User Story:** As an admin, when warned about unsaved changes, I want a clear choice to either keep working or discard, so that I stay in control of my data.

#### Acceptance Criteria

1. WHEN the unsaved changes confirmation modal is displayed THEN it SHALL present exactly two actions: "Keep Editing" and a discard action.
2. The discard action label SHALL read "Discard Changes" when editing an existing record, and "Discard Item" when creating a new record (Manage Product Data create mode). For the Verification Panel the label SHALL read "Discard Changes".
3. WHEN the user chooses "Keep Editing" THEN the confirmation modal SHALL close and the underlying editing modal SHALL remain open with all edits intact.
4. WHEN the user chooses the discard action THEN both the confirmation modal and the underlying editing modal SHALL close, and all unsaved edits SHALL be discarded.
5. The confirmation modal SHALL clearly communicate that unsaved changes will be lost if discarded.
6. The confirmation modal SHALL be dismissible via its own backdrop or Escape key, which SHALL behave the same as "Keep Editing" (returns to editing, discards nothing).

### Requirement 4: Successful save path

**User Story:** As an admin, I want saving to work exactly as before, so that the new warning never interferes with a legitimate save.

#### Acceptance Criteria

1. WHEN the user successfully saves/submits an editing surface THEN the system SHALL close the editing modal with no unsaved-changes warning.
2. WHEN a save completes successfully THEN the dirty state SHALL be reset so no stale warning can appear.

### Requirement 5: Visual and theme consistency

**User Story:** As an admin, I want the confirmation modal to look consistent with the rest of the portal, so that it feels native and is readable in both themes.

#### Acceptance Criteria

1. The confirmation modal SHALL visually match the existing admin modal styling (overlay, card, button conventions).
2. The confirmation modal SHALL render legibly in dark mode, consistent with the existing dark-mode theme tokens.
3. The "Keep Editing" action SHALL be styled as the safe/primary choice and the discard action SHALL be styled as a destructive/secondary choice.

## Glossary

- **Editing surface**: An admin modal that lets a user create or edit a record — specifically the Verification Panel correction modal and the Manage Product Data create/edit modal.
- **Dirty state**: The condition where the current form/selection values differ from the baseline snapshot captured when the editing surface was opened; indicates unsaved changes exist.
- **Clean state**: The condition where the current form/selection values match the baseline snapshot; indicates no unsaved changes.
- **Baseline snapshot**: A copy of the editing surface's field values taken at open time, used as the reference for dirty-state comparison.
- **Confirmation modal**: The "unsaved changes" warning dialog offering "Keep Editing" and a discard action.
- **Discard action**: The button that abandons unsaved edits and closes the editing surface; labeled "Discard Item" in create mode and "Discard Changes" in edit mode.
