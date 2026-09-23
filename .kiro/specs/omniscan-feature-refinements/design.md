# OmniScan Feature Refinements Bugfix Design

## Overview

This design covers four targeted fixes across two parts of the OmniScan application.

**Dietary Preferences (Refinements 1 & 2)** — `ProfilePage.vue` and `RegisterPage.vue` both
allow unconstrained preference selection. The fix introduces a hard cap of 5 total
preferences (custom + Halal counted together) and, for the free-text field in
ProfilePage only, a client-side blocklist that rejects non-food terms like "shampoo" or
"bleach". No server-side schema changes are required; both fixes are entirely client-side
reactive guards.

**Scan Expiration Date (Refinements 3 & 4)** — `index.post.ts` silently discards any
AI-returned date string that does not already conform to `YYYY-MM-DD`. The fix adds a
`tryParseRawDateString` helper that recovers common alternative formats (e.g. "31 DEC
2026", "EXP: 12/26", "MM/YYYY") before giving up, and emits a `console.warn` only when
the string cannot be recovered, making previously invisible failures observable in
production logs.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers each defect — either (a) a user attempts to add a preference when `prefTotal >= 5`, (b) a user types a non-consumable term into the free-text field, (c) `normalizeToDateStringOrNull` receives a non-null non-empty non-YYYY-MM-DD string with no logging, or (d) a parseable alternative-format date string is silently discarded.
- **Property (P)**: The desired correct behavior once the fix is applied for each bug condition.
- **Preservation**: All existing behaviors that must remain unchanged: sub-limit additions continue working, quick-add/grid paths bypass the blocklist, valid YYYY-MM-DD dates return unchanged, null/empty inputs remain silent.
- **PREF_MAX**: The constant `5` representing the maximum number of total dietary preferences.
- **prefTotal**: Computed value `customPreferences.length + (halalPref ? 1 : 0)` (ProfilePage) or `selectedAllergenIds.length + (halalSelected ? 1 : 0)` (RegisterPage).
- **NON_CONSUMABLE_TERMS**: Array of ~30 lowercase strings covering cosmetics, cleaning products, and obvious non-food categories; checked via substring match.
- **tryParseRawDateString**: New TypeScript function in `index.post.ts` that attempts to recover a `YYYY-MM-DD` string from a variety of common alternative date formats before `normalizeToDateStringOrNull` falls through to logging and returning `null`.
- **isValidYMD**: Helper function (y, m, d) → string | null; pads values, constructs a `YYYY-MM-DD` string, and validates via round-trip Date check.
- **Round-trip check**: Constructing `new Date(\`\${candidate}T00:00:00Z\`)` and confirming `.toISOString().slice(0, 10) === candidate`; rejects impossible dates such as "2026-02-31".

---

## Bug Details

### Refinement 1 — Selection Limit

The bug manifests in two places:

**ProfilePage** — `addCustomPreference()` and the inline Halal quick-add handler both push
directly to `form.customPreferences` or set `form.halalPref = true` without checking
whether `prefTotal` has reached 5.

**RegisterPage** — `toggleAllergen(id)` pushes unconditionally on the addition branch, and
the inline `@click="halalSelected = !halalSelected"` on the Halal card sets `halalSelected`
to `true` without a limit check.

**Formal Specification:**

```
FUNCTION isBugCondition_SelectionLimit_Profile(state, action)
  INPUT: state = { customPreferences: string[], halalPref: boolean }
         action = 'add_custom' | 'add_quick' | 'add_halal'
  OUTPUT: boolean

  total ← state.customPreferences.length + (state.halalPref ? 1 : 0)
  RETURN total >= PREF_MAX AND action IN ['add_custom', 'add_quick', 'add_halal']
END FUNCTION

FUNCTION isBugCondition_SelectionLimit_Register(state, action)
  INPUT: state = { selectedAllergenIds: number[], halalSelected: boolean }
         action = 'add_allergen' | 'add_halal'
  OUTPUT: boolean

  total ← state.selectedAllergenIds.length + (state.halalSelected ? 1 : 0)
  RETURN total >= PREF_MAX AND action IN ['add_allergen', 'add_halal']
END FUNCTION
```

**Examples:**

- User has 4 custom prefs + Halal enabled (prefTotal = 5). Types "Keto" and presses Add → **bug**: "Keto" is pushed, list grows to 6.
- User has 5 allergens selected on RegisterPage. Taps a 6th allergen card → **bug**: 6th allergen is added.
- User has 4 allergens selected and taps Halal → **bug**: Halal is set, total becomes 5 — this case is _at_ the limit and should succeed; the block triggers only on the next attempt.
- User has 5 total and taps Halal again (already false) → this is a deselection; must never be blocked.

### Refinement 2 — Non-Consumable Filter

The bug manifests only in `ProfilePage`'s `addCustomPreference()`. When a user types
"shampoo" and presses Add, `form.customPreferences.push('shampoo')` executes with no
validation.

**Formal Specification:**

```
FUNCTION isBugCondition_NonConsumable(input, source)
  INPUT: input = string (trimmed draft value)
         source = 'free_text' | 'quick_add' | 'grid'
  OUTPUT: boolean

  lowered ← input.toLowerCase()
  RETURN source = 'free_text'
    AND EXISTS term IN NON_CONSUMABLE_TERMS WHERE lowered.includes(term)
END FUNCTION
```

**Examples:**

- User types "shampoo" → blocklist hit on "shampoo" → blocked, error shown.
- User types "bleach-free" → blocklist hit on "bleach" (substring) → blocked.
- User types "supplement-free" → blocklist hit on "supplement" → blocked.
- User types "gluten-free" → no blocklist hit → allowed.
- User selects "Sesame-free" via quick-add chip → `source = 'quick_add'` → blocklist NOT applied → allowed.

### Refinement 3 — Fallback Logging

The bug manifests in `normalizeToDateStringOrNull` when `value` is a non-empty string
that fails the `^\d{4}-\d{2}-\d{2}$` test. The function returns `null` with no log,
making it impossible to diagnose why `expiration_date_detected` is `null` in production.

**Formal Specification:**

```
FUNCTION isBugCondition_SilentDiscard(value)
  INPUT: value: unknown
  OUTPUT: boolean

  RETURN typeof value = 'string'
    AND value.trim() ≠ ''
    AND NOT /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
    AND tryParseRawDateString(value.trim()) = null
END FUNCTION
```

**Examples:**

- AI returns `"DEC 2026"` (no day) → not parseable → **bug**: silent null. Fix: `console.warn('[scan] expiration_date not in YYYY-MM-DD — raw AI value:', 'DEC 2026')`.
- AI returns `null` → `typeof value !== 'string'` → not a bug condition → remains silent.
- AI returns `""` → `trimmed = ''` → not a bug condition → remains silent.
- AI returns `"2026-12-31"` → passes YYYY-MM-DD check → not a bug condition → returned as-is.

### Refinement 4 — Regex Pre-Parsing Fallback

The bug manifests when `normalizeToDateStringOrNull` receives a non-null non-empty
string that does not match `YYYY-MM-DD` but could be parsed into one. No recovery is
attempted; the value is discarded.

**Formal Specification:**

```
FUNCTION isBugCondition_UnparsedDate(value)
  INPUT: value: unknown
  OUTPUT: boolean

  RETURN typeof value = 'string'
    AND value.trim() ≠ ''
    AND NOT /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
    AND tryParseRawDateString(value.trim()) ≠ null
END FUNCTION
```

**Examples:**

- AI returns `"31 DEC 2026"` → `tryParseRawDateString` matches `DD MMM YYYY` → returns `"2026-12-31"`.
- AI returns `"EXP: 12/26"` → prefix stripped → `MM/YY` matched → returns `"2026-12-01"`.
- AI returns `"12/2026"` → `MM/YYYY` matched → returns `"2026-12-01"`.
- AI returns `"BEST BY 15 JAN 2027"` → prefix stripped → `DD MMM YYYY` matched → returns `"2027-01-15"`.
- AI returns `"31/02/2026"` → `DD/MM/YYYY` matched → round-trip fails (Feb 31 doesn't exist) → returns `null`.
- AI returns `"DEC 2026"` → no pattern matches → returns `null` → logging fires (Refinement 3).

---

## Expected Behavior

### Preservation Requirements

**Refinement 1 — Unchanged Behaviors:**
- Adding a preference when `prefTotal < PREF_MAX` must continue to work exactly as before in both ProfilePage and RegisterPage.
- Removing a preference chip (ProfilePage) or deselecting an allergen/Halal card (RegisterPage) must always succeed regardless of current count.
- The duplicate-entry guard in `addCustomPreference` (the `includes` check) must remain active and operate independently of the limit logic.
- Re-adding a previously removed preference must be allowed normally once the count drops below the limit.

**Refinement 2 — Unchanged Behaviors:**
- Quick-add chips in ProfilePage must continue to be accepted without blocklist validation (they are pre-vetted).
- The allergen grid in RegisterPage must continue to be accepted without blocklist validation (catalog-controlled).
- Legitimate food-preference free-text entries (e.g. "gluten-free", "vegan", "low-sodium") must continue to be accepted.

**Refinement 3 — Unchanged Behaviors:**
- `normalizeToDateStringOrNull` receiving a correctly formatted YYYY-MM-DD string that passes round-trip must continue to return it with no log warning.
- `normalizeToDateStringOrNull` receiving `null` or empty string must continue to return `null` silently.
- `coerceAiExtraction` and all downstream consumers of `expiration_date` must remain unchanged.

**Refinement 4 — Unchanged Behaviors:**
- Already-valid YYYY-MM-DD input must continue to be handled by the fast path in `normalizeToDateStringOrNull` without invoking `tryParseRawDateString`.
- Impossible dates recovered structurally (e.g. "31/02/2026") must still return `null` due to the round-trip check; the parser must not short-circuit validation.
- `null` and empty-string inputs must still never invoke `tryParseRawDateString`.

**Scope:**
All inputs that do NOT meet the bug condition for each refinement should be completely
unaffected. This includes sub-limit additions, deselections, quick-add/grid selections,
valid YYYY-MM-DD dates, and null/empty date values.

---

## Hypothesized Root Cause

### Refinement 1 — Selection Limit

1. **Missing guard in add functions**: `addCustomPreference()` and `addQuickPreference()` in ProfilePage were written without a cap in mind; the limit was simply never implemented.
2. **Inline template handler bypasses methods**: The Halal quick-add uses `@click="suggestion === 'Halal' ? (form.halalPref = true) : addQuickPreference(suggestion)"` directly in the template, meaning there is no single method to add a limit check to.
3. **RegisterPage `toggleAllergen` omits the cap on add branch**: The toggle correctly handles deselection but was never given an upper-bound check.
4. **RegisterPage Halal toggle is also inline**: `@click="halalSelected = !halalSelected"` bypasses any method-level guard.

### Refinement 2 — Non-Consumable Filter

1. **No validation layer on free-text entry**: `addCustomPreference()` trusts whatever the user types; there is no function or regex to reject non-food input.
2. **Quick-add path was correctly not validated**: The list of `quickAddSuggestions` is hard-coded and pre-vetted, so no filter was needed there — and it must stay that way.

### Refinement 3 — Fallback Logging

1. **Early return has no side effects**: The line `if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null` returns silently with no logging, matching the original intent of defensive strictness but providing no observability.

### Refinement 4 — Regex Pre-Parsing Fallback

1. **No recovery attempted before giving up**: The function was designed to be strictly defensive — accept only known-good input. This is correct for production safety but overly aggressive when the AI frequently returns valid dates in non-ISO formats. A recovery layer was simply never added.

---

## Correctness Properties

Property 1: Bug Condition — Selection Limit Blocked

_For any_ state where `prefTotal >= PREF_MAX` and the user attempts to add a preference
(custom text, quick-add, Halal toggle-on, or allergen card tap in either ProfilePage or
RegisterPage), the fixed code SHALL block the addition, leave the preference list
unchanged, and display the inline notice "You can select up to 5 dietary preferences."

**Validates: Requirements 2.1, 2.3**

Property 2: Preservation — Sub-Limit and Removal Always Work

_For any_ state where `prefTotal < PREF_MAX` (addition), or where the action is a
removal/deselection (any count), the fixed code SHALL produce the same result as the
original code — additions proceed normally and removals always succeed.

**Validates: Requirements 2.2, 2.4, 3.1, 3.2, 3.3, 3.4**

Property 3: Bug Condition — Non-Consumable Input Blocked

_For any_ free-text input to `addCustomPreference()` where the trimmed lowercase value
contains a term from `NON_CONSUMABLE_TERMS`, the fixed function SHALL block the addition
and set `prefAddError` to "Please enter a food-related dietary preference."

**Validates: Requirements 2.5**

Property 4: Preservation — Food Terms and Quick-Add Unaffected

_For any_ free-text input that does NOT match the non-consumable blocklist, and for all
quick-add chip selections, the fixed code SHALL produce the same result as the original
code — additions proceed (subject to the limit check from Property 1).

**Validates: Requirements 2.6, 3.5, 3.6, 3.7**

Property 5: Bug Condition — Fallback Logging Emitted

_For any_ value passed to `normalizeToDateStringOrNull` where the value is a non-empty
string that fails `^\d{4}-\d{2}-\d{2}$` AND `tryParseRawDateString` returns `null`,
the fixed function SHALL emit `console.warn('[scan] expiration_date not in YYYY-MM-DD — raw AI value:', trimmed)` and return `null`.

**Validates: Requirements 2.7, 2.8**

Property 6: Preservation — Valid YYYY-MM-DD and Null/Empty Remain Silent

_For any_ value that is already valid YYYY-MM-DD (and passes round-trip), or that is
`null` / empty string, the fixed `normalizeToDateStringOrNull` SHALL return the same
result as the original with no log emitted.

**Validates: Requirements 3.8, 3.9**

Property 7: Bug Condition — Alternative Formats Recovered

_For any_ value passed to `normalizeToDateStringOrNull` where the value is a non-empty
string that fails `^\d{4}-\d{2}-\d{2}$` AND `tryParseRawDateString` returns a non-null
string, the fixed function SHALL return that recovered string and SHALL NOT emit a
warning log.

**Validates: Requirements 2.9, 2.10, 2.11, 2.13**

Property 8: Preservation — Impossible Dates Still Rejected

_For any_ structurally parseable but calendrically impossible date (e.g. "31/02/2026"),
`tryParseRawDateString` SHALL return `null` (round-trip check gates the output), and
`normalizeToDateStringOrNull` SHALL log and return `null` as per Property 5.

**Validates: Requirements 2.12, 3.11**

---

## Fix Implementation

### Refinement 1 — Selection Limit

#### File: `omniscan-ui/src/views/ProfilePage.vue`

**New constants and refs (in `<script setup>`):**

```typescript
const PREF_MAX = 5

const prefLimitWarning = ref(false)

const prefTotal = computed(
  () => form.customPreferences.length + (form.halalPref ? 1 : 0)
)
```

**Updated `addCustomPreference()`:**

```typescript
function addCustomPreference() {
  const value = customPrefDraft.value.trim()
  if (!value) return

  // Non-consumable check (Refinement 2) runs first — see below
  if (isNonConsumable(value)) {
    prefAddError.value = 'Please enter a food-related dietary preference.'
    return
  }

  // Limit check
  if (prefTotal.value >= PREF_MAX) {
    prefLimitWarning.value = true
    return
  }

  if (!form.customPreferences.includes(value)) {
    form.customPreferences.push(value)
    prefAddError.value = null  // clear error on successful add
  }
  customPrefDraft.value = ''
}
```

**New `handleQuickAdd(suggestion: string)` method** — replaces the inline template expression:

```typescript
function handleQuickAdd(suggestion: string) {
  if (prefTotal.value >= PREF_MAX) {
    prefLimitWarning.value = true
    return
  }
  if (suggestion === 'Halal') {
    form.halalPref = true
  } else {
    addQuickPreference(suggestion)
  }
}

// addQuickPreference remains unchanged (no limit check needed here
// since handleQuickAdd gates it)
function addQuickPreference(suggestion: string) {
  if (!form.customPreferences.includes(suggestion)) {
    form.customPreferences.push(suggestion)
  }
}
```

**Updated `removeCustomPreference(pref: string)`** — auto-clears the warning:

```typescript
function removeCustomPreference(pref: string) {
  form.customPreferences = form.customPreferences.filter((p) => p !== pref)
  prefLimitWarning.value = false
}
```

**Halal chip remove handler** — the template inline `@click="form.halalPref = false"` on
the Halal chip should also clear the warning:

```html
<!-- Change from: -->
<ion-icon :icon="closeOutline" class="chip-remove" @click="form.halalPref = false" />

<!-- To: -->
<ion-icon
  :icon="closeOutline"
  class="chip-remove"
  @click="form.halalPref = false; prefLimitWarning = false" />
```

Or extract to a small `removeHalalPref()` method for cleanliness:

```typescript
function removeHalalPref() {
  form.halalPref = false
  prefLimitWarning.value = false
}
```

**Template changes:**

1. Replace inline `@click` on quick-add chips:

```html
<!-- Before -->
@click="suggestion === 'Halal' ? (form.halalPref = true) : addQuickPreference(suggestion)"

<!-- After -->
@click="handleQuickAdd(suggestion)"
```

2. Add the limit warning below the quick-add chip row:

```html
<p v-if="prefLimitWarning" class="pref-limit-warning">
  You can select up to 5 dietary preferences.
</p>
```

**New style rule (inside the unscoped `<style>` block for `.custom-edit-modal`):**

```css
.custom-edit-modal .pref-limit-warning {
  color: #d97706;   /* amber-600 */
  font-size: 0.78rem;
  margin: 4px 0 8px;
}
```

---

#### File: `omniscan-ui/src/views/RegisterPage.vue`

**New constants and refs:**

```typescript
const PREF_MAX = 5

const prefLimitWarning = ref(false)

const prefTotal = computed(
  () => selectedAllergenIds.value.length + (halalSelected.value ? 1 : 0)
)
```

**Updated `toggleAllergen(id: number)`:**

```typescript
function toggleAllergen(id: number): void {
  if (selectedAllergenIds.value.includes(id)) {
    // Deselection — always allowed
    selectedAllergenIds.value = selectedAllergenIds.value.filter(
      (existingId) => existingId !== id
    )
    prefLimitWarning.value = false
  } else {
    // Addition — check limit
    if (prefTotal.value >= PREF_MAX) {
      prefLimitWarning.value = true
      return
    }
    selectedAllergenIds.value.push(id)
  }
}
```

**New `toggleHalal()` method:**

```typescript
function toggleHalal(): void {
  if (!halalSelected.value && prefTotal.value >= PREF_MAX) {
    prefLimitWarning.value = true
    return
  }
  halalSelected.value = !halalSelected.value
  if (!halalSelected.value) {
    // Just deselected — clear warning
    prefLimitWarning.value = false
  }
}
```

**Template changes:**

1. Replace inline Halal card handler:

```html
<!-- Before -->
@click="halalSelected = !halalSelected"

<!-- After -->
@click="toggleHalal()"
```

2. Add limit warning below the `.pref-grid` div (before the `prefsError` block):

```html
<p v-if="prefLimitWarning" class="pref-limit-warning">
  You can select up to 5 dietary preferences.
</p>
```

**New style rule (inside `<style scoped>`):**

```css
.pref-limit-warning {
  color: #d97706;
  font-size: 0.78rem;
  margin: -12px 0 12px;
}
```

---

### Refinement 2 — Non-Consumable Filter

#### File: `omniscan-ui/src/views/ProfilePage.vue`

**New constant:**

```typescript
const NON_CONSUMABLE_TERMS: string[] = [
  // Cosmetics / beauty
  'shampoo', 'lotion', 'soap', 'perfume', 'conditioner',
  'moisturiser', 'moisturizer', 'lipstick', 'mascara',
  'foundation', 'serum', 'toner', 'sunscreen',
  // Cleaning / household
  'bleach', 'detergent', 'disinfectant', 'polish',
  'cleaner', 'wax',
  // Obvious non-food
  'plastic', 'metal', 'fabric', 'electronics',
  'medication', 'drug', 'pill', 'tablet', 'capsule', 'supplement',
]
```

**New ref:**

```typescript
const prefAddError = ref<string | null>(null)
```

**New helper function:**

```typescript
function isNonConsumable(value: string): boolean {
  const lower = value.toLowerCase()
  return NON_CONSUMABLE_TERMS.some((term) => lower.includes(term))
}
```

**`addCustomPreference()` already shown above** — it calls `isNonConsumable` first, then
the limit check.

**Template changes — add error paragraph directly below the `custom-pref-input-row` div:**

```html
<p v-if="prefAddError" class="pref-add-error">{{ prefAddError }}</p>
```

**Clear error on input event of `customPrefDraft`:**

```html
<input
  v-model="customPrefDraft"
  ...
  @keyup.enter="addCustomPreference"
  @input="prefAddError = null" />
```

**New style rule:**

```css
.custom-edit-modal .pref-add-error {
  color: #b91c1c;   /* red-700 — reuses the existing error palette */
  font-size: 0.78rem;
  margin: -10px 0 8px;
}
```

**State reset in `openEditModal()`** — add the following to clear stale errors when the
modal is re-opened:

```typescript
function openEditModal() {
  // ... existing assignments ...
  prefLimitWarning.value = false
  prefAddError.value = null
  isEditModalOpen.value = true
}
```

---

### Refinement 3 — Fallback Logging

#### File: `nitro-app/server/api/scan/index.post.ts`

The existing body of `normalizeToDateStringOrNull` is restructured as follows:

```typescript
function normalizeToDateStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  // Fast path: already in required format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T00:00:00Z`)
    if (isNaN(parsed.getTime())) return null
    if (parsed.toISOString().slice(0, 10) !== trimmed) return null
    return trimmed
  }

  // Attempt recovery via alternative format parser (Refinement 4)
  const recovered = tryParseRawDateString(trimmed)
  if (recovered) return recovered

  // Non-empty, non-YYYY-MM-DD, non-recoverable — log before discarding
  console.warn('[scan] expiration_date not in YYYY-MM-DD — raw AI value:', trimmed)
  return null
}
```

Note: the log fires **only** when `tryParseRawDateString` also returns `null`,
so successfully recovered dates do not produce a warning.

---

### Refinement 4 — tryParseRawDateString

#### File: `nitro-app/server/api/scan/index.post.ts`

Add both functions **before** `normalizeToDateStringOrNull`:

```typescript
const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5,  jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

/** Pad, construct YYYY-MM-DD, and validate via round-trip. Returns null for
 *  impossible dates such as Feb 31. */
function isValidYMD(y: number, m: number, d: number): string | null {
  const yyyy = String(y).padStart(4, '0')
  const mm   = String(m).padStart(2, '0')
  const dd   = String(d).padStart(2, '0')
  const candidate = `${yyyy}-${mm}-${dd}`
  const parsed = new Date(`${candidate}T00:00:00Z`)
  if (isNaN(parsed.getTime())) return null
  if (parsed.toISOString().slice(0, 10) !== candidate) return null
  return candidate
}

/**
 * Attempts to parse common alternative date formats into YYYY-MM-DD.
 * Patterns are evaluated most-specific first to avoid ambiguous matches.
 * Returns null if no pattern matches or the recovered date fails round-trip.
 */
function tryParseRawDateString(raw: string): string | null {
  // Normalise whitespace
  const s = raw.trim().replace(/\s+/g, ' ')

  // 1. YYYY-MM-DD — pass-through (already handled by caller, but included
  //    here so tryParseRawDateString is self-contained if called directly)
  {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) return isValidYMD(+m[1], +m[2], +m[3])
  }

  // 2. Strip EXP / BEST BY prefix (case-insensitive) then recurse once
  {
    const stripped = s.replace(/^(?:exp:?\s*|best\s*by:?\s*)/i, '').trim()
    if (stripped !== s) return tryParseRawDateString(stripped)
  }

  // 3. YYYY.MM.DD
  {
    const m = s.match(/^(\d{4})\.(\d{2})\.(\d{2})$/)
    if (m) return isValidYMD(+m[1], +m[2], +m[3])
  }

  // 4. DD MMM YYYY  (e.g. "31 DEC 2026")
  {
    const m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/)
    if (m) {
      const monthNum = MONTH_NAMES[m[2].toLowerCase()]
      if (monthNum) return isValidYMD(+m[3], monthNum, +m[1])
    }
  }

  // 5. DD/MM/YYYY — only when parsed day ≤ 31 and month ≤ 12
  //    Prefer this interpretation when the first component is unambiguously
  //    a day (> 12); overlapping cases (both ≤ 12) are handled as DD/MM/YYYY
  //    here and MM/DD/YYYY in pattern 6 below (day > 12 distinguisher).
  {
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) {
      const [, p1, p2, yearStr] = m
      const a = +p1, b = +p2
      // Treat as DD/MM/YYYY when first part is a plausible day value,
      // which it always is for ≤ 31; but only resolve as this pattern
      // when the second part is a valid month (≤ 12).
      if (a <= 31 && b <= 12) {
        return isValidYMD(+yearStr, b, a)
      }
    }
  }

  // 6. MM/DD/YYYY — only when the first component > 12 (unambiguous month
  //    interpretation is impossible; we use day > 12 to distinguish)
  {
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) {
      const [, p1, p2, yearStr] = m
      const a = +p1, b = +p2
      if (b > 12 && a <= 12) {
        return isValidYMD(+yearStr, a, b)
      }
    }
  }

  // 7. MM/YYYY → day = 1
  {
    const m = s.match(/^(\d{1,2})\/(\d{4})$/)
    if (m) return isValidYMD(+m[2], +m[1], 1)
  }

  // 8. MM/YY → day = 1, year = 2000 + YY
  {
    const m = s.match(/^(\d{1,2})\/(\d{2})$/)
    if (m) return isValidYMD(2000 + +m[2], +m[1], 1)
  }

  return null
}
```

**Placement note**: Both `MONTH_NAMES`, `isValidYMD`, and `tryParseRawDateString` are
inserted immediately before the existing `normalizeToDateStringOrNull` function. No other
function signatures or call sites change.

---

## Testing Strategy

### Validation Approach

The testing strategy follows the two-phase bug condition methodology: first, write tests
that exercise the unfixed code and observe failures (exploratory checking), then apply
the fix and verify all three categories: bug condition inputs now produce correct
behavior, and non-bug inputs remain unchanged.

---

### Exploratory Bug Condition Checking

**Goal**: Surface concrete counterexamples on the unfixed code to confirm root cause
before touching production code.

**Refinement 1 — Selection Limit:**

Test Plan: Write unit tests that set `form.customPreferences` / `selectedAllergenIds` to
5 items, then call the add functions. Assert on unfixed code that the list grows beyond 5.

| # | Test Case | Expected counterexample on unfixed code |
|---|-----------|----------------------------------------|
| 1 | ProfilePage: 5 prefs exist, call `addCustomPreference()` with "Keto" | `form.customPreferences.length === 6` |
| 2 | ProfilePage: 4 prefs + Halal true, call `addQuickPreference('Sesame-free')` | `form.customPreferences.length === 5` (total 6) |
| 3 | ProfilePage: 5 prefs exist, inline Halal quick-add path fires | `form.halalPref === true` (total 6) |
| 4 | RegisterPage: 5 allergens selected, call `toggleAllergen(newId)` | `selectedAllergenIds.length === 6` |
| 5 | RegisterPage: 4 allergens + halalSelected true, toggle new allergen | `selectedAllergenIds.length === 5` (total 6) |

**Refinement 2 — Non-Consumable Filter:**

Test Plan: Set `customPrefDraft` to a blocked term and call `addCustomPreference()`. Assert
on unfixed code that the term is pushed.

| # | Test Case | Expected counterexample on unfixed code |
|---|-----------|----------------------------------------|
| 1 | Type "shampoo", call `addCustomPreference()` | `form.customPreferences.includes('shampoo') === true` |
| 2 | Type "bleach-free", call `addCustomPreference()` | `form.customPreferences.includes('bleach-free') === true` |

**Refinements 3 & 4 — Date parsing:**

Test Plan: Call the unfixed `normalizeToDateStringOrNull` with alternative-format strings.
Assert that the result is `null` and no log was emitted.

| # | Input | Expected counterexample |
|---|-------|------------------------|
| 1 | `"31 DEC 2026"` | returns `null`; no `console.warn` fired |
| 2 | `"EXP: 12/26"` | returns `null`; no `console.warn` fired |
| 3 | `"12/2026"` | returns `null`; no `console.warn` fired |

---

### Fix Checking

**Goal**: After applying the fix, verify that for all bug-condition inputs the correct
behavior is produced.

**Pseudocode (Refinements 1 & 2):**
```
FOR ALL state WHERE isBugCondition_SelectionLimit(state, action) DO
  attempt_add(state, action)
  ASSERT preference_list_length_unchanged(state)
  ASSERT prefLimitWarning = true
END FOR

FOR ALL input WHERE isBugCondition_NonConsumable(input, 'free_text') DO
  result := addCustomPreference(input)
  ASSERT 'Please enter a food-related dietary preference.' IN prefAddError
  ASSERT input NOT IN form.customPreferences
END FOR
```

**Pseudocode (Refinements 3 & 4):**
```
FOR ALL value WHERE isBugCondition_UnparsedDate(value) DO
  result := normalizeToDateStringOrNull(value)
  ASSERT result = tryParseRawDateString(value.trim())
  ASSERT isValidDate(result)
  ASSERT console.warn NOT called
END FOR

FOR ALL value WHERE isBugCondition_SilentDiscard(value) DO
  result := normalizeToDateStringOrNull(value)
  ASSERT result = null
  ASSERT console.warn called with value
END FOR
```

---

### Preservation Checking

**Goal**: After applying the fix, verify that all non-bug-condition inputs produce
identical results to the original code.

**Pseudocode:**
```
FOR ALL state WHERE NOT isBugCondition_SelectionLimit(state, action) DO
  ASSERT F(state, action) = F'(state, action)
END FOR

FOR ALL value WHERE NOT isBugCondition_SilentDiscard(value)
                  AND NOT isBugCondition_UnparsedDate(value) DO
  ASSERT F(value) = F'(value)
END FOR
```

**Testing Approach**: Property-based testing is recommended for the date parsing
preservation properties because the input space is large and edge cases (calendar
boundaries, leap years, two-digit year wraparound) are easy to miss with hand-written
cases. For the preference limit, a small number of parameterized unit tests covering
counts 0–4 is sufficient.

---

### Unit Tests

**Refinement 1:**
- ProfilePage: Adding when `prefTotal < 5` succeeds (counts 0, 1, 4).
- ProfilePage: Adding when `prefTotal === 5` is blocked and `prefLimitWarning` is true.
- ProfilePage: Deselection always succeeds regardless of count.
- ProfilePage: `handleQuickAdd('Halal')` at limit is blocked; below limit sets `form.halalPref = true`.
- ProfilePage: Removing a chip clears `prefLimitWarning`.
- RegisterPage: `toggleAllergen` at limit blocks addition; deselection always works.
- RegisterPage: `toggleHalal` at limit is blocked; below limit toggles.

**Refinement 2:**
- Each term in `NON_CONSUMABLE_TERMS` triggers block and error message.
- Substring matches trigger block (e.g. "bleach-free" hits "bleach").
- Legitimate terms ("gluten-free", "vegan", "keto") are allowed through.
- Error clears on `@input` event.
- Quick-add chips are unaffected by `isNonConsumable`.

**Refinements 3 & 4:**
- `isValidYMD` returns `null` for impossible dates (Feb 30, month 13, day 0).
- `tryParseRawDateString` returns correct YYYY-MM-DD for each pattern in the table.
- `tryParseRawDateString` returns `null` for unparseable input.
- `tryParseRawDateString` returns `null` for structurally valid but calendrically impossible input.
- `normalizeToDateStringOrNull` with valid YYYY-MM-DD: returns value, no warn.
- `normalizeToDateStringOrNull` with null/empty: returns null, no warn.
- `normalizeToDateStringOrNull` with parseable alternative format: returns recovered date, no warn.
- `normalizeToDateStringOrNull` with non-parseable string: returns null, emits warn with raw value.

---

### Property-Based Tests

- **Preference count invariant**: For any sequence of add/remove operations where
  removals always succeed and additions are blocked at 5, `prefTotal` never exceeds `PREF_MAX`.
- **Non-consumable blocklist completeness**: For any string generated by concatenating
  a term from `NON_CONSUMABLE_TERMS` with random surrounding text, `isNonConsumable`
  returns true.
- **Date round-trip identity**: For any `(y, m, d)` triple where `isValidYMD(y, m, d)` is
  non-null, parsing the returned string with `tryParseRawDateString` also returns the same string.
- **Date preservation**: For any valid YYYY-MM-DD string, `normalizeToDateStringOrNull`
  returns that string unchanged (no mutation, no warn).
- **Null/empty preservation**: For any null or empty input, `normalizeToDateStringOrNull`
  returns null with no side effects.

---

### Integration Tests

- **ProfilePage modal**: Open edit modal with 4 preferences, add a 5th (succeeds), try
  to add a 6th (blocked, warning shown), remove one, add again (succeeds).
- **ProfilePage + Halal**: Open modal with 4 custom prefs, quick-add Halal (total=5),
  attempt another quick-add (blocked), remove Halal (warning clears), add again (works).
- **ProfilePage blocklist**: Type "shampoo", press Add, verify error; type "vegan",
  press Add, verify success.
- **RegisterPage step 2**: Select 5 allergen/Halal cards, tap a 6th (blocked, warning),
  deselect one, tap the 6th again (succeeds).
- **Scan endpoint**: Submit a scan where the AI returns "31 DEC 2026" — verify the
  response's `expiration_date_detected` is "2026-12-31" and no warning appears in logs.
- **Scan endpoint**: Submit a scan where the AI returns an unparseable string — verify
  `expiration_date_detected` is null and the warning log contains the raw AI value.
