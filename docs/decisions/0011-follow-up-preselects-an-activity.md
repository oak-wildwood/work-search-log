# 11. Follow up preselects the state's follow-up activity

## Context

[ADR 0009](./0009-follow-up-copies-the-jobs-own-fields.md) made Follow up copy a job's own fields
and leave everything about the new activity blank, the activity included. In use, nearly every
Follow up records the same activity ("Followed up on a job contact" in Texas), so the claimant
picks it from a long list every time. 0009 said a change here needed its own record.

## Decision

A state config may name one of its own activity ids as `follow_up_activity`. Follow up opens with
that activity selected. It is a starting value in the one field the claimant has to look at to
save: they can change it to an interview, a call, or anything else on the list.

- **Only Follow up.** The normal form and Edit never preselect an activity.
- **Only from config,** never inferred from earlier Entries or from what the claimant picked last
  time, so [ADR 0004](./0004-no-autofill-no-compliance-claims.md)'s ban on suggestions drawn from
  prior entries still holds. Choosing Follow up is the claimant saying "this is a follow-up"; the
  config only says which item on the list means that in their state.
- **The date stays blank.** A preselected activity is visible and usually right; a preselected
  date is easy to miss, and a wrong one moves the record into another day or week. The **Today**
  button covers the common case with a click.
- **It degrades to blank.** A config without the field, or naming an id it doesn't define,
  preselects nothing. `tx.json` and `generic-us.json` name `follow_up`. `wa.json` names none, since
  none of Washington's activities is plainly a follow-up and guessing one would put our reading of
  ESD's list into the claimant's record.

`follow_up_activity` maps a button to an activity the config already has. It is not read from the
agency's page, so it doesn't change `last_verified`.

## Consequences

- Anyone adding a state decides whether one of its activities is a follow-up; leaving the field
  out is always safe.
- A further prefill on Follow up, such as the contact method, still needs its own record.
