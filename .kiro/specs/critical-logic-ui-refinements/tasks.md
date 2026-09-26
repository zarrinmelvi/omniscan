# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Allergen/Preference-Matched Recipe Not Filtered
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate recipes containing allergen/preference matches still appear in results
  - **Scoped PBT Approach**: Scope to the concrete failing cases: a user with allergen `milk` and a recipe containing `butter`, and a user with `custom_preferences = ['Eggs-free']` and a recipe containing `egg white`
  - Test `suggest.get.ts` result: assert no recipe in the returned array has ingredient text matching the user's allergen or custom preference
  - Test `analyze.post.ts` result: assert `matched_user_allergens` includes `'Eggs'` when `custom_preferences = ['Eggs-free']` and `ingredients_text` contains `'egg white'`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (proves the bugs exist — recipes with allergen matches are returned; preference warnings are absent from analyze results)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 4.1_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Safe Recipes Still Appear; Existing Filters Unaffected
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: a recipe with no allergen or preference match is returned in `suggest.get.ts` results on unfixed code
  - Observe: halal exclusion, matchedCount === 0 exclusion, and dedup all work on unfixed code
  - Observe: `analyze.post.ts` returns correct `matched_user_allergens` for users with no `custom_preferences`
  - Write property-based test: for all recipes where `combinedWarnings.length === 0`, the recipe appears in results (from Preservation Requirements in design for Fix 1a)
  - Write property-based test: for all scan inputs with empty `custom_preferences`, `matched_user_allergens` equals structural allergen names (Fix 4 preservation)
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 1.1, 1.2, 1.3, 4.2, 4.3_

- [ ] 3. Fix 1a — suggest.get.ts: strict allergen/preference filtering

  - [ ] 3.1 Add `if (combinedWarnings.length > 0) continue` guard
    - Place immediately after `const combinedWarnings = Array.from(new Set([...directAllergenMatches, ...preferenceWarnings]))`
    - Before the `if (halalPref && ...) continue` line
    - _Bug_Condition: isBugCondition(recipe) where combinedWarnings.length > 0 (from design Fix 1a)_
    - _Expected_Behavior: recipe is skipped entirely when any allergen or preference matches (P1 from design Fix 1a)_
    - _Preservation: recipes with combinedWarnings.length === 0 are unaffected (¬C from design Fix 1a)_
    - _Requirements: 1.1_

  - [ ] 3.2 Remove `allergen_warnings: string[]` from the result type annotation
    - Remove the `allergen_warnings: string[]` line from the TypeScript inline type on the `results` array declaration
    - _Expected_Behavior: result type has no allergen_warnings property (P3 from design Fix 1a)_
    - _Requirements: 1.2_

  - [ ] 3.3 Remove `allergen_warnings: combinedWarnings` from `results.push(...)`
    - Delete the `allergen_warnings: combinedWarnings` key-value from the object literal in the `results.push(...)` call
    - _Expected_Behavior: no allergen_warnings key on any result (P3 from design Fix 1a)_
    - _Requirements: 1.3_

  - [ ] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Allergen/Preference-Matched Recipe Not Filtered
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed — recipes with allergen/preference matches are excluded)
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Safe Recipes Still Appear; Existing Filters Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in safe-recipe inclusion and existing filter logic)

- [ ] 4. Fix 1b — dietary-map.ts: add 10 missing allergen entries

  - [ ] 4.1 Add the 10 new `DIETARY_ALLERGEN_MAP` entries
    - Add the following keys with their specified labels and keyword arrays:
      `eggs-free`, `milk-free`, `peanuts-free`, `wheat-free`, `soy-free`,
      `fish-free`, `shellfish-free`, `sesame-free`, `tree nuts-free`, `mustard-free`
    - Do NOT modify the 3 existing entries (`dairy-free`, `gluten-free`, `avoid msg`)
    - _Bug_Condition: isBugCondition(pref) where pref is one of the 10 missing keys (from design Fix 1b)_
    - _Expected_Behavior: DIETARY_ALLERGEN_MAP[key] returns a DietaryRule for each new key (P1–P10 from design Fix 1b)_
    - _Preservation: pre-existing entries dairy-free, gluten-free, avoid msg unchanged (¬C from design Fix 1b)_
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14_

- [ ] 5. Fix 2 — dark-mode.css: input focus border and color-scheme

  - [ ] 5.1 Replace hardcoded focus border with design token and add color-scheme rule
    - Replace the single rule `html.ion-palette-dark .custom-input:focus { border-color: #05c450 !important; }` with:
      ```css
      html.ion-palette-dark .custom-input:focus {
        border-color: var(--dm-border) !important;
      }
      html.ion-palette-dark .custom-input {
        color-scheme: dark;
      }
      ```
    - _Bug_Condition: isBugCondition(element) where html.ion-palette-dark AND .custom-input:focus (from design Fix 2)_
    - _Expected_Behavior: border-color = var(--dm-border); color-scheme: dark applied (P1, P2 from design Fix 2)_
    - _Preservation: light-mode focus rule in component scoped CSS unaffected; date-input dark focus rule unaffected (¬C from design Fix 2)_
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 6. Fix 3 — RegisterPage.vue: modal-first terms flow

  - [ ] 6.1 Remove `<div class="terms-row">...</div>` block from template
    - Delete the entire `<div class="terms-row">` block including its children (label, checkbox, terms-link, error paragraph)
    - _Bug_Condition: terms-row checkbox blocks user from proceeding without manual tick (from design Fix 3)_
    - _Requirements: 3.1_

  - [ ] 6.2 Remove `termsAccepted` and `termsError` refs from script
    - Delete `const termsAccepted = ref(false)` and `const termsError = ref(false)` from the `<script setup>` block
    - _Requirements: 3.2, 3.3_

  - [ ] 6.3 Refactor `handleRegister()` to open Terms modal on validation pass
    - Remove the `if (!termsAccepted.value) { termsError.value = true; return }` block at the top of `handleRegister()`
    - Replace the entire `isSubmitting.value = true` / `try { authStore.register ... } catch ... finally` registration block with `isTermsOpen.value = true`
    - All field validation code above that block MUST remain unchanged
    - _Expected_Behavior: handleRegister opens modal after validation (P1, P2 from design Fix 3)_
    - _Preservation: all field validations (empty, email, password strength, confirm match) remain in handleRegister (¬C from design Fix 3)_
    - _Requirements: 3.4, 3.5_

  - [ ] 6.4 Make `acceptTerms()` async and move registration logic into it
    - Change `function acceptTerms(): void` to `async function acceptTerms(): Promise<void>`
    - Body:
      ```ts
      isSubmitting.value = true
      try {
        await authStore.register(name.value.trim(), email.value, password.value)
        await authStore.login(email.value, password.value)
        await showToast('Account created successfully!', 'success')
        step.value = 2
        fetchAllergenCatalog()
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 409 || err.message.toLowerCase().includes('email')) {
            fieldErrors.email = true
            errorMessage.value = 'This email address already exists.'
          } else {
            errorMessage.value = err.message
          }
        } else {
          errorMessage.value = 'Registration failed. Please try again.'
        }
      } finally {
        isSubmitting.value = false
        isTermsOpen.value = false
      }
      ```
    - _Expected_Behavior: acceptTerms performs register + login + toast + step advance (P3 from design Fix 3)_
    - _Requirements: 3.6_

  - [ ] 6.5 Update `disagreeTerms()` to only close the modal
    - Replace body with `isTermsOpen.value = false` only — remove any `termsAccepted`/`termsError` side-effects
    - _Expected_Behavior: disagreeTerms only closes modal (P4 from design Fix 3)_
    - _Requirements: 3.7_

- [ ] 7. Fix 4 — analyze.post.ts: dietary preference warnings in scan results

  - [ ] 7.1 Add import for `DIETARY_ALLERGEN_MAP`
    - Add `import { DIETARY_ALLERGEN_MAP } from '../../lib/dietary-map'` to the imports section
    - _Requirements: 4.1_

  - [ ] 7.2 Extend the Prisma query to include `dietary_prof`
    - In the `prisma.user.findUnique` call, add alongside the `allergens` select:
      ```ts
      dietary_prof: { select: { custom_preferences: true }, orderBy: { updated_at: 'desc' }, take: 1 }
      ```
    - _Bug_Condition: isBugCondition(scan) where dietary_prof not selected and user has custom_preferences (from design Fix 4)_
    - _Requirements: 4.2_

  - [ ] 7.3 Add preference warnings logic and build `allMatchedNames`
    - After `const matchedAllergens = mergeMatchedAllergens(stringMatches, semanticMatches)`, add:
      ```ts
      const customPreferences = userWithAllergens?.dietary_prof?.[0]?.custom_preferences ?? []
      const preferenceWarnings = new Set<string>()
      customPreferences.forEach((pref: string) => {
        const rule = DIETARY_ALLERGEN_MAP[pref.toLowerCase().trim()]
        if (rule) {
          if (rule.keywords.some((kw) => combinedText.includes(kw))) {
            preferenceWarnings.add(rule.label)
          }
        }
      })
      const allMatchedNames = Array.from(new Set([...matchedAllergens.map((a) => a.name), ...Array.from(preferenceWarnings)]))
      ```
    - _Expected_Behavior: allMatchedNames is deduplicated union of structural and preference matches (P1–P3 from design Fix 4)_
    - _Preservation: when custom_preferences empty, allMatchedNames equals structural allergen names (¬C from design Fix 4)_
    - _Requirements: 4.3, 4.4, 4.5_

  - [ ] 7.4 Return `allMatchedNames` instead of inline map
    - Change `matched_user_allergens: matchedAllergens.map((a) => a.name)` to `matched_user_allergens: allMatchedNames` in the return statement
    - _Requirements: 4.5_

  - [ ] 7.5 Verify bug condition exploration test now passes (analyze side)
    - **Property 1: Expected Behavior** - Preference Warnings Included in Analyze Results
    - **IMPORTANT**: Re-run the SAME test from task 1 (analyze.post.ts side) — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (confirms `matched_user_allergens` now includes preference-matched labels)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 7.6 Verify preservation tests still pass (analyze side)
    - **Property 2: Preservation** - No-preference users get identical results
    - **IMPORTANT**: Re-run the SAME tests from task 2 (analyze side) — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions for users with empty custom_preferences)

- [ ] 8. Fix 5 — dark-mode.css: recipe scroll area and card list background

  - [ ] 8.1 Append recipe scroll and card list dark background rules
    - Append at the end of `dark-mode.css`:
      ```css
      /* === Recipes scroll area and card list dark background === */
      html.ion-palette-dark .recipe-content::part(scroll) {
        background: var(--dm-bg-page);
      }
      html.ion-palette-dark .cards-list {
        background: var(--dm-bg-page);
      }
      ```
    - Do NOT modify any existing rules
    - _Bug_Condition: isBugCondition(element) where html.ion-palette-dark AND (.recipe-content::part(scroll) OR .cards-list) with no background rule (from design Fix 5)_
    - _Expected_Behavior: background = var(--dm-bg-page) for both selectors in dark mode (P1, P2 from design Fix 5)_
    - _Preservation: light-mode appearance unaffected; all other dark-mode.css rules unaffected (¬C from design Fix 5)_
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 9. Checkpoint — Ensure all tests pass
  - Re-run the full test suite covering all five fix areas
  - Confirm Property 1 (bug condition exploration) PASSES for Fix 1a and Fix 4
  - Confirm Property 2 (preservation) PASSES for Fix 1a and Fix 4
  - Manually verify Fix 2, Fix 3, Fix 5 in the running app (dark-mode focus border, registration modal flow, recipe page dark background)
  - Confirm no TypeScript compiler errors in modified files
  - Ensure all tests pass; ask the user if any questions arise.
