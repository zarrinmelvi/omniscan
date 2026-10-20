# Tasks: Epic 2 — AI Logic Refactoring & Verification Pipeline

## Task List

- [x] 1. Create spec files (requirements.md, design.md, tasks.md)
- [ ] 2. Task 2.1 — Hardcode AI confidence threshold in scan/index.post.ts
  - [ ] 2.1 Add `AI_OCR_CONFIDENCE_THRESHOLD = 0.90` constant with REQ-EPIC2 comment
  - [ ] 2.2 Update heuristic score: full extraction → constant, partial → 0.70
  - [ ] 2.3 Update flagging logic to use the hardcoded constant instead of adminSettings
- [ ] 3. Task 2.2 — Add rescan gate for ambiguous OCR in scan/index.post.ts
  - [ ] 3.1 Add ambiguity check after is_real_photo validation
  - [ ] 3.2 Throw 422 with rescan_required data when both fields are empty
  - [ ] 3.3 Ensure mock path skips the gate
- [ ] 4. Task 2.3 — Update VerificationPanel.vue UI text and add training banner
  - [ ] 4.1 Update page h1 and subtitle
  - [ ] 4.2 Update modal title and section label
  - [ ] 4.3 Update button labels (certify and dismiss)
  - [ ] 4.4 Insert training pipeline banner HTML after header
  - [ ] 4.5 Add .training-banner CSS to style scoped section
- [ ] 5. Task 2.4 — Lock threshold inputs as read-only in AdminSettings.vue
  - [ ] 5.1 Lock reviewConfidenceThreshold input and update description
  - [ ] 5.2 Lock autoFlagThreshold input and update description
- [ ] 6. Verify TypeScript compilation (nitro-app and omniscan-ui)
