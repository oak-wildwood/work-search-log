# Work Search Log

A claimant's own record of job-search activity, kept in the browser, for a state unemployment
agency that may ask to see any week of the benefit year. The terms below are the ones the code and
the docs use; [AGENTS.md](./AGENTS.md) has the rules that follow from them.

## Language

**Entry**:
One activity the claimant did on one date: an application, an interview, a follow-up, a workshop.
Entries are the claimant's account of what they did, never something the app wrote for them
([ADR 0004](./docs/decisions/0004-no-autofill-no-compliance-claims.md)).
_Avoid_: Record, row, log line

**Activity**:
The kind of thing an Entry records, chosen from the claimant's state config. An Entry keeps both
the Activity's permanent id and a snapshot of its label, so a config change never rewrites history.
_Avoid_: Type, category, action

**Linked entry**:
An Entry that concerns the same job as an earlier one, created with **Follow up** on that earlier
Entry. It stores the earlier Entry's id in `linkedTo`. The link always points at the Entry the chain
started from, so following up on a follow-up links to the original. Any Activity can be linked: a
follow-up, an interview, a recruiter call. The link says which job, never what the Activity counts
as ([ADR 0009](./docs/decisions/0009-follow-up-copies-the-jobs-own-fields.md)).
_Avoid_: Child entry, thread, related entry, follow-up entry (a Linked entry need not be a
follow-up)

**Week**:
The agency's reporting week, starting on the day the state config names. Entries are grouped and
counted by Week.
_Avoid_: Period, cycle

**Requirement**:
How many activities the agency asks for in a Week, as the claimant's determination letter states
it. Effective-dated and never presumed
([ADR 0005](./docs/decisions/0005-effective-dated-requirements.md)).
_Avoid_: Quota, target, minimum
