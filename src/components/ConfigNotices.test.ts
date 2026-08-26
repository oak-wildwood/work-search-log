import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfigNotices from './ConfigNotices.vue'
import type { StateConfig } from '../config/types'

const config: StateConfig = {
  code: 'TEST',
  agencyName: 'Test Agency',
  agencyShort: 'TA',
  weekStartDay: 0,
  requirementSource: 'letter',
  jurisdictionLabel: 'County',
  claimIdLabel: 'Claim number',
  hasOnlineLogging: false,
  activityTypes: [],
  contactMethods: [],
  resultOptions: [],
  siteOptions: [],
  requiredFields: [],
  duplicateEmployerCounts: true,
  retention: 'benefit_year',
  lastVerified: null,
}

describe('ConfigNotices', () => {
  it('warns when local storage is blocked', () => {
    const wrapper = mount(ConfigNotices, {
      props: { saveError: true, isFallback: false, config, stale: false },
    })
    expect(wrapper.text()).toContain('blocking local storage')
  })

  it('emits open-preferences when the fallback notice link is clicked', async () => {
    const wrapper = mount(ConfigNotices, {
      props: { saveError: false, isFallback: true, config, stale: false },
    })
    expect(wrapper.text()).toContain('No rules are bundled for that state yet')
    await wrapper.get('.link-inline').trigger('click')
    expect(wrapper.emitted('open-preferences')).toHaveLength(1)
  })

  it('shows the online-logging notice only when not falling back to the generic config', () => {
    const wrapper = mount(ConfigNotices, {
      props: {
        saveError: false,
        isFallback: false,
        config: { ...config, hasOnlineLogging: true },
        stale: false,
      },
    })
    expect(wrapper.text()).toContain('records work search in its own portal')
  })

  it('does not show the online-logging notice while falling back', () => {
    const wrapper = mount(ConfigNotices, {
      props: {
        saveError: false,
        isFallback: true,
        config: { ...config, hasOnlineLogging: true },
        stale: false,
      },
    })
    expect(wrapper.text()).not.toContain('records work search in its own portal')
  })

  it('flags stale settings without asserting compliance', () => {
    const wrapper = mount(ConfigNotices, {
      props: {
        saveError: false,
        isFallback: false,
        config: { ...config, rulesUrl: 'https://example.com/rules' },
        stale: true,
      },
    })
    expect(wrapper.text()).toContain("haven't been checked against")
  })

  it('shows nothing when there is nothing to warn about', () => {
    const wrapper = mount(ConfigNotices, {
      props: { saveError: false, isFallback: false, config, stale: false },
    })
    expect(wrapper.text()).toBe('')
  })
})
