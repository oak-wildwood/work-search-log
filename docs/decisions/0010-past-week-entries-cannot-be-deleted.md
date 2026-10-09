# 10. Entries from past weeks can't be deleted

## Context

An agency may ask about any week of the benefit year, and the log is the claimant's record of it.
Once a week has ended, deleting one of its Entries removes evidence the claimant may need later,
and there is no everyday reason to do it: a mistake is fixed by editing, and an activity that
happened stays something that happened. Until now every Entry had a Delete button, so one
misplaced click could quietly remove part of a past week.

## Decision

An Entry dated before the start of the current reporting week has no Delete. "Current week" uses
the state config's week start day, the same calendar the log groups and counts by. Entries in the
current week, including future-dated ones, can still be deleted.

- **Editing stays allowed** for every Entry. Correcting a record makes it more accurate, which is
  what an agency wants. Editing a current Entry's date into a past week is allowed too, and the
  Entry is locked from then on.
- **Clear all and Restore from backup stay.** They act on the whole log, each behind its own
  confirmation, and restore is the only recovery for a cleared browser. They are now the only way
  a past Entry is removed.
- **There is no in-app escape hatch.** A duplicate or test Entry in a past week is removed by
  exporting the backup, editing the JSON, and restoring it: deliberate enough that nobody does it
  by accident.

This is a rule of the interface, not a security boundary. `localStorage` and the backup file stay
under the claimant's control, as they should.

## Consequences

- Together with [ADR 0009](./0009-follow-up-copies-the-jobs-own-fields.md), which blocks deleting
  an Entry that others link to, an original Entry in a past week is permanent, so links into past
  weeks never break.
- A page left open across the start of a new week keeps showing Delete on last week's Entries until
  it is reloaded. The rule is about not removing a past week by accident, and a timer to close that
  gap isn't worth its weight.
