# 3. State rules as runtime-normalized JSON

## Context

Work-search rules vary by state, and this project is built to be forked: adapting it for a new
state should be a data change, not a code change. That means the shape of a state's config can't
be trusted the way a hand-written TypeScript module could be — it comes from a JSON file a
contributor wrote by copying another state's file and editing values against the agency's live
page (see `add-state-config` skill and CONTRIBUTING.md). A typo, an omitted field, or an
unrecognized value in that file is expected to happen sometimes, and it must never be the reason
an activity a claimant actually did fails to save or fails to count.

## Decision

State configs are untyped JSON on disk (`src/config/states/*.json`) and are normalized into a
`StateConfig` at runtime by `src/config/index.ts`, loaded eagerly via `import.meta.glob`. The
normalizer (`normalizeConfig`, `normalizeActivity`) treats every field as untrusted input: an
unrecognized `counts_as` degrades to `'approved_activity'` rather than being rejected, a missing
`requirement_source` falls back to `'letter'`, an unknown `required_fields` id is dropped rather
than left dangling, and a whole state falls back to `GENERIC_US` (`getStateConfig`) if its file
fails to normalize into anything with a `code`. `resolveActivity` in the same file resolves an
entry's activity by id first, then by label, so an activity absent from a config still resolves
if the label happens to match.

## Consequences

- Nothing in a config can stop someone from recording what they actually did — that's the
  governing principle, and it's why every field has a working default instead of a thrown error.
  An unrecognized activity still counts toward the weekly total (see
  [0005](./0005-effective-dated-requirements.md) for the related rule that the count itself is
  never presumed).
- `GENERIC_US` exists so a state with no bundled config at all still produces a usable, if
  generic, tool rather than a broken one.
- The cost is type safety: nothing at the JSON layer catches a malformed config until it's
  normalized, and normalization can silently substitute a default for a genuine mistake. That
  tradeoff is deliberate — a silently-defaulted field is recoverable (fix the JSON, ship again);
  a claimant unable to save a real activity is not.
