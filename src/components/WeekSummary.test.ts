import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import WeekSummary from './WeekSummary.vue'
import type { WeekStatus } from '../lib/requirements'

const thisWeekStart = new Date('2026-08-10')
const thisWeekEnd = new Date('2026-08-16')

function makeStatus(overrides: Partial<WeekStatus> = {}): WeekStatus {
  return {
    outcome: 'short',
    exemptReason: null,
    logged: 1,
    counted: 1,
    required: 3,
    employerContacts: 0,
    minEmployerContacts: null,
    notices: [],
    ...overrides,
  }
}

describe('WeekSummary', () => {
  it('offers to set a weekly requirement instead of presuming one', async () => {
    const wrapper = mount(WeekSummary, {
      props: { thisWeekStart, thisWeekEnd, thisWeek: makeStatus({ required: null }) },
    })
    expect(wrapper.text()).toContain('set your weekly requirement')
    await wrapper.get('.link-inline').trigger('click')
    expect(wrapper.emitted('open-preferences')).toHaveLength(1)
  })

  it('caps the segment bar at 12 even when the requirement is higher', () => {
    const wrapper = mount(WeekSummary, {
      props: {
        thisWeekStart,
        thisWeekEnd,
        thisWeek: makeStatus({ required: 20, counted: 5 }),
      },
    })
    expect(wrapper.findAll('.segment')).toHaveLength(12)
  })

  it('fills only as many segments as have been counted', () => {
    const wrapper = mount(WeekSummary, {
      props: {
        thisWeekStart,
        thisWeekEnd,
        thisWeek: makeStatus({ required: 4, counted: 2 }),
      },
    })
    const filled = wrapper.findAll('.segment.filled')
    expect(filled).toHaveLength(2)
  })

  it('shows the exempt reason instead of a count when the week is exempt', () => {
    const wrapper = mount(WeekSummary, {
      props: {
        thisWeekStart,
        thisWeekEnd,
        thisWeek: makeStatus({ outcome: 'exempt', exemptReason: 'Approved training' }),
      },
    })
    expect(wrapper.text()).toContain('Exempt')
    expect(wrapper.text()).toContain('Approved training')
    expect(wrapper.findAll('.segment')).toHaveLength(0)
  })

  it('flags employer contacts short of the minimum', () => {
    const wrapper = mount(WeekSummary, {
      props: {
        thisWeekStart,
        thisWeekEnd,
        thisWeek: makeStatus({ employerContacts: 1, minEmployerContacts: 2 }),
      },
    })
    expect(wrapper.get('.caption.sub').classes()).toContain('short')
  })
})
