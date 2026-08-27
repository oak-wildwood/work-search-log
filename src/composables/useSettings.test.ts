import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Demo builds namespace their storage, so a real log on the same browser is
// neither read nor overwritten (see demoMode.ts).
const DEMO_STORAGE_KEY = 'work-search-log:settings:v2:demo'

/**
 * The seed flag is read once at module load time (see demoMode.ts), so each case
 * needs a fresh module instance — vi.resetModules() plus a dynamic import —
 * rather than re-reading the same singleton.
 */
async function loadSettings() {
  vi.resetModules()
  const mod = await import('./useSettings')
  return mod.useSettings()
}

describe('useSettings demo profile', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_DEMO_DATA', undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('presumes nothing when VITE_DEMO_DATA is unset', async () => {
    const { settings } = await loadSettings()
    expect(settings.value).toEqual({
      name: '',
      stateCode: null,
      requirements: [],
      exemptPeriods: [],
      onboardedAt: null,
    })
  })

  it('presumes nothing when VITE_DEMO_DATA is any value other than "1"', async () => {
    for (const value of ['0', 'false', 'true', 'yes']) {
      vi.stubEnv('VITE_DEMO_DATA', value)
      const { settings } = await loadSettings()
      expect(settings.value.stateCode).toBeNull()
      expect(settings.value.requirements).toEqual([])
    }
  })

  it('seeds a profile when VITE_DEMO_DATA is exactly "1"', async () => {
    vi.stubEnv('VITE_DEMO_DATA', '1')
    const { settings, needsOnboarding } = await loadSettings()
    expect(settings.value.name).toBe('Test User')
    expect(settings.value.stateCode).toBe('TX')
    // Epoch-dated so it covers every week the seed entries span.
    expect(settings.value.requirements).toEqual([
      { effective: '1970-01-01', total: 3, minEmployerContacts: null },
    ])
    expect(needsOnboarding.value).toBe(false)
  })

  it('seeds a profile in dev regardless of the flag', async () => {
    vi.stubEnv('DEV', true)
    vi.stubEnv('MODE', 'development')
    const { settings } = await loadSettings()
    expect(settings.value.stateCode).toBe('TX')
  })

  it('leaves a real profile on the same browser untouched', async () => {
    vi.stubEnv('VITE_DEMO_DATA', '1')
    const real = JSON.stringify({
      name: 'Real Claimant',
      stateCode: 'WA',
      requirements: [{ effective: '2026-01-04', total: 5, minEmployerContacts: 2 }],
      exemptPeriods: [],
      onboardedAt: '2026-01-04T00:00:00.000Z',
    })
    localStorage.setItem('work-search-log:settings:v2', real)

    const { settings } = await loadSettings()
    expect(settings.value.name).toBe('Test User')
    expect(localStorage.getItem('work-search-log:settings:v2')).toBe(real)
  })

  it('never overwrites settings someone has already entered', async () => {
    vi.stubEnv('VITE_DEMO_DATA', '1')
    localStorage.setItem(
      DEMO_STORAGE_KEY,
      JSON.stringify({
        name: 'Real Claimant',
        stateCode: 'WA',
        requirements: [{ effective: '2026-01-04', total: 5, minEmployerContacts: 2 }],
        exemptPeriods: [],
        onboardedAt: '2026-01-04T00:00:00.000Z',
      }),
    )
    const { settings } = await loadSettings()
    expect(settings.value.name).toBe('Real Claimant')
    expect(settings.value.stateCode).toBe('WA')
    expect(settings.value.requirements).toEqual([
      { effective: '2026-01-04', total: 5, minEmployerContacts: 2 },
    ])
  })
})
