# Agent instructions

Instructions for AI coding agents working in this repository. Humans should read
[README.md](./README.md) and [CONTRIBUTING.md](./CONTRIBUTING.md) instead — this file covers only
what an agent can't infer from the code.

## What this app is, and why it constrains you

This is a work-search log: a record of job-search activity that a claimant may have to produce to a
state unemployment agency, for any week of their benefit year, on demand.

Read from the source alone it looks like a CRUD app over `localStorage`. It isn't. The records it
holds are evidence in a benefits determination, and falsifying a work-search record is fraud with
criminal exposure in most states. That gap between what the code looks like and what it is drives
every rule below.

## Hard rules

These are prohibitions, not preferences. If a request seems to require breaking one, say so and stop
rather than finding a way around it.

**Never generate, suggest, or autofill an activity entry.** Not as demo content, not as a
placeholder, not as an "example" in the form, not as an autocomplete suggestion drawn from previous
entries. Prefilling the claimant's _own_ profile data (their name) is fine. Inventing a plausible
employer, date, or activity is not, under any framing — the entry would be a fabricated record in a
document submitted to a government agency.

The one seeded fixture that exists (`src/lib/seedEntries.ts`) is fenced behind `import.meta.env.DEV`
and must stay that way. A production build starts empty.

**Never assert compliance.** The tool reports what was logged; it does not determine eligibility.
Copy reads "3 of 4 logged", never "you have met your requirement" or "you're compliant this week".
Whether an activity satisfies a rule is the agency's determination.

**Never print this app's scoring.** Every badge, count, and cap warning carries `no-print`. The
printed sheet is what an agency may actually read, and printing our arithmetic would tell them one
of the claimant's own activities shouldn't count — which is not ours to say. An exempt week keeps
its stated reason, because that explains a gap rather than judging one.

**Never store or ask for an SSN or claim number.** A browser-only app has nowhere safe to keep one:
any key protecting it would sit in the same storage. The printed sheet leaves a ruled blank line for
the claimant to fill in by hand. The claimant's name is the only personal detail stored.

**Never presume a weekly requirement.** The required number varies by state, by county, and by
claimant, and it appears on the claimant's determination letter. A config carries a number only
where the state fixes one for everybody, and even then it is offered as a starting value. No
default, no guess, no "reasonable" fallback — showing nothing is correct when the number is unknown.

**Never let a config value stop someone recording what they did.** Every field in a state config
degrades to a working default rather than throwing. An unrecognized `counts_as` still counts toward
the weekly total. An activity this build doesn't know still saves. `GENERIC_US` stands in for any
state without a bundled config, so the tool works in all 50.

## Invariants that are easy to break by accident

**Requirement changes are effective-dated and never retroactive.** `settings.requirements` is a
dated list, not a single number, so a correction made today never reaches back and marks
already-logged weeks as short. Any change touching `resolveRequirement` or `PreferencesDialog.save`
has to preserve this.

**Activity ids are permanent.** Entries store `activityId`, so renaming one orphans activities
already recorded. Labels are snapshotted onto the entry alongside the id, which is why a config
change never rewrites history and why an entry logged under another state's config keeps its
original wording.

**Config values come from the agency's own published page, never from memory or inference.** Set
`rules_url` to the page the values came from and `last_verified` to the day you actually checked
them against it. Rules going stale unnoticed is this tool's main failure mode, so staleness is
surfaced in the UI rather than treated as impossible. A field left at its default beats a
confidently wrong one. If you cannot verify a value, leave it out and say which ones you couldn't
confirm.

**Scoring lives in `src/lib/`, and it's pure.** `lib/` holds pure functions with no Vue imports and
no side effects; `composables/` wraps them in reactive state; `components/` render. Keep scoring
logic out of components — the tests depend on it staying callable without mounting anything.

## Working in this repo

Adding support for a new state is a defined workflow with its own skill — see
`.claude/skills/add-state-config/`. Don't hand-roll it.

Before opening a PR, run the checks listed at the bottom of [CONTRIBUTING.md](./CONTRIBUTING.md).

Work on a branch and open a PR; `main` is protected by CI and deploys to GitHub Pages on merge.
Open issues carry the current engineering backlog and explain the reasoning behind each change —
read the relevant one before starting work it touches.

### PR titles become commit messages

This repo squash-merges, and the squashed commit takes the **PR title** as its subject with an
empty body. So the PR title is not a label on a discussion — it is the permanent record of the
change in `git log`, and it is the only part that survives the merge.

Write it as a conventional commit: `type: imperative summary`, lowercase after the colon, no
trailing period, under about 70 characters.

These seven types are the whole set. Don't invent an eighth.

| Type       | Use it for                                                | Example                                                   |
| ---------- | --------------------------------------------------------- | --------------------------------------------------------- |
| `feat`     | Something a claimant can now do that they couldn't        | `feat: add per-week employer contact minimum`             |
| `fix`      | Behaviour a claimant would notice was wrong               | `fix: stop the week badge rendering on the printed sheet` |
| `refactor` | Restructuring with no change a claimant would notice      | `refactor: extract the print cover sheet from App.vue`    |
| `test`     | Tests, test infrastructure, fixtures                      | `test: add component coverage for EntryForm`              |
| `docs`     | README, CONTRIBUTING, ADRs, this file                     | `docs: record the effective-dating decision as an ADR`    |
| `ci`       | CI workflows, build config, lint and format setup         | `ci: enforce Prettier formatting`                         |
| `chore`    | Dependency bumps and housekeeping that fits nothing above | `chore: bump vite to 8.2`                                 |

The `feat`/`fix` versus `refactor` split is the one that matters: it's the line between changes a
claimant would notice and changes only we would. Everything else is filing.

When a change spans several types, name the one that carries the point of the PR rather than the
one touching the most files. A refactor that needed twenty new tests is still `refactor`.

Deliberately absent, so nobody has to wonder: no `style`, because Prettier is enforced in CI and a
formatting-only change is `chore`; no `build` separate from `ci`, because here they're the same
concern; no `perf`, because a local-only app has no performance work worth its own category — if
that ever changes, add it then rather than reserving it now.

Individual commits on the branch don't survive the squash, so they're for the reviewer rather than
for history. Use them to separate things worth reviewing apart — a mechanical reformat from a
behavioural change, say — and don't agonise over their wording.
