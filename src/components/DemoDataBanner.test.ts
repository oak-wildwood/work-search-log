import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// useEntries reads the seed flag once at module load, so the banner needs a
// fresh module graph per case to see a different flag value.
async function mountBanner() {
  vi.resetModules()
  const { default: DemoDataBanner } = await import('./DemoDataBanner.vue')
  return mount(DemoDataBanner)
}

describe('DemoDataBanner', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_DEMO_DATA', undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('renders nothing when demo data is not seeded', async () => {
    const wrapper = await mountBanner()
    expect(wrapper.text()).toBe('')
  })

  it('announces sample data when the flag is on, and stays out of print', async () => {
    vi.stubEnv('VITE_DEMO_DATA', '1')
    const wrapper = await mountBanner()
    expect(wrapper.text()).toContain('Sample data')
    expect(wrapper.text().toLowerCase()).toContain('not a real work search record')
    expect(wrapper.get('.demo-banner').classes()).toContain('no-print')
  })
})
