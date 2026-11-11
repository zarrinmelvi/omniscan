# Bugfix Requirements Document

## Introduction

On Android (mobile browser/WebView), the native date picker opened from the Birthday field on the Create Account page shows a broken calendar: header "31 Jan 1", month "January 1", and a year grid of roughly 679 to 708. The Birthday input (`type="date"`) in `RegisterPage.vue` only has a `max` attribute (today minus 16 years) and no `min` and no sensible initial/default view. The same pattern exists in the Birthday input in `ProfilePage.vue`. Year values such as `0001-01-31` can be entered or selected, which then produce an invalid date of birth, a wrong age calculation, and a confusing picker. Users need a standard calendar limited to a realistic date-of-birth range.

Other `type="date"` inputs (pantry expiration and best-before dates in `PantryItemDetail.vue`, `PhotoPantryUploadModal.vue`, `ScanResultModal.vue`) have no `min` or `max` and can show the same implausible year range.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the Birthday field on the Create Account page is empty and the user opens the native date picker on Android THEN the system shows an out-of-range calendar (e.g. "31 Jan 1", year grid 679 to 708) instead of a realistic starting view.

1.2 WHEN the Birthday input has no `min` attribute and the user selects or types a year earlier than 1900 (e.g. year 1 or `0001-01-31`) THEN the system accepts it as the birthday value.

1.3 WHEN the birthday value is an implausibly old date (e.g. year 1 to 1899) THEN the system does not show a validation error, because `ageError` only rejects ages under 16, and the value is submitted to registration.

1.4 WHEN the user opens the Birthday field on the Profile page (`ProfilePage.vue`) THEN the system exhibits the same missing lower bound and can show or save an out-of-range date.

1.5 WHEN the user opens the expiration date or best-before date pickers (pantry detail, photo upload, scan result) THEN the system has no `min`/`max` and allows implausible years (e.g. year 1 or year 9999).

1.6 WHEN the birthday value is not a valid parsable date THEN the system computes age from `NaN` and shows no error, so the invalid value passes validation.

### Expected Behavior (Correct)

2.1 WHEN the Birthday field is empty and the user opens the date picker THEN the system SHALL open the calendar at a sensible default view within the allowed range (the `max` date, i.e. 16 years ago) with a year list limited to 1900 through the `max` year.

2.2 WHEN the user selects or types a birthday before 1900-01-01 THEN the system SHALL reject it via a `min="1900-01-01"` attribute and a validation error (e.g. "Please enter a valid birthday"), and SHALL NOT submit it.

2.3 WHEN the birthday is outside the range 1900-01-01 to the `max` date, or is not a valid date THEN the system SHALL show a field error, mark the field invalid, and block registration.

2.4 WHEN the user opens the Birthday field on the Profile page THEN the system SHALL apply the same `min`/`max` range and the same validation, and SHALL block saving an out-of-range value.

2.5 WHEN the user opens the pantry expiration or best-before date pickers THEN the system SHALL apply a sensible `min`/`max` range (e.g. a recent past lower bound and a near-future upper bound such as today minus 1 year to today plus 20 years) and SHALL reject values outside it.

2.6 WHEN the `max` birthday date is computed THEN the system SHALL use the user's local date (not UTC via `toISOString`) so the bound is correct near midnight and across timezones.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the birthday is a valid date between 1900-01-01 and 16 years ago THEN the system SHALL CONTINUE TO accept it and submit it in `YYYY-MM-DD` format.

3.2 WHEN the user is under 16 years old THEN the system SHALL CONTINUE TO show "You must be at least 16 years old to register" and block registration.

3.3 WHEN the Birthday field is empty on submit THEN the system SHALL CONTINUE TO show the existing required-field messages (e.g. "Please enter your birthday.").

3.4 WHEN a Google-pending account is completed THEN the system SHALL CONTINUE TO send the birthday to `createGoogleAccount` unchanged for valid values.

3.5 WHEN a user has an existing valid birthday on the Profile page THEN the system SHALL CONTINUE TO display it (formatted) and prefill the input, and the unsaved-changes detection SHALL CONTINUE TO work.

3.6 WHEN a valid pantry expiration or best-before date within the allowed range is entered THEN the system SHALL CONTINUE TO save it, show the filled/expired styling, and behave as before.

3.7 WHEN the date inputs are rendered THEN the system SHALL CONTINUE TO use the native `type="date"` control and existing dark/light styling.

## Bug Condition

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type DateInputState { kind, value, min, max }
  OUTPUT: boolean

  // Bug when a date input lacks a lower bound/default view, or its value is outside a plausible range or invalid
  RETURN (X.kind = Birthday AND (X.min = undefined OR year(X.value) < 1900 OR NOT isValidDate(X.value) AND X.value != ""))
      OR (X.kind = Birthday AND X.value = "" AND X.min = undefined)
      OR (X.kind IN {Expiration, BestBefore} AND (X.min = undefined OR X.max = undefined))
END FUNCTION
```

```pascal
// Property: Fix Checking
FOR ALL X WHERE isBugCondition(X) DO
  result ← datePicker'(X)
  ASSERT result.min <= result.value <= result.max OR result.showsValidationError
  ASSERT result.pickerYearRange ⊆ [result.min.year, result.max.year]
  ASSERT result.submitted = false WHEN result.showsValidationError
END FOR
```

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT datePicker(X) = datePicker'(X)
END FOR
```
