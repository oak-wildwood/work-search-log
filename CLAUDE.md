@AGENTS.md

## Claude Code

The instructions above are the shared, tool-agnostic ones. This section is Claude-specific.

**Use plan mode before editing `src/lib/requirements.ts`, `src/config/index.ts`, or
`src/composables/useSettings.ts`.** These three carry the scoring and requirement-schedule
invariants described above. They are small and look easy to change, which is the problem — a
plausible-looking edit can silently start rescoring past weeks or presuming a number. Plan first,
then edit.

**Prefer extending `src/config/states/*.json` over adding conditionals in components.** If a
behaviour differs between states, it belongs in the config schema, not in a `v-if` on a state code.
The whole point of the config layer is that a new state is a data change.

**Don't add a state config from memory.** Invoke the `add-state-config` skill — it exists because
getting these values right requires checking the agency's live page, and a wrong value here has real
consequences for someone's benefits.
