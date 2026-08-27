import { afterEach, describe, expect, it } from 'vitest'
import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils'
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

// ConfirmDialog's `<dialog>` is teleported to the real `document.body`, so it
// lands outside the mounted wrapper's own element tree.
const body = () => new DOMWrapper(document.body)

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

describe('EntryCard', () => {
  it('shows the activity and summary line without expanding', () => {
    wrapper = mount(EntryCard, {
      props: { entry: entry({ employer: 'Acme Robotics', siteAppliedOn: 'LinkedIn' }) },
    })
    expect(wrapper.text()).toContain('Applied online for a job')
    expect(wrapper.text()).toContain('Acme Robotics')
    expect(wrapper.text()).toContain('LinkedIn')
  })

  it('offers no Details button for an entry with nothing else recorded', () => {
    wrapper = mount(EntryCard, { props: { entry: entry() } })
    expect(wrapper.find('.text-link').exists()).toBe(false)
    expect(wrapper.find('.details').exists()).toBe(false)
  })

  it('toggles the detail fields, labelling each one', async () => {
    wrapper = mount(EntryCard, {
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
    wrapper = mount(EntryCard, { props: { entry: subject } })
    await wrapper.get('[title="Edit"]').trigger('click')
    expect(wrapper.emitted('edit')?.[0]).toEqual([subject])
  })

  describe('delete confirmation', () => {
    it('names the entry in the confirmation and emits only when confirmed', async () => {
      wrapper = mount(EntryCard, { props: { entry: entry({ employer: 'Acme Robotics' }) } })

      await wrapper.get('[title="Delete"]').trigger('click')
      expect(body().get('dialog').text()).toContain('Acme Robotics')

      await body().get('dialog button.ghost').trigger('click')
      expect(wrapper.emitted('remove')).toBeUndefined()

      await wrapper.get('[title="Delete"]').trigger('click')
      await body().get('dialog button.danger').trigger('click')
      expect(wrapper.emitted('remove')?.[0]).toEqual(['e1'])
    })

    it('falls back to "this activity" when there is no employer to name', async () => {
      wrapper = mount(EntryCard, { props: { entry: entry() } })
      await wrapper.get('[title="Delete"]').trigger('click')
      expect(body().get('dialog').text()).toContain('this activity')
    })
  })
})
