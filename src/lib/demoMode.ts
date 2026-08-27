/**
 * Whether this build may seed sample data — the dev server, or an explicit
 * opt-in flag. The flag is never set for the GitHub Pages build, only (by hand,
 * in the dashboard) for Vercel preview deploys, so a claimant using the real app
 * never sees seeded data. Vite inlines env vars as strings, so this compares
 * against the literal '1' rather than truthiness — '0' and 'false' are both
 * non-empty strings and would otherwise turn seeding on when they plainly mean
 * off.
 *
 * Read once at module load. Both `useEntries` and `useSettings` seed from it, so
 * it lives here rather than in either of them, where the two conditions could
 * drift apart.
 *
 * A test run is not a demo build: vitest sets DEV, so without the MODE check
 * every component test would start against a seeded profile and a presumed
 * weekly requirement, quietly hiding the empty-state behaviour most of them
 * exist to pin down. A test that wants seeding on asks for it by stubbing the
 * flag, which is checked first and so still wins.
 */
export const DEMO_DATA_ENABLED =
  import.meta.env.VITE_DEMO_DATA === '1' || (import.meta.env.DEV && import.meta.env.MODE !== 'test')

/**
 * Demo data lives under its own storage keys, so running `npm run dev` on the
 * same browser you keep a real log in neither overwrites it nor gets blocked by
 * it. Without this, seeding only fires when storage is empty, so anyone who had
 * already used the app would have to clear it by hand or open a private window
 * to see a demo build at all.
 *
 * Applied to entries and settings. The theme key is deliberately left shared —
 * it's a display preference with nothing to collide over.
 */
export const STORAGE_SUFFIX = DEMO_DATA_ENABLED ? ':demo' : ''
