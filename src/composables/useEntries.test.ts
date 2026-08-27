import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The seed flag is read once at module load time (see useEntries.ts), so each
 * case needs a fresh module instance — vi.resetModules() plus a dynamic
 * import — rather than re-mounting the same singleton.
 */
async function loadEntries() {
  vi.resetModules()
  const mod = await import('./useEntries')
  return mod.useEntries()
}

describe('useEntries seeding', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_DEMO_DATA', undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does not seed when VITE_DEMO_DATA is unset', async () => {
    const { entries, isDemoData } = await loadEntries()
    expect(isDemoData).toBe(false)
    expect(entries.value).toEqual([])
  })

  it('does not seed when VITE_DEMO_DATA is any value other than "1"', async () => {
    for (const value of ['0', 'false', 'true', 'yes']) {
      vi.stubEnv('VITE_DEMO_DATA', value)
      const { entries, isDemoData } = await loadEntries()
      expect(isDemoData).toBe(false)
      expect(entries.value).toEqual([])
    }
  })

  it('seeds when VITE_DEMO_DATA is exactly "1"', async () => {
    vi.stubEnv('VITE_DEMO_DATA', '1')
    const { entries, isDemoData } = await loadEntries()
    expect(isDemoData).toBe(true)
    expect(entries.value.length).toBeGreaterThan(0)
  })

  it('seeds in dev regardless of the flag', async () => {
    // MODE too: under vitest it is 'test', which demoMode.ts excludes so that
    // component tests aren't silently handed seeded data.
    vi.stubEnv('DEV', true)
    vi.stubEnv('MODE', 'development')
    const { entries, isDemoData } = await loadEntries()
    expect(isDemoData).toBe(true)
    expect(entries.value.length).toBeGreaterThan(0)
  })
})
