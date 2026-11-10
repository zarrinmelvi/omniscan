# AI Scanning Workflow Enhancement - Implementation Plan

## Overview
Enhance the AI scanning workflow to handle edge cases: blurry images, non-food products, irrelevant content, modal dismissal protection, and improved expiration date detection.

---

## Requirements Summary

### Already Working ✅
1. ✅ Order-independent scanning (AI searches all images regardless of order)
2. ✅ "Keep Editing" / "Discard Item" alerts
3. ✅ Auto unit/category/storage detection
4. ✅ Modal state preservation on "Keep Editing"
5. ✅ Product name photo saved as primary image

### To Implement ❌
1. **REQ-1**: Image quality detection (blurry, dark, glare, low-res)
2. **REQ-2**: Non-food product detection (keep generic message)
3. **REQ-3**: Irrelevant content rejection (faces, scenery - keep generic message)
4. **REQ-4**: Block modal backdrop dismissal
5. **REQ-5**: Improve expiration date detection (Asian formats, MFG vs EXP)

---

## Implementation Tasks

### Task 1: Update AI Prompt for Image Quality Detection (REQ-1)
**File**: `nitro-app/server/api/scan/index.post.ts`

#### 1.1 Update `ScanAiExtraction` interface
```typescript
interface ScanAiExtraction {
  is_food_product: boolean
  is_real_photo: boolean
  front_image_index: number
  product_name: string
  brand: string
  ingredients_text: string
  simplified_ingredients: string
  halal_logo_detected: boolean
  certifying_body: string
  halal_certifier_confidence: number
  halal_logo_box: { image_index: number; box: LogoBox } | null
  expiration_date: string | null
  net_quantity: number | null
  net_unit: string | null
  food_category: string
  image_quality_issue: string | null  // NEW: "blurry", "dark", "glare", "low_resolution", null
}
```

#### 1.2 Update `buildPrompt()` function
Add after the `is_real_photo` instruction:

```typescript
'"image_quality_issue" should assess whether the photo is clear enough to reliably read text. Return null if the image quality is acceptable. Otherwise return one of these values:',
'"blurry" if the image is out of focus or motion-blurred,',
'"dark" if the image is too dark or underexposed to read labels clearly,',
'"glare" if excessive reflection or glare obscures critical text on the packaging,',
'"low_resolution" if the image resolution is too low to read ingredient text.',
'If multiple quality issues exist, return the most severe one that prevents accurate text reading.',
```

#### 1.3 Update `coerceAiExtraction()` normalizer
Add normalization:

```typescript
function coerceAiExtraction(value: unknown): ScanAiExtraction | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>

  return {
    // ... existing fields
    image_quality_issue: typeof candidate.image_quality_issue === 'string' 
      && ['blurry', 'dark', 'glare', 'low_resolution'].includes(candidate.image_quality_issue)
      ? candidate.image_quality_issue 
      : null,
  }
}
```

#### 1.4 Add validation gate after extraction
Add after `extraction = await extractProductInfoFromImage(imagesForAi)`:

```typescript
// Image quality gate - reject before food product check
if (extraction.image_quality_issue) {
  const qualityMessages: Record<string, string> = {
    blurry: 'The photo is too blurry. Hold the camera steady and ensure the label is in focus.',
    dark: 'The photo is too dark to read the label. Move to a brighter area or turn on more lights.',
    glare: "There's too much glare on the label. Adjust the angle or lighting to reduce reflections.",
    low_resolution: 'The photo quality is too low. Move closer to the product or clean your camera lens.',
  }

  throw createError({
    statusCode: 422,
    statusMessage: qualityMessages[extraction.image_quality_issue] || 'Image quality is too poor to scan. Please try again with better lighting and focus.',
    data: { 
      rescan_required: true, 
      reason: 'image_quality',
      quality_issue: extraction.image_quality_issue,
    },
  })
}
```

**Estimated effort**: 30 minutes

---

### Task 2: Expand Non-Food & Irrelevant Content Detection (REQ-2 & REQ-3)
**File**: `nitro-app/server/api/scan/index.post.ts`

#### 2.1 Update `ScanAiExtraction` interface
```typescript
interface ScanAiExtraction {
  // ... existing fields
  non_food_category: string | null  // NEW: for analytics/logging only
}
```

#### 2.2 Update `buildPrompt()` function

**For non-food products** (update existing `is_food_product` instruction):
```typescript
'"is_food_product" must be false for anything that is not meant for human consumption',
'(e.g. lotion, shampoo, cosmetics, household cleaners, detergent, toothpaste, deodorant, electronics, toys, stationery, clothing, footwear) — when false, you may leave the',
'other string fields as empty strings, halal_logo_detected as false, front_image_index as 0, and expiration_date as null,',
'since ingredient extraction does not apply to a non-food item.',
'"non_food_category" should classify non-food products into one of: "personal_care" (shampoo, lotion, cosmetics), "household_cleaner" (detergent, disinfectant), "hygiene" (toothpaste, deodorant), "electronics", "clothing", "toys", "stationery", "other", or null if is_food_product is true.',
```

**For irrelevant content** (expand existing `is_real_photo` instruction):
```typescript
'"is_real_photo" MUST be true for genuine photographs AND commercial stock or e-commerce marketing images of real packaged food products, even if the packaging features cartoon mascots, anime/illustrated characters (e.g., Buldak Hochi mascot), animated graphics, or studio backgrounds.',
'ONLY set is_real_photo to false when the entire uploaded image itself is a hand-drawn cartoon sketch, anime drawing, artwork, digital painting, meme, screenshot of an app/text/website, photo of a person\'s face or body, landscape/scenery photo, or contains no physical product packaging whatsoever.',
```

#### 2.3 Update `coerceAiExtraction()` normalizer
```typescript
non_food_category: typeof candidate.non_food_category === 'string' && candidate.non_food_category.trim()
  ? candidate.non_food_category.trim().toLowerCase()
  : null,
```

#### 2.4 Keep existing generic error messages
**No changes needed** to error messages - they already work:
- Non-food: `"This doesn't look like a food or beverage product. OmniScan only tracks food items."`
- Not real photo: `"Cartoons and drawings are not supported. Please upload a real photo of a food item."`

**Optional**: Log `non_food_category` for analytics:
```typescript
if (!extraction.is_food_product) {
  await logAuditEvent({
    event_type: 'SCAN_REJECTED_NON_FOOD',
    entity: 'Scan',
    triggered_by_user_id: authUser.id,
    summary: `Non-food scan rejected: ${extraction.non_food_category || 'unknown'}`,
    metadata: { category: extraction.non_food_category },
  })
  
  throw createError({
    statusCode: 422,
    statusMessage: hasBackImage
      ? "One or both captures don't look like a valid food or beverage product packaging. Please ensure both photos show edible item packaging."
      : "This doesn't look like a food or beverage product. OmniScan only tracks food items.",
  })
}
```

**Estimated effort**: 20 minutes

---

### Task 3: Improve Expiration Date Detection (REQ-5)
**File**: `nitro-app/server/api/scan/index.post.ts`

#### 3.1 Update `buildPrompt()` function
Enhance the `expiration_date` instruction:

```typescript
'"expiration_date" should be any printed expiration date, best-before date, or use-by date visible on any part of the packaging.',
'Look for text labeled "EXP", "Expiry", "Best Before", "BB", "Use By", "MFG" (manufacturing - ignore this), or similar.',
'IMPORTANT: If both MFG (manufacturing date) and EXP (expiration date) are visible, use the EXP date only - ignore MFG.',
'Convert whatever format is printed into strict ISO format YYYY-MM-DD. Supported formats include:',
'- English: "31 DEC 2026", "12/31/2026", "2026-12-31", "31.12.2026"',
'- Asian: "26.12.31" (YY.MM.DD), "2026.12.31", "2026年12月31日" (Japanese/Chinese)',
'- Ambiguous formats: If day and month are ambiguous (e.g., "06/12/2026" could be June 12 or Dec 6), prefer the interpretation that results in a later expiration date.',
'If the printed date is partially obscured, illegible, or you are not confident you have read it correctly, return null rather than guessing — a wrong date is worse than no date.',
'If no expiration/best-before/use-by date is visible on the packaging at all, return null.',
```

**No code changes needed** - just prompt improvement. The existing date parsing logic handles the conversion.

**Estimated effort**: 10 minutes

---

### Task 4: Block Modal Backdrop Dismissal (REQ-4)
**File**: `omniscan-ui/src/components/ScanResultModal.vue`

#### 4.1 Update `<ion-modal>` attribute
**Current:**
```vue
<ion-modal
  v-if="!data?.isNotProduct"
  :is-open="isOpen"
  :breakpoints="[0, 0.5, 0.95]"
  :initial-breakpoint="0.95"
  :backdrop-dismiss="!submitting"  <!-- ❌ allows dismissal when not submitting -->
  @didDismiss="handleDismiss"
>
```

**New:**
```vue
<ion-modal
  v-if="!data?.isNotProduct"
  :is-open="isOpen"
  :breakpoints="[0, 0.5, 0.95]"
  :initial-breakpoint="0.95"
  :backdrop-dismiss="false"  <!-- ✅ always prevent backdrop dismissal -->
  @didDismiss="handleDismiss"
>
```

**Note**: Swipe-down gesture will still trigger `@didDismiss`, which calls `handleDismiss()` and shows the confirmation alert. This is correct behavior.

**Estimated effort**: 2 minutes

---

### Task 5: Testing & Verification

#### 5.1 Backend Testing (AI Prompt)
Test with various images:

**Image Quality (REQ-1):**
- [ ] Intentionally blurred photo → "too blurry" error
- [ ] Dark/underexposed photo → "too dark" error
- [ ] Photo with glare on label → "glare" error
- [ ] Low-resolution photo → "quality too low" error
- [ ] Clear, well-lit photo → passes validation ✅

**Non-Food Products (REQ-2):**
- [ ] Shampoo bottle → "not a food product" error
- [ ] Detergent → "not a food product" error
- [ ] Electronics → "not a food product" error
- [ ] Food product → passes ✅

**Irrelevant Content (REQ-3):**
- [ ] Portrait/selfie → "not supported" error
- [ ] Landscape photo → "not supported" error
- [ ] Screenshot → "not supported" error
- [ ] Food product with cartoon mascot (Buldak) → passes ✅

**Expiration Date (REQ-5):**
- [ ] "31 DEC 2026" → converts to 2026-12-31 ✅
- [ ] "26.12.31" → converts to 2026-12-31 ✅
- [ ] "2026年12月31日" → converts to 2026-12-31 ✅
- [ ] MFG date visible, EXP date visible → uses EXP only ✅
- [ ] Ambiguous "06/12/2026" → prefers later date ✅

#### 5.2 Frontend Testing (Modal)
**Modal Dismissal Protection (REQ-4):**
- [ ] Tap backdrop → modal stays open (no dismiss) ✅
- [ ] Swipe modal down → confirmation alert appears ✅
- [ ] Click "Keep Editing" → alert closes, modal remains open ✅
- [ ] Click "Discard Item" → both alert and modal close ✅
- [ ] Click close button → confirmation alert appears ✅

**Scan Flow Testing:**
- [ ] Scan front (product name) → Scan back (ingredients) → Success ✅
- [ ] Scan back (ingredients) → Scan front (product name) → Success ✅
- [ ] Scan blurry photo → Error → Rescan clear photo → Success ✅
- [ ] Scan shampoo → Error → Scan food → Success ✅

**Estimated effort**: 1 hour

---

## Implementation Order

1. ✅ **Task 1** - Image quality detection (30 min)
2. ✅ **Task 2** - Non-food & irrelevant content (20 min)  
3. ✅ **Task 3** - Expiration date improvement (10 min)
4. ✅ **Task 4** - Block backdrop dismissal (2 min)
5. ✅ **Task 5** - Testing & verification (1 hour)

**Total estimated time: ~2 hours**

---

## Files to Modify

### Backend
- `nitro-app/server/api/scan/index.post.ts` (main scanning endpoint)
  - Update `ScanAiExtraction` interface (add 2 fields)
  - Update `buildPrompt()` function (3 sections)
  - Update `coerceAiExtraction()` normalizer (add 2 normalizations)
  - Add image quality validation gate (1 new block)
  - Optional: Add non-food category logging

### Frontend
- `omniscan-ui/src/components/ScanResultModal.vue` (scan result modal)
  - Change `backdrop-dismiss` attribute (1 line)

---

## Rollback Plan

If issues arise:
1. **Image quality gate too strict**: Adjust AI prompt thresholds or add quality override flag
2. **False positives on non-food**: Refine prompt examples for edge cases
3. **Expiration date parsing issues**: Add fallback date format examples to prompt
4. **Modal dismissal issues**: Revert `backdrop-dismiss` to `!submitting`

---

## Success Metrics

✅ **User Experience:**
- Clear, actionable error messages for common issues
- No accidental loss of scanned data
- Improved date detection accuracy

✅ **Technical:**
- Reduced false positives (blurry images processed incorrectly)
- Better non-food rejection rate
- Improved expiration date extraction success rate

✅ **Existing Functionality:**
- Order-independent scanning still works
- Two-photo workflow unchanged
- Modal confirmation flow preserved
- All existing tests pass
