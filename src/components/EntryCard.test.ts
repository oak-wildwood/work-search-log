import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import EntryCard from './EntryCard.vue'
import type { Entry } from '../types'

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'e1',
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
    ...overrides,
  }
}

describe('EntryCard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the activity and summary line without expanding', () => {
    const wrapper = mount(EntryCard, {
      props: { entry: entry({ employer: 'Acme Robotics', siteAppliedOn: 'LinkedIn' }) },
    })
    expect(wrapper.text()).toContain('Applied online for a job')
    expect(wrapper.text()).toContain('Acme Robotics')
    expect(wrapper.text()).toContain('LinkedIn')
  })

  it('offers no Details button for an entry with nothing else recorded', () => {
    const wrapper = mount(EntryCard, { props: { entry: entry() } })
    expect(wrapper.find('.text-link').exists()).toBe(false)
    expect(wrapper.find('.details').exists()).toBe(false)
  })

  it('toggles the detail fields, labelling each one', async () => {
    const wrapper = mount(EntryCard, {
      props: {
        entry: entry({
          jobType: 'Frontend Developer',
          address: '400 Harbor Way',
          phone: '555-201-4488',
          contactName: 'Priya Shah',
          contactMethod: 'Phone',
          result: 'Interviewed',
          notes: 'First-round phone screen.',
        }),
      },
    })

    const toggle = wrapper.get('.text-link')
    expect(toggle.text()).toBe('Details')
    expect(wrapper.get('.details').classes()).toContain('collapsed')

    await toggle.trigger('click')
    expect(toggle.text()).toBe('Hide')
    expect(wrapper.get('.details').classes()).not.toContain('collapsed')

    const text = wrapper.get('.details').text()
    for (const field of ['Job sought', 'Address', 'Phone', 'Contact', 'Result', 'Notes']) {
      expect(text).toContain(field)
    }
    expect(text).toContain('Priya Shah')
    expect(text).toContain('(Phone)')

    await toggle.trigger('click')
    expect(wrapper.get('.details').classes()).toContain('collapsed')
  })

  it('emits edit with the whole entry', async () => {
    const subject = entry({ employer: 'TechNova Systems' })
    const wrapper = mount(EntryCard, { props: { entry: subject } })
    await wrapper.get('[title="Edit"]').trigger('click')
    expect(wrapper.emitted('edit')?.[0]).toEqual([subject])
  })

  it('names the entry in the delete confirmation and emits only on confirm', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = mount(EntryCard, { props: { entry: entry({ employer: 'Acme Robotics' }) } })

    await wrapper.get('[title="Delete"]').trigger('click')
    expect(confirmSpy.mock.calls[0][0]).toContain('Acme Robotics')
    expect(wrapper.emitted('remove')).toBeUndefined()

    confirmSpy.mockReturnValue(true)
    await wrapper.get('[title="Delete"]').trigger('click')
    expect(wrapper.emitted('remove')?.[0]).toEqual(['e1'])
  })

  it('falls back to "this activity" when there is no employer to name', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = mount(EntryCard, { props: { entry: entry() } })
    await wrapper.get('[title="Delete"]').trigger('click')
    expect(confirmSpy.mock.calls[0][0]).toContain('this activity')
  })
})
