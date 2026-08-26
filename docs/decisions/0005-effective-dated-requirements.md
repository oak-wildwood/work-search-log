# 5. Effective-dated requirement schedule

## Context

The number of activities required per week isn't fixed for the life of a claim. It can vary by
state, by county, and by claimant, and it can change mid-claim — a claimant's determination letter
is the actual authority, and agencies do issue corrections. If the app stored "the" required
number as a single value, correcting it would have only one possible effect: applying the new
number to every week, including weeks already logged and already scored under the old number. That
would silently turn previously-met weeks into "short" ones for no reason the claimant did anything
wrong.

## Decision

`settings.requirements` (`src/composables/useSettings.ts`) is a list of `RequirementEntry`
records, each with an `effective` date, not a single number. `resolveRequirement`
(`src/lib/requirements.ts`) picks the requirement in force for a given week as the most recent
entry whose `effective` date is on or before that week's start. `setWeeklyRequirement` always
records a new dated entry (defaulting to the current week) rather than mutating history, so
setting a new number going forward never touches how past weeks were scored. `evaluateWeeks` walks
weeks oldest-first and resolves each one's requirement independently against the schedule.

## Consequences

- A correction to the weekly count only ever applies from its effective date forward. Weeks
  already logged keep the outcome they were scored under, even after the number changes.
- `resolveRequirement` can legitimately return `null` for a week with no requirement recorded yet
  that early — `evaluateWeeks` reports that as `outcome: 'unknown'`, not as a guessed number
  presented as real. Presuming a number here would break the rule that the required count is never
  presumed, only supplied or asked for.
- Any code that touches `resolveRequirement`, `setWeeklyRequirement`, or how `PreferencesDialog`
  saves a new requirement has to preserve this: a requirement change is an insert, never an
  in-place edit of what "the" requirement was. This is also why `CLAUDE.md` asks for plan mode
  before editing `src/lib/requirements.ts` or `useSettings.ts` — a plausible-looking edit here can
  silently start rescoring past weeks.
