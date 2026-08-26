# 4. No autofill, no compliance claims

## Context

The entries this tool holds are evidence in a benefits determination: a claimant may have to
produce them, on demand, to a state unemployment agency. Falsifying a work-search record is fraud
with criminal exposure in most states. Separately, whether a given week's activities satisfy the
agency's requirement is the agency's call, not this tool's — a wrong "you're compliant" from the
app is a claim it has no authority to make and could be relied on to a claimant's detriment.

Both risks look, on the surface, like ordinary product-polish requests: "can it suggest an
activity based on what I logged last week", "can it just tell me if I'm good this week." That's
exactly why this needs to be a decision record and not just tribal knowledge — a well-meaning
feature request is the most likely way either rule gets quietly eroded.

## Decision

Two hard rules, enforced in code and in review, not just in prose:

- **Never generate, suggest, or autofill an activity entry.** Not demo content, not a
  placeholder, not an autocomplete suggestion drawn from prior entries. Prefilling the claimant's
  own profile data (their name) is fine; inventing a plausible employer, date, or activity is not,
  under any framing. The one seeded fixture (`src/lib/seedEntries.ts`) is fenced behind
  `import.meta.env.DEV` and stays that way — a production build starts empty.
- **Never assert compliance.** Copy reports what was logged ("3 of 4 logged"), never a judgment
  ("you've met your requirement", "you're compliant this week"). This is why every scoring badge
  and cap warning in `WeekGroup.vue` carries the `no-print` class: the printed sheet is what an
  agency may actually read, and printing this app's arithmetic would tell them one of the
  claimant's own activities shouldn't count, which isn't ours to say. An exempt week keeps its
  stated reason, because that explains a gap rather than judging one.

## Consequences

- Some features that would otherwise be easy wins — "smart" suggestions, a green checkmark for a
  met week, autofill from a resume — are out of scope permanently, not just deprioritized.
- Any change to `EntryForm.vue`, `WeekGroup.vue`, or copy anywhere in the app should be checked
  against these two rules before merging, regardless of how small it looks.
- If a future contributor wants either behavior, the answer is: read this record, and if the
  disagreement is genuine, open a new one that supersedes it rather than eroding this one edit by
  edit.
