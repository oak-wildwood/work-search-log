import { vi } from 'vitest'

// jsdom has no matchMedia. useTheme() calls it lazily on first use (not at
// module scope), but any test that mounts a component reaching useTheme
// still needs a stub to exist.
window.matchMedia ??= vi.fn().mockReturnValue({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}) as unknown as typeof window.matchMedia
