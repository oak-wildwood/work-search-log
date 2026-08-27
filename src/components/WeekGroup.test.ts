import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import WeekGroup from './WeekGroup.vue'
import type { WeekStatus } from '../lib/requirements'
import type { WeekGroup as Week } from '../lib/weeks'
import type { Entry } from '../types'

function entry(id: string): Entry {
  return {
    id,
    date: '2026-08-24',
    activityId: 'apply_online',
    activity: 'Applied online for a job',
    siteAppliedOn: '',
    jobType: '',
    employer: '',
    address: '',
    phone: '',
    contactName: '',
    contactMethod: '',
    result: '',
    notes: '',
    createdAt: '2026-08-24T00:00:00.000Z',
    updatedAt: '2026-08-24T00:00:00.000Z',
  }
}

function week(count: number): Week {
  return {
    key: '2026-08-23',
    start: new Date(2026, 7, 23),
    end: new Date(2026, 7, 29),
    entries: Array.from({ length: count }, (_, i) => entry(`e${i}`)),
  }
}

function status(overrides: Partial<WeekStatus> = {}): WeekStatus {
  return {
    outcome: 'met',
    exemptReason: null,
    logged: 3,
    counted: 3,
    required: 3,
    employerContacts: 3,
    minEmployerContacts: null,
    notices: [],
    ...overrides,
  }
}

function mountWeek(props: Partial<Record<string, unknown>> = {}) {
  return mount(WeekGroup, {
    props: { group: week(3), defaultExpanded: true, ...props },
  })
}

describe('WeekGroup', () => {
  it('heads the week with its date range and activity count', () => {
    const text = mountWeek().get('.week-head').text()
    expect(text).toContain('Aug 23–29')
    expect(text).toContain('3 activities')
  })

  it('says "activity" in the singular for a week with one', () => {
    expect(mountWeek({ group: week(1) }).text()).toContain('1 activity')
  })

  it('reports the count against the requirement without judging it', () => {
    const badge = mountWeek({ status: status() }).get('.week-count')
    expect(badge.text()).toBe('3 / 3')
    expect(badge.classes()).toContain('ok')
  })

  it('marks a short week warn rather than saying it failed', () => {
    const badge = mountWeek({
      status: status({ outcome: 'short', counted: 1, required: 3 }),
    }).get('.week-count')
    expect(badge.text()).toBe('1 / 3')
    expect(badge.classes()).toContain('warn')
  })

  it('shows a bare count when no requirement is on file', () => {
    const badge = mountWeek({
      status: status({ outcome: 'unknown', required: null, counted: 2 }),
    }).get('.week-count')
    expect(badge.text()).toBe('2')
  })

  it('shows the entry count alone when the week has no status at all', () => {
    expect(mountWeek().get('.week-count').text()).toBe('3')
  })

  /** The printed sheet is what an agency reads; this app's arithmetic stays off it. */
  it('keeps the badge and the scoring notes out of print', () => {
    const wrapper = mountWeek({
      status: status({
        outcome: 'short',
        minEmployerContacts: 3,
        employerContacts: 1,
        notices: ['Only 2 of 4 activities counted toward the weekly total.'],
      }),
    })
    expect(wrapper.get('.week-count').classes()).toContain('no-print')
    for (const note of wrapper.findAll('.week-note')) {
      expect(note.classes()).toContain('no-print')
    }
    expect(wrapper.text()).toContain('1 of 3 required employer contacts')
    expect(wrapper.text()).toContain('Only 2 of 4 activities counted')
  })

  /** An exempt week's reason explains a gap rather than judging one, so it prints. */
  it('prints the stated reason for an exempt week', () => {
    const wrapper = mountWeek({
      status: status({ outcome: 'exempt', exemptReason: 'Jury duty' }),
    })
    expect(wrapper.get('.week-count').text()).toBe('Exempt')
    const reason = wrapper.findAll('.week-note').find((n) => n.text().includes('Jury duty'))
    expect(reason?.classes()).not.toContain('no-print')
  })

  it('collapses and expands the week', async () => {
    const wrapper = mountWeek({ defaultExpanded: false })
    const head = wrapper.get('.week-head')
    expect(head.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('.week-entries').classes()).toContain('collapsed')

    await head.trigger('click')
    expect(head.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('.week-entries').classes()).not.toContain('collapsed')
  })

  it('passes edit and remove up from the entries it renders', async () => {
    const wrapper = mountWeek()
    const cards = wrapper.findAllComponents({ name: 'EntryCard' })
    expect(cards).toHaveLength(3)

    await cards[0].get('[title="Edit"]').trigger('click')
    expect(wrapper.emitted('edit')).toHaveLength(1)
  })
})
