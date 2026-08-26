# 2. Module-scoped composables instead of Pinia

## Context

The app needs a handful of pieces of shared, reactive state — entries, settings, the resolved
state config, theme — readable and writable from components that don't share a parent. That's
normally Pinia's job in a Vue app. But the amount of state here is small, none of it needs
devtools time-travel or plugin middleware, and pulling in a state-management library is a
dependency and a concept a one-person, fork-first tool doesn't need to carry.

## Decision

Each composable (`src/composables/useEntries.ts`, `useSettings.ts`, `useStateConfig.ts`,
`useTheme.ts`) declares its reactive state — `ref`/`computed` — at module scope, outside the
exported function, and persists it to `localStorage` via `src/lib/storage.ts` with a `watch`.
Every component that calls e.g. `useEntries()` gets the same shared instance back, because it's
the same module-level `ref`, not a per-call one. No store registry, no `provide`/`inject`, no
plugin.

## Consequences

- No extra dependency, no store boilerplate, and the mental model is just "a module with a
  `ref` in it" — anyone who knows Vue's Composition API already knows how this works.
- The cost is testability: module-level state is a singleton for the life of the JS module, so
  tests that want a clean store have to work around state leaking between cases rather than
  getting a fresh instance per test the way a Pinia store instantiated in a test would. That cost
  is real and is being paid down in [#8](https://github.com/oak-wildwood/work-search-log/issues/8).
- This works because the app's shared state is genuinely small. If the number of composables or
  the complexity of their interactions grows significantly, that balance could tip and this
  decision is worth revisiting — but that hasn't happened yet.
