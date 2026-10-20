# Design: Epic 2 — AI Logic Refactoring & Verification Pipeline

## Overview

Four targeted changes across three files. The backend scan API gets a hardcoded confidence constant and an ambiguity gate. Two admin UI views are updated to reflect the correct system framing (threshold fields become read-only; the verification panel is reframed as a dataset correction tool).

---

## 2.1 — Hardcode AI Confidence Threshold

### Current State

`scan/index.post.ts` reads `adminSettings.reviewConfidenceThreshold` (default 75) and `adminSettings.autoFlagThreshold` (default 90) at runtime and uses them for the flagging comparison. The heuristic confidence score stores `0.9` for full extractions.

### Target State

A single module-level constant `AI_OCR_CONFIDENCE_THRESHOLD = 0.90` is added near the top of the file. The flagging logic uses `Math.round(AI_OCR_CONFIDENCE_THRESHOLD * 100)` (= 90) as the comparison value. `adminSettings` values are kept in the code for contextual comments only.

The heuristic score changes:
- Full extraction → `AI_OCR_CONFIDENCE_THRESHOLD` (0.90)
- Partial extraction → `0.70` (explicitly below the 90% threshold, ensuring it gets flagged)

### Key invariants

- `confidencePct < Math.round(AI_OCR_CONFIDENCE_THRESHOLD * 100)` triggers the `belowReviewThreshold` flag.
- `adminSettings.reviewConfidenceThreshold` still appears in the flag-reason string for admin-visible messaging, but is not used in the boolean decision.
- `adminSettings.autoFlagThreshold` is similarly demoted to a comment/display role.

---

## 2.2 — Rescan Gate for Ambiguous OCR

### Current State

When the AI returns an empty `product_name` and empty `ingredients_text`, the scan proceeds, creates a product record with empty fields, and produces a meaningless scan result.

### Target State

An ambiguity check runs immediately after the `is_food_product` / `is_real_photo` validation. Placement is important:

1. `is_food_product` check (existing) — must pass first
2. `is_real_photo` check (existing) — must pass second
3. **Ambiguity gate (new)** — only runs when both prior checks pass
4. Catalog fill-in (existing) — only runs when ambiguity gate passes

This ordering ensures mock data (which sets both fields) never hits the gate, and the gate is never reached for non-food items.

The guard is intentionally omitted when `mockTextField?.data` is truthy (the mock path). Mock extractions always have both `product_name` and `ingredients_text` set, so the condition would never be true anyway — but the explicit skip makes the intent clear.

### Error shape

```typescript
createError({
  statusCode: 422,
  statusMessage: 'The product label could not be read clearly. Please re-scan with better lighting or a closer shot of the ingredients panel.',
  data: { rescan_required: true },
})
```

---

## 2.3 — VerificationPanel UI Reframing

### Change summary

All changes are purely cosmetic/copy updates — no logic, no data flow, no API calls are affected.

| Location | Old text | New text |
|---|---|---|
| Page `<h1>` | Halal Verification Panel | Dataset Correction & Model Training Pipeline |
| Page subtitle | Review unverified Halal logos · Assign certifying bodies · Resolve compliance flags | Correct AI extraction errors · Submit ground-truth data · Improve future model accuracy |
| Modal `<h2>` | Assign Halal Certifying Body | Correct AI Detection (Ground Truth) |
| Modal section label | Select an authorized certifying body from the Halal logo library: | Select the correct certifying body to submit as ground-truth correction: |
| Certify button | Certify & Resolve / Certifying… | Submit Correction / Submitting… |
| Dismiss button | Dismiss Flag | Mark as Correct (No Change) |

### Training banner

Inserted immediately after `</header>` and before `<!-- ── Metric Cards ──>`. The banner is informational only — no interactivity, no state. CSS class `.training-banner` uses the existing `#eff6ff / #bfdbfe / #1e40af` blue info palette consistent with other info elements in the codebase.

---

## 2.4 — AdminSettings: Lock Threshold Inputs

### Change summary

Two `<input>` elements in the "AI & Scanning" tab change from editable to locked display fields. The approach mirrors the existing `aiModel` field pattern: replace `v-model.number` with `:value`, add `readonly` + `disabled` attributes, add `readonly-field` class.

Description strings updated to make the lock reason explicit for admins.

No backend changes — the AdminSettings API continues to serve and accept these fields unchanged.

---

## Files Modified

| File | Tasks |
|---|---|
| `nitro-app/server/api/scan/index.post.ts` | 2.1, 2.2 |
| `omniscan-ui/src/views/admin/VerificationPanel.vue` | 2.3 |
| `omniscan-ui/src/views/admin/AdminSettings.vue` | 2.4 |
