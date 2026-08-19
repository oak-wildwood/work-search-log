# Contributing, or (more likely) forking

**Forking is the expected path.** This is one person's tool, published because it might save
someone else the trouble of building the same thing. Your fork is yours — change whatever you
like, and there's no need to send anything back.

Pull requests aren't closed off, but they're not what I'm set up for: I maintain this in spare
time, so a PR may sit a while or not get merged, and forking costs you nothing by comparison. If
you do send one, a state config is the most likely thing to land.

Everything state-specific lives in one JSON file, so adapting it usually means writing that file
and nothing else.

## Writing a state config

State configs live in `src/config/states/`, one file per state, named after the postal code
(`tx.json`, `wa.json`). Copy whichever is closer to your state and edit it. The loader picks up
any `.json` in that directory automatically — there's no registry to update.

Two shipped configs, so there's a worked example of each shape:

- **`tx.json`** — Texas. The weekly count varies by county, so the app asks for it rather than
  presuming.
- **`wa.json`** — Washington. A fixed statewide count with a much larger activity taxonomy.
- **`generic-us.json`** — the fallback for the other 48. Anything without its own file lands here,
  so the tool stays usable everywhere.

### Get the values from the agency, not from memory

Set `rules_url` to the official page the values came from, and `last_verified` to the day you
actually checked them against that page. A config with no `last_verified`, or one more than 12
months old, renders a staleness notice in the app.

That notice is a feature. Rules going stale without anyone noticing is this tool's main failure
mode, so it's made visible rather than treated as impossible.

Please don't guess. A field left at its default is better than a confidently wrong one.

### The fields

| Field                                                 | What it does                                                                                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code`                                                | Postal code, uppercase. `GENERIC_US` is reserved for the fallback.                                                                                            |
| `agency_name` / `agency_short`                        | Agency names, used in on-screen copy.                                                                                                                         |
| `week_start_day`                                      | 0 = Sunday. Decides where weeks are cut.                                                                                                                      |
| `requirement_source`                                  | `state`, `county`, or `letter`. Anything but `state` makes the app push people to their determination letter for the weekly count.                            |
| `weekly_requirement`                                  | The weekly count, where the state fixes one for everybody. Only read when `requirement_source` is `state`, and only ever offered as a starting value.        |
| `requirement_lookup_url`                              | Where someone looks up their own number when the state doesn't fix one — e.g. TWC's table of required activities by county.                                   |
| `jurisdiction_label`                                  | What the state calls the local unit — County, WorkSource office, workforce area.                                                                              |
| `claim_id_label`                                      | What the state calls the claim identifier.                                                                                                                    |
| `has_online_logging`                                  | `true` if the state records work search in its own portal, which makes this tool a backup copy rather than the record.                                        |
| `activity_types`                                      | The activities the state recognizes. See below.                                                                                                               |
| `contact_methods` / `result_options` / `site_options` | Dropdown choices.                                                                                                                                             |
| `required_fields`                                     | Which fields the state's own log asks for. **Not wired to the UI yet** — it's recorded data, and the form currently requires only date and activity. `date` is always included whatever you put here.  |
| `duplicate_employer_counts`                           | `false` if repeat contact with the same employer in one week may not count twice. Produces a warning only — never blocks.                                     |
| `retention`                                           | How long the record must be kept, as a phrase completing "Keep this ___" — e.g. `for your entire benefit year`.                                               |
| `official_log_url` / `rules_url`                      | Links to the agency's own printable log form and its rules page. Both are shown to the claimant.                                                              |

### Activity types

```json
{ "id": "apply_online", "label": "Applied online", "counts_as": "employer_contact" }
```

- `id` — stable, lowercase, never renamed once you've logged against it. Entries store the id, so
  renaming one orphans activities you already recorded.
- `label` — what you see in the dropdown.
- `counts_as` — `employer_contact`, `approved_activity`, or `registration`. States that require
  part of the weekly total to be real employer contacts rather than workshops or résumé uploads
  rely on this split.
- `max_per_claim` / `max_per_week` — optional caps, e.g. a job-bank registration that counts once.
- `offline` — `true` for activities not done through a job site, which hides "Site or source".

An unrecognized `counts_as` degrades to `approved_activity`, and an activity type this build
doesn't know still counts toward the weekly total. Nothing in a config should be able to stop
someone recording what they actually did.

### A limitation worth knowing

`required_fields` is one flat list per state. Some states' forms branch — Washington's asks for
employer name, address, and phone when the activity was an employer contact, but asks what you did
and where when it wasn't. There's no way to express that, so `wa.json` requires only the fields
common to both and leaves the rest optional. If your state's form branches the same way, expect to
under-prompt rather than over-prompt.

## Two things this tool won't do

Worth keeping if you fork it:

- **It never generates, suggests, or autofills activity entries.** Falsifying work search records
  is fraud with criminal exposure in most states. Prefilling your _own_ profile data is fine;
  inventing plausible employers or activities is not, under any framing.
- **It makes no compliance claims.** The tool organizes records you created. It doesn't determine
  eligibility, guarantee anything, or claim affiliation with any agency. Keep copy in that
  register — "3 of 4 logged", not "you have met your requirement".

## Before you deploy (or open a PR)

```bash
npm run test
npm run lint
npm run build
```
