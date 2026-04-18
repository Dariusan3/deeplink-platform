# Rules Dialog UX — Country Picker + Date Validation

## Country picker
**Before:** plain text input where users typed comma-separated ISO codes like `US, RO, GB, DE`. No validation, no discoverability — users had to know codes by heart.

**After:** searchable multi-select with flag emojis and country names. See [src/components/ui/country-multiselect.tsx](../src/components/ui/country-multiselect.tsx) and the country list in [src/lib/countries.ts](../src/lib/countries.ts).

- Selected countries shown as removable chips inside the trigger button.
- Dropdown has a search box that matches on name or code.
- Flag emojis are derived from the 2-letter code (regional indicator symbols, offset 127397 from ASCII) — no per-country asset needed.
- Stores the exact same `string[]` of ISO codes in `rule.conditions.geo.countries`, so no migration and no change to the redirect evaluator in [src/app/[slug]/route.ts](../src/app/[slug]/route.ts).

## Date validation
Two layers:

**Picker-level** ([src/components/ui/date-picker.tsx](../src/components/ui/date-picker.tsx))
- New optional `minDate` prop on `DateTimePicker`.
- Days before `minDate` are disabled in the calendar via `react-day-picker`'s `disabled={{ before: minDay }}` matcher.
- If the user picks the same day but a time earlier than `minDate`, the picker clamps the time up to `minDate` (avoids same-day-but-earlier-hour loopholes).

**Rules dialog wiring** ([src/components/links/rules-dialog.tsx](../src/components/links/rules-dialog.tsx))
- **Start** picker: `minDate={new Date()}` — no past dates.
- **End** picker: `minDate` = start + 1 minute (when start is in the future) or `now` (when start is unset or past). Prevents picking an end before start.
- When the user moves **Start** past an already-set **End**, End is cleared so they can re-pick rather than silently saving an invalid range.

**Save-time validation** (`handleSave`)
- Still rejects `start >= end`.
- Now also rejects Start-in-the-past and End-in-the-past — but only when the user actually edited those fields, by diffing against the originally-loaded values. This keeps existing, already-expired rules editable: opening the dialog on an old rule to change the destination won't block saves because the stored start is from last month.
- `now - 60s` buffer on the start check absorbs the tiny drift between when the dialog was opened and when Save was clicked.

## Data shape — unchanged
No migration, no schema change. The `redirect_rules` JSONB still stores `{ priority, destination_url, conditions: { geo, device, time } }`. The redirect route (`evaluateConditions` at [src/app/[slug]/route.ts:28-61](../src/app/[slug]/route.ts#L28-L61)) continues to consume the same shape.
