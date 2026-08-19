import { beforeAll, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, type Component } from 'vue'
import { useSettings } from './composables/useSettings'

let App: Component

beforeAll(async () => {
  // jsdom has no matchMedia, which the theme composable reads at import time.
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }) as unknown as typeof window.matchMedia
  App = (await import('./App.vue')).default
})

describe('App', () => {
  it('starts with no weekly requirement rather than presuming one', () => {
    const wrapper = mount(App)
    const goal = wrapper.find('input[type="number"]')
    expect((goal.element as HTMLInputElement).value).toBe('')
    expect(wrapper.text()).toContain('set your weekly requirement')
    expect(wrapper.text()).not.toContain('of 3 logged')
  })

  it('fills the activity dropdown from the active state config', async () => {
    const { setStateCode } = useSettings()

    setStateCode(null)
    const wrapper = mount(App)
    await nextTick()
    const genericLabels = wrapper.findAll('#f-activity option').map((o) => o.text())
    expect(genericLabels).toContain('Applied online for a job')

    // TX shares the generic wording on purpose — entries logged before configs
    // existed resolve under both — but adds activities specific to TWC's list.
    expect(genericLabels).not.toContain('Used Workforce Solutions reemployment services')

    setStateCode('TX')
    await nextTick()
    const txLabels = wrapper.findAll('#f-activity option').map((o) => o.text())
    expect(txLabels).toContain('Applied online for a job')
    expect(txLabels).toContain('Used Workforce Solutions reemployment services')

    // WA's taxonomy is genuinely its own, which is the real test of config-driven
    // options rather than a hardcoded list.
    setStateCode('WA')
    await nextTick()
    const waLabels = wrapper.findAll('#f-activity option').map((o) => o.text())
    expect(waLabels).toContain('Attended a RESEA appointment')
    expect(waLabels).not.toContain('Applied online for a job')

    setStateCode(null)
  })

  it('warns when a state has no bundled config instead of failing', async () => {
    const { setStateCode } = useSettings()
    setStateCode('ZZ')
    const wrapper = mount(App)
    await nextTick()
    expect(wrapper.text()).toContain('No rules are bundled for that state yet')
    setStateCode(null)
  })
})
