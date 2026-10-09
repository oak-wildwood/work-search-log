# 9. Follow up copies the job's own fields

## Context

After applying, a claimant often has more contact about the same job: a follow-up email, a
recruiter's call or text, an interview. Each is an activity they may want credit for, and each
needs a new Entry. Today that Entry starts blank, so the claimant retypes the employer, title,
address and contact for a job already in the log. The log also can't say that two Entries concern
the same job, so a companion service reading the log can't put them on one timeline.

[ADR 0004](./0004-no-autofill-no-compliance-claims.md) forbids "an autocomplete suggestion drawn
from prior entries." Copying fields from an earlier Entry reads like that, so this record amends
0004 for one narrow case rather than letting it erode.

## Decision

Every Entry that names an employer has a **Follow up** action. It opens the form for a new Entry
with:

- **Copied, marked and editable:** `employer`, `jobType` (the job title), `address`, `phone`,
  `contactName` and `contract`. These describe the job, not the activity. Each is marked as coming
  from the earlier Entry and its date, and can be changed before saving.
- **Blank:** `date`, `activityId` and `activity`, `siteAppliedOn`, `contactMethod`, `result` and
  `notes`. These describe the new activity (`siteAppliedOn` says where an application was made),
  so only the claimant can supply them. The activity is picked from the state's usual list; there
  is no follow-up activity type and no config field that preselects one.
- **A link:** the new Entry stores `linkedTo`, the id of the Entry the chain started from. Follow
  up on an Entry that is itself linked copies from that Entry but links to the same original, so a
  chain never grows deeper than one level.

Nothing saves until the claimant presses Save. The link is shown on screen and never printed: the
printed row already names the employer and title, and the sheet stays close to what an agency's
own form asks for.

This is not a suggestion in 0004's sense. The copied fields identify a job the claimant already
recorded, chosen by the claimant on the Entry they clicked; nothing is inferred, ranked or offered
from other Entries. Every field that says what happened, and when, still comes from the claimant.

An Entry that others link to can't be deleted: the app says how many link to it and asks for those
to be deleted first. So a link made in the app always points at an Entry still in the log, and a
chain stays one level deep without any rule for a missing original. There is no way to add or
change a link after saving. A link can still point at nothing if an older backup is restored over
the log; that is harmless, and a follow-up on such an Entry links to the same missing id rather
than starting a second level.

## Consequences

- `linkedTo` is an ordinary optional Entry field. Older Entries lack it and read as unlinked. It
  travels in backups and, with the local-server backend on, in each synced Entry, so a companion
  service can join on it without any change to the wire contract of
  [ADR 0008](./0008-optional-local-server-storage.md).
- The log assigns no meaning to a link beyond "same job." Whether a linked interview advances
  anything, or how linked Entries are counted, is for whatever reads the log.
- 0004 still forbids every other form of copying, suggesting or prefilling from earlier Entries.
  A request to copy more fields, copy from an Entry the claimant didn't click, or prefill the
  activity needs a new record.
