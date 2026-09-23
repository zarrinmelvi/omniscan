# Bugfix Requirements Document

## Introduction

This document covers four targeted refinements across two features in the OmniScan app.

**Feature 1 — Dietary Preferences** (affects `ProfilePage.vue` and `RegisterPage.vue`):
Two gaps exist in the current dietary preference selection flow. First, neither the Edit Profile modal nor the Registration step 2 enforces any upper limit on how many preferences a user can accumulate, which can produce bloated, unvalidated preference lists. Second, the free-text custom input in ProfilePage has no guard against non-food or non-consumable terms, allowing entries like "shampoo" or "detergent" to be stored alongside legitimate dietary preferences.

**Feature 2 — Scan Expiration Date** (affects `nitro-app/server/api/scan/index.post.ts`):
Two related gaps exist in the server-side expiration date pipeline. First, when the AI returns a date string in a format other than YYYY-MM-DD, `normalizeToDateStringOrNull` silently discards it with no log, making the failure invisible in production. Second, the server makes no attempt to parse common alternative date formats that the AI occasionally returns (e.g. "31 DEC 2026", "12/2026", "EXP 12/26") before discarding them, causing preventable data loss.

---

## Bug Analysis

---

### Refinement 1 — Dietary Preferences: Selection Limit

#### Current Behavior (Defect)

1.1 WHEN a user in the Edit Profile modal adds a custom preference via free-text entry and `form.customPreferences` already contains 5 or more items (counting Halal if `form.halalPref` is true) THEN the system adds the preference anyway with no limit check

1.2 WHEN a user in the Edit Profile modal taps a quick-add suggestion and `form.customPreferences` already contains 5 or more items (counting Halal if `form.halalPref` is true) THEN the system adds the preference anyway with no limit check

1.3 WHEN a user in Registration step 2 taps an allergen grid card and `selectedAllergenIds.length` plus (1 if `halalSelected` is true) already equals or exceeds 5 THEN the system toggles the allergen in anyway with no limit check

1.4 WHEN a user in Registration step 2 toggles the Halal option and `selectedAllergenIds.length` already equals 5 THEN the system sets `halalSelected` to true anyway with no limit check

#### Expected Behavior (Correct)

2.1 WHEN a user in the Edit Profile modal attempts to add any preference (custom text, quick-add, or Halal toggle) and the total count of `form.customPreferences.length` plus (1 if `form.halalPref` is true) is already 5 THEN the system SHALL block the addition and display a subtle inline notice: "You can select up to 5 dietary preferences."

2.2 WHEN a user in the Edit Profile modal removes a preference chip or disables the Halal toggle THEN the system SHALL always allow the removal regardless of current count

2.3 WHEN a user in Registration step 2 attempts to tap an allergen grid card or toggle Halal and the total count of `selectedAllergenIds.length` plus (1 if `halalSelected` is true) is already 5 THEN the system SHALL block the selection and display a subtle inline notice: "You can select up to 5 dietary preferences."

2.4 WHEN a user in Registration step 2 un-taps a selected allergen grid card or disables the Halal toggle THEN the system SHALL always allow the deselection regardless of current count

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user selects fewer than 5 total preferences (custom + Halal combined) in the Edit Profile modal THEN the system SHALL CONTINUE TO allow adding additional preferences normally

3.2 WHEN a user selects fewer than 5 total preferences (allergens + Halal combined) in Registration step 2 THEN the system SHALL CONTINUE TO allow selecting additional allergens normally

3.3 WHEN a user adds a preference that is already present in `form.customPreferences` THEN the system SHALL CONTINUE TO block duplicate entries as it does today, independently of the limit logic

3.4 WHEN a user removes a preference below the limit THEN re-adding it SHALL be allowed normally

---

### Refinement 2 — Dietary Preferences: Non-Consumable Filter

#### Current Behavior (Defect)

1.5 WHEN a user in the Edit Profile modal types a non-food or non-consumable term (e.g. "shampoo", "bleach", "plastic", "medication") into the custom preference free-text field and submits it THEN the system stores the term in `form.customPreferences` without any validation

#### Expected Behavior (Correct)

2.5 WHEN a user in the Edit Profile modal types a term that matches the non-consumable blocklist into the custom preference free-text field and attempts to add it THEN the system SHALL block the addition and display the inline error message: "Please enter a food-related dietary preference."

2.6 WHEN a user in the Edit Profile modal types a term that does not match the non-consumable blocklist into the custom preference free-text field and attempts to add it THEN the system SHALL allow the addition (subject to the selection limit in Refinement 1)

The non-consumable blocklist covers the following term categories:

- **Cosmetics / beauty**: shampoo, lotion, soap, perfume, conditioner, moisturiser, lipstick, mascara, foundation, serum, toner, sunscreen
- **Cleaning / household**: bleach, detergent, disinfectant, polish, cleaner, vinegar-based-cleaner, wax
- **Obvious non-food**: plastic, metal, fabric, electronics, medication, drug, pill, tablet, capsule, supplement (unless the term is a recognized dietary preference)

#### Unchanged Behavior (Regression Prevention)

3.5 WHEN a user selects a preference via a quick-add suggestion in the Edit Profile modal THEN the system SHALL CONTINUE TO add it without applying the non-consumable blocklist (quick-add suggestions are pre-vetted)

3.6 WHEN a user selects an allergen from the grid in Registration step 2 THEN the system SHALL CONTINUE TO accept it without applying the non-consumable blocklist (the allergen grid is catalog-controlled)

3.7 WHEN a user types a legitimate food-related preference such as "gluten-free" or "vegan" into the custom preference field THEN the system SHALL CONTINUE TO accept it normally

---

### Refinement 3 — Scan Expiration Date: OCR Fallback Logging

#### Current Behavior (Defect)

1.6 WHEN the AI returns a non-null, non-empty string value for the expiration date that does not match the `^\d{4}-\d{2}-\d{2}$` pattern THEN `normalizeToDateStringOrNull` silently returns `null` without writing any log entry, making the raw AI value invisible

1.7 WHEN the expiration date is silently discarded THEN the `expiration_date_detected` field in the scan response is `null` with no server-side record of what the AI actually returned, making diagnosis of OCR failures impossible

#### Expected Behavior (Correct)

2.7 WHEN `normalizeToDateStringOrNull` receives a non-null, non-empty string that fails the `^\d{4}-\d{2}-\d{2}$` format check THEN the system SHALL log a warning before returning `null`, e.g.:
`console.warn('[scan] expiration_date not in YYYY-MM-DD — raw AI value:', trimmed)`

2.8 WHEN `normalizeToDateStringOrNull` returns `null` due to a format failure THEN the downstream null-return behavior SHALL remain unchanged — the `expiration_date_detected` field in the response is still `null`

#### Unchanged Behavior (Regression Prevention)

3.8 WHEN the AI returns a correctly formatted YYYY-MM-DD string that also passes round-trip date validity THEN the system SHALL CONTINUE TO return that value from `normalizeToDateStringOrNull` without any log warning

3.9 WHEN the AI returns `null` or an empty string for the expiration date THEN the system SHALL CONTINUE TO return `null` silently (the logging requirement applies only to non-null, non-empty strings that fail the format check)

---

### Refinement 4 — Scan Expiration Date: Regex Pre-Parsing Fallback

#### Current Behavior (Defect)

1.8 WHEN the AI returns the expiration date in a common alternative format (e.g. "31 DEC 2026", "12/2026", "EXP 12/26", "BEST BY 15 JAN 27") instead of YYYY-MM-DD THEN `normalizeToDateStringOrNull` immediately returns `null` without attempting any parsing, discarding a date that could have been recovered

#### Expected Behavior (Correct)

2.9 WHEN `normalizeToDateStringOrNull` receives a non-null, non-empty string that does not match `^\d{4}-\d{2}-\d{2}$` THEN the system SHALL first call `tryParseRawDateString(raw)` to attempt recovery before returning `null`

2.10 WHEN `tryParseRawDateString` is called, the system SHALL attempt to parse the following format patterns into a YYYY-MM-DD string:

| Input pattern | Example input | Expected output |
|---|---|---|
| `MM/YY` | "12/26" | "2026-12-01" |
| `MM/YYYY` | "12/2026" | "2026-12-01" |
| `DD/MM/YYYY` | "31/12/2026" | "2026-12-31" |
| `MM/DD/YYYY` (only when day > 12) | "12/31/2026" | "2026-12-31" |
| `YYYY-MM-DD` | "2026-12-31" | "2026-12-31" (pass-through) |
| `YYYY.MM.DD` | "2026.12.31" | "2026-12-31" |
| `DD MMM YYYY` | "31 DEC 2026" | "2026-12-31" |
| `BB DD MMM YYYY` / `BEST BY DD MMM YYYY` | "BEST BY 31 DEC 2026" | "2026-12-31" |
| `EXP MM/YY` / `EXP: MM/YY` | "EXP: 12/26" | "2026-12-01" |

2.11 WHEN `tryParseRawDateString` produces a candidate YYYY-MM-DD string THEN the system SHALL apply the existing round-trip validity check (construct a `Date` object, confirm it does not produce `NaN` and that day/month/year round-trip correctly) before accepting it

2.12 WHEN `tryParseRawDateString` cannot match any known pattern or the round-trip check fails THEN the system SHALL return `null`, and `normalizeToDateStringOrNull` SHALL proceed to log the raw value (per Refinement 3) and return `null`

2.13 WHEN `tryParseRawDateString` successfully recovers a valid date string THEN `normalizeToDateStringOrNull` SHALL return that string and SHALL NOT emit a warning log

#### Unchanged Behavior (Regression Prevention)

3.10 WHEN the AI returns a correctly formatted YYYY-MM-DD string THEN `normalizeToDateStringOrNull` SHALL CONTINUE TO return it directly without invoking `tryParseRawDateString`

3.11 WHEN `tryParseRawDateString` encounters an impossible date (e.g. "31/02/2026") THEN the system SHALL CONTINUE TO return `null` — the round-trip validity check must still gate the output

3.12 WHEN the AI returns `null` or an empty string THEN `normalizeToDateStringOrNull` SHALL CONTINUE TO return `null` without calling `tryParseRawDateString` or emitting any log

---

## Bug Condition Summary

### Refinement 1 — Selection Limit

```pascal
FUNCTION isBugCondition_SelectionLimit_Profile(state)
  INPUT: state = { customPreferences: string[], halalPref: boolean }
  OUTPUT: boolean
  
  total ← state.customPreferences.length + (state.halalPref ? 1 : 0)
  RETURN total >= 5 AND user_attempts_addition
END FUNCTION

FUNCTION isBugCondition_SelectionLimit_Register(state)
  INPUT: state = { selectedAllergenIds: number[], halalSelected: boolean }
  OUTPUT: boolean
  
  total ← state.selectedAllergenIds.length + (state.halalSelected ? 1 : 0)
  RETURN total >= 5 AND user_attempts_addition
END FUNCTION

// Fix Checking
FOR ALL state WHERE isBugCondition_SelectionLimit(state) DO
  ASSERT addition_is_blocked AND notice_is_shown
END FOR

// Preservation Checking
FOR ALL state WHERE NOT isBugCondition_SelectionLimit(state) DO
  ASSERT F(state) = F'(state)  // addition behavior is unchanged
END FOR
```

### Refinement 2 — Non-Consumable Filter

```pascal
FUNCTION isBugCondition_NonConsumable(input)
  INPUT: input of type string (custom preference text)
  OUTPUT: boolean
  
  RETURN input.toLowerCase() IN blocklist AND source = "free_text_manual_entry"
END FUNCTION

// Fix Checking
FOR ALL input WHERE isBugCondition_NonConsumable(input) DO
  ASSERT addition_is_blocked AND error_message_shown = "Please enter a food-related dietary preference."
END FOR

// Preservation Checking
FOR ALL input WHERE NOT isBugCondition_NonConsumable(input) DO
  ASSERT F(input) = F'(input)  // quick-add and grid behavior unchanged
END FOR
```

### Refinement 3 — OCR Fallback Logging

```pascal
FUNCTION isBugCondition_SilentDiscard(value)
  INPUT: value of type string | null
  OUTPUT: boolean
  
  RETURN value IS NOT NULL AND value.trim() != "" AND NOT matches(/^\d{4}-\d{2}-\d{2}$/, value)
END FUNCTION

// Fix Checking
FOR ALL value WHERE isBugCondition_SilentDiscard(value) DO
  result ← normalizeToDateStringOrNull'(value)
  ASSERT result = null AND warning_log_emitted(value)
END FOR

// Preservation Checking
FOR ALL value WHERE NOT isBugCondition_SilentDiscard(value) DO
  ASSERT F(value) = F'(value)  // null/empty inputs and valid YYYY-MM-DD unchanged
END FOR
```

### Refinement 4 — Regex Pre-Parsing Fallback

```pascal
FUNCTION isBugCondition_UnparsedDate(value)
  INPUT: value of type string | null
  OUTPUT: boolean
  
  RETURN value IS NOT NULL AND value.trim() != ""
    AND NOT matches(/^\d{4}-\d{2}-\d{2}$/, value)
    AND tryParseRawDateString(value) IS NOT NULL
END FUNCTION

// Fix Checking
FOR ALL value WHERE isBugCondition_UnparsedDate(value) DO
  result ← normalizeToDateStringOrNull'(value)
  ASSERT result = tryParseRawDateString(value) AND isValidDate(result)
END FOR

// Preservation Checking
FOR ALL value WHERE NOT isBugCondition_UnparsedDate(value) DO
  ASSERT F(value) = F'(value)  // already-valid or unparseable inputs unchanged
END FOR
```
