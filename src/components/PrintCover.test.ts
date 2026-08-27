import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PrintCover from './PrintCover.vue'
import type { Settings } from '../composables/useSettings'
import { makeTestStateConfig } from '../config/testFixtures'
import type { Entry } from '../types'

const config = makeTestStateConfig()

const settings: Settings = {
  name: '',
  stateCode: null,
  requirements: [],
  exemptPeriods: [],
  onboardedAt: null,
}

function makeEntry(date: string): Entry {
  return {
    id: date,
    date,
    activity: 'Applied online',
    siteAppliedOn: '',
    jobType: '',
    employer: '',
    address: '',
    phone: '',
    contactName: '',
    contactMethod: '',
    result: '',
    notes: '',
    createdAt: date,
    updatedAt: date,
  }
}

describe('PrintCover', () => {
  it('leaves a blank ruled line for the name when none is set', () => {
    const wrapper = mount(PrintCover, { props: { settings, config, entries: [] } })
    const nameRow = wrapper.get('dd.blank')
    expect(nameRow.text()).toBe('')
  })

  it("shows the state's own wording for the claim identifier, never a value", () => {
    const wrapper = mount(PrintCover, { props: { settings, config, entries: [] } })
    expect(wrapper.text()).toContain('Claim number')
  })

  it('reports a single date rather than a range when every entry falls on it', () => {
    const wrapper = mount(PrintCover, {
      props: { settings, config, entries: [makeEntry('2026-08-10')] },
    })
    expect(wrapper.text()).not.toContain('–')
  })

  it('reports the earliest-to-latest span when entries cover more than one date', () => {
    const wrapper = mount(PrintCover, {
      props: {
        settings,
        config,
        entries: [makeEntry('2026-08-10'), makeEntry('2026-08-03')],
      },
    })
    expect(wrapper.text()).toContain('–')
  })

  it('shows an em dash for the period when there are no entries yet', () => {
    const wrapper = mount(PrintCover, { props: { settings, config, entries: [] } })
    expect(wrapper.text()).toContain('—')
  })
})
