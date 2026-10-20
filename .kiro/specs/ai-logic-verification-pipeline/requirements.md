# Requirements: Epic 2 — AI Logic Refactoring & Verification Pipeline

## Introduction

This epic hardens the AI-driven scan pipeline and aligns the admin UI to reflect the correct system design. It covers four targeted changes across the backend scan API and two frontend admin views.

---

## Requirements

### 2.1 — Hardcode AI Confidence Threshold

**REQ-2.1.1** The backend scan pipeline SHALL define a module-level constant `AI_OCR_CONFIDENCE_THRESHOLD = 0.90` in `nitro-app/server/api/scan/index.post.ts`.

**REQ-2.1.2** The flagging decision (whether a scan is auto-flagged for human review) SHALL use the hardcoded constant exclusively; it SHALL NOT read `adminSettings.reviewConfidenceThreshold` for the enforcement decision.

**REQ-2.1.3** The heuristic `ai_confidence_score` stored to the `Scan` record SHALL use the constant for the full-extraction case (`AI_OCR_CONFIDENCE_THRESHOLD`) and `0.70` for the partial-extraction case, making partial extractions explicitly below threshold.

**REQ-2.1.4** `AdminSettings.reviewConfidenceThreshold` and `AdminSettings.autoFlagThreshold` SHALL remain in the `AdminSettings` type and DB schema — they are used only for UI display purposes.

**REQ-2.1.5** The constant SHALL be annotated with the comment: `// AI_OCR_CONFIDENCE_THRESHOLD is hardcoded per REQ-EPIC2 — must not be read from AdminSettings for backend enforcement`.

### 2.2 — Rescan Gate for Ambiguous OCR

**REQ-2.2.1** After the AI extraction passes the `is_food_product` and `is_real_photo` checks, if both `extraction.ingredients_text` and `extraction.product_name` are empty (after trimming), the endpoint SHALL throw a 422 error.

**REQ-2.2.2** The 422 error message SHALL be: `'The product label could not be read clearly. Please re-scan with better lighting or a closer shot of the ingredients panel.'`

**REQ-2.2.3** The 422 error `data` payload SHALL include `{ rescan_required: true }` so the client can detect the ambiguous case programmatically.

**REQ-2.2.4** When the `mock_ingredients` field is present in the form data (test bypass path), the ambiguity gate SHALL NOT apply — mock data is already populated with both fields.

### 2.3 — VerificationPanel: Dataset Correction Framing

**REQ-2.3.1** The page heading SHALL read `Dataset Correction & Model Training Pipeline`.

**REQ-2.3.2** The page subtitle SHALL read `Correct AI extraction errors · Submit ground-truth data · Improve future model accuracy`.

**REQ-2.3.3** The review modal title SHALL read `Correct AI Detection (Ground Truth)`.

**REQ-2.3.4** The logo selection label inside the modal SHALL read `Select the correct certifying body to submit as ground-truth correction:`.

**REQ-2.3.5** The certify action button label SHALL read `Submit Correction` (loading state: `Submitting…`).

**REQ-2.3.6** The dismiss action button label SHALL read `Mark as Correct (No Change)` (loading state: `Dismissing…` unchanged).

**REQ-2.3.7** A training pipeline banner SHALL appear between the `<header>` block and the metric cards section, explaining that corrections are queued for the next AI model retraining cycle and do not override live Halal certification status.

**REQ-2.3.8** The banner SHALL be styled with a blue info colour scheme (background `#eff6ff`, border `#bfdbfe`, text `#1e40af`).

### 2.4 — AdminSettings: Lock Threshold Inputs

**REQ-2.4.1** The `reviewConfidenceThreshold` input in `AdminSettings.vue` SHALL be read-only and disabled.

**REQ-2.4.2** The description for `reviewConfidenceThreshold` SHALL read `Display only — backend threshold is hardcoded to 90% (REQ-EPIC2)`.

**REQ-2.4.3** The `autoFlagThreshold` input in `AdminSettings.vue` SHALL be read-only and disabled.

**REQ-2.4.4** The description for `autoFlagThreshold` SHALL read `Display only — auto-flag threshold is enforced server-side`.

**REQ-2.4.5** Both locked inputs SHALL use the existing `readonly-field` CSS class for consistent styling with the already-locked `aiModel` field.

---

## Unchanged Behavior (Regression Prevention)

**REG-1** Consumer and admin login, logout, token handling, and route guards SHALL remain unaffected.

**REG-2** The `AdminSettings` GET and PUT endpoints SHALL continue to work; the `reviewConfidenceThreshold` and `autoFlagThreshold` fields SHALL continue to be persisted and returned.

**REG-3** The scan pipeline SHALL continue to flag scans for Red verdict, unverified Halal logo, and high-priority conditions.

**REG-4** The VerificationPanel table, filters, pagination, lightbox, and correction/dismiss submission logic SHALL remain functionally unchanged.

**REG-5** The mock scan bypass path (`mock_ingredients` form field) SHALL continue to work for testing without triggering the ambiguity gate.
