---
name: add-state-config
description: Add or update a US state's work-search rules in src/config/states/*.json. Use this whenever someone wants to support a new state, fix or refresh an existing state's config, add or change activity types, update a weekly requirement, or resolve a staleness notice — and whenever a request names a state, a state workforce agency (TWC, ESD, EDD, DEO, …), or a postal code in the context of this repo's rules. Also use it when asked to "check if our rules are still current" for any state. Do not write a state config by hand without this skill; the values have to be verified against the agency's live page and this covers how.
---

# Adding a state config

Every state-specific rule in this app lives in one JSON file under `src/config/states/`, named after
the postal code (`tx.json`, `wa.json`). The loader picks up any `.json` in that directory
automatically — there is no registry to update, no import to add, and no component to touch.

That makes the mechanical part easy. The part that needs care is getting the values right, because a
wrong number here misinforms someone about what their state requires of them while they're claiming
benefits. This skill is mostly about that.

## The one rule that matters

**Every value comes from the agency's own published page, read today. Nothing comes from memory.**

Your training data contains plausible-sounding state unemployment rules. Some of them were true
once. Requirements change, counties get reclassified, activity taxonomies get rewritten. A value you
recall confidently is not a verified value, and this file's whole purpose is to be the verified
copy.

If you cannot reach the agency's page, or the page doesn't state a value, leave that field at its
default and tell the user which fields you couldn't confirm. A missing field degrades gracefully —
the loader has a fallback for every one of them. A wrong field doesn't degrade at all; it just lies.

## Workflow

### 1. Find the agency's rules page

Search for the state's work-search requirements on the agency's own domain — a `.gov` or the
agency's official site, not a law firm's summary, not a news article, not an aggregator. You want
the page that states, in the agency's own words:

- how many work-search activities are required per week, and whether that number is statewide or
  varies by county / local office / individual determination
- which activities count
- whether any activity is capped or can't be repeated
- how long the claimant must keep the record
- whether the state has its own online portal where work search is logged

Note the URL. It becomes `rules_url`, and it's shown to the claimant in the app.

If the state publishes its own printable log form, note that URL too — it becomes `official_log_url`.

### 2. Copy the closest existing config

Three exist, and they're deliberately different shapes:

- `wa.json` — a fixed statewide count, a large state-specific activity taxonomy, and a per-claim cap
- `tx.json` — a count that varies by county, so the app asks instead of presuming
- `generic-us.json` — the fallback for states with no file of their own

Copy whichever matches your state's shape. Starting from a real config keeps the field ordering and
the general structure consistent, which makes the diff readable.

### 3. Fill in the fields

| Field                                                 | What it does                                                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code`                                                | Postal code, uppercase. `GENERIC_US` is reserved for the fallback.                                                                                |
| `agency_name` / `agency_short`                        | Agency names, used in on-screen copy. `agency_short` appears mid-sentence, so it should read naturally there.                                     |
| `week_start_day`                                      | 0 = Sunday. Decides where weeks are cut. Get this from the agency's own week definition, not from convention.                                     |
| `requirement_source`                                  | `state`, `county`, or `letter`. Anything but `state` makes the app push the claimant to their determination letter.                               |
| `weekly_requirement`                                  | Only read when `requirement_source` is `state`. Omit it otherwise — the loader will discard it anyway, and setting it signals a misunderstanding. |
| `requirement_lookup_url`                              | Where someone looks up their own number when the state doesn't fix one.                                                                           |
| `jurisdiction_label`                                  | What the state calls the local unit — County, WorkSource office, workforce area.                                                                  |
| `claim_id_label`                                      | What the state calls the claim identifier. Appears as a label on the printed sheet.                                                               |
| `has_online_logging`                                  | `true` if the state records work search in its own portal, which makes this tool a backup copy rather than the record.                            |
| `activity_types`                                      | See below.                                                                                                                                        |
| `contact_methods` / `result_options` / `site_options` | Dropdown choices.                                                                                                                                 |
| `required_fields`                                     | Which fields the state's log asks for. Recorded data, not yet wired to the form. `date` is always included whatever you put.                      |
| `duplicate_employer_counts`                           | `false` if repeat contact with the same employer in one week may not count twice. Produces a warning only — never blocks.                         |
| `retention`                                           | How long the record must be kept, phrased to complete "Keep this ___" — e.g. `for your entire benefit year`.                                      |
| `official_log_url` / `rules_url`                      | The agency's own printable form and its rules page.                                                                                               |
| `last_verified`                                       | `yyyy-mm-dd`, the day you actually checked. See step 5.                                                                                           |

### 4. Write the activity types

```json
{ "id": "apply_online", "label": "Applied online", "counts_as": "employer_contact" }
```

- `id` — stable, lowercase, and permanent. Entries store the id, so renaming one orphans activities
  already logged against it. Choose carefully the first time; never rename later.
- `label` — the dropdown wording. Prefer the agency's own phrasing where it has some.
- `counts_as` — `employer_contact`, `approved_activity`, or `registration`. States that require part
  of the weekly total to be real employer contacts, rather than workshops or résumé uploads, depend
  on this split being right.
- `max_per_claim` / `max_per_week` — optional caps. Add one **only** where the agency actually states
  the limit. Inventing a cap discounts a claimant's own logged activity on our say-so. `wa.json`
  caps WorkSource registration at 1 per claim because ESD states plainly that you can't repeat the
  same activity for credit; `tx.json` asserts no cap because TWC publishes no equivalent rule.
- `offline` — `true` for activities not done through a job site, which hides the "Site or source"
  field.

If your state reuses wording that already appears in `generic-us.json`, keep the wording identical.
Entries logged before configs existed resolve by label, so matching wording means those entries
still resolve. Diverging wording silently orphans them.

### 5. Set `last_verified` to today

Use the actual current date, in `yyyy-mm-dd`. Get it from the environment rather than guessing —
`date +%F` — because a wrong date here either hides a stale config or nags about a fresh one.

A config with no `last_verified`, or one more than 12 months old, renders a staleness notice in the
app. That notice is a feature, not a defect to work around.

### 6. Run the checks

```bash
npm run test
npm run lint
npm run build
```

Then load the app and select the state, confirming the activity dropdown fills from your config and
the agency name appears in the header.

## A limitation to expect

`required_fields` is one flat list per state. Some states' forms branch — Washington's asks for
employer name, address, and phone when the activity was an employer contact, but asks what you did
and where when it wasn't. There's no way to express that, so `wa.json` requires only the fields
common to both branches and leaves the rest optional.

If your state's form branches the same way, under-prompt rather than over-prompt. A claimant blocked
from saving a real activity because our schema wanted a field their situation doesn't have is a
worse failure than a field left blank.

## What to tell the user when you're done

State plainly:

- which agency page each value came from
- which fields you left at their defaults because the page didn't state them
- anything you found ambiguous and resolved by choosing the more permissive reading

That last one matters. When the agency's wording is unclear, the config should err toward letting
someone log an activity and letting the agency decide, never toward blocking it.
