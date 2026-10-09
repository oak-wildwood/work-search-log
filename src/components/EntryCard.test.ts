import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils'
import EntryCard from './EntryCard.vue'
import { useEntries } from '../composables/useEntries'
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

// Pinned to the fixture's own date, so its entries sit in the current week and
// can be deleted unless a test moves them into the past.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-08-24T12:00:00'))
})

let wrapper: VueWrapper | undefined
afterEach(() => {
  vi.useRealTimers()
  wrapper?.unmount()
  wrapper = undefined
  useEntries().clearAll()
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

  it('renders a URL in a detail field as a clickable link that does not toggle the card', async () => {
    wrapper = mount(EntryCard, {
      props: { entry: entry({ notes: 'Posting at https://example.com/jobs/42' }) },
    })

    await wrapper.get('.text-link').trigger('click')
    expect(wrapper.get('.details').classes()).not.toContain('collapsed')

    const link = wrapper.get('.details a')
    expect(link.attributes('href')).toBe('https://example.com/jobs/42')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')

    await link.trigger('click')
    expect(wrapper.get('.details').classes()).not.toContain('collapsed')
  })

  it('tags a contract role, keeps the tag off the printed sheet, and omits it otherwise', () => {
    wrapper = mount(EntryCard, { props: { entry: entry({ contract: true }) } })
    const tag = wrapper.get('.contract-tag')
    expect(tag.text()).toBe('Contract')
    expect(tag.classes()).toContain('no-print')

    wrapper.unmount()
    wrapper = mount(EntryCard, { props: { entry: entry() } })
    expect(wrapper.find('.contract-tag').exists()).toBe(false)
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

  describe('follow up', () => {
    it('is offered on an entry that names an employer, and emits that entry', async () => {
      const source = entry({ employer: 'Acme Robotics' })
      wrapper = mount(EntryCard, { props: { entry: source } })
      const button = wrapper.findAll('button').find((b) => b.text() === 'Follow up')
      await button!.trigger('click')
      expect(wrapper.emitted('followUp')?.[0]).toEqual([source])
    })

    it('is not offered on an entry with no employer', () => {
      wrapper = mount(EntryCard, { props: { entry: entry() } })
      expect(wrapper.findAll('button').some((b) => b.text() === 'Follow up')).toBe(false)
    })

    it('shows which entry it links to, on screen only', () => {
      useEntries().replaceAll([entry({ id: 'app', date: '2026-09-12', employer: 'Acme Robotics' })])
      wrapper = mount(EntryCard, {
        props: { entry: entry({ id: 'f1', employer: 'Acme Robotics', linkedTo: 'app' }) },
      })
      const linked = wrapper.get('.linked')
      expect(linked.text()).toContain('Same job as your')
      expect(linked.classes()).toContain('no-print')
    })

    it('shows nothing for a link to an entry no longer in the log', () => {
      wrapper = mount(EntryCard, {
        props: { entry: entry({ id: 'f1', employer: 'Acme Robotics', linkedTo: 'gone' }) },
      })
      expect(wrapper.find('.linked').exists()).toBe(false)
    })

    it('refuses to delete an entry others link to, and says why', async () => {
      const app = entry({ id: 'app', employer: 'Acme Robotics' })
      useEntries().replaceAll([
        app,
        entry({ id: 'f1', employer: 'Acme Robotics', linkedTo: 'app' }),
        entry({ id: 'f2', employer: 'Acme Robotics', linkedTo: 'app' }),
      ])
      wrapper = mount(EntryCard, { props: { entry: app } })
      await wrapper.get('[title="Delete"]').trigger('click')
      // Both dialogs are always in the page, so check which one opened.
      const opened = body().findAll('dialog[open]')
      expect(opened).toHaveLength(1)
      const blocked = opened[0]
      expect(blocked.text()).toContain("2 entries link to this one, so it can't be deleted")
      expect(blocked.findAll('button').map((button) => button.text())).toEqual(['OK'])
      await blocked.get('button').trigger('click')
      expect(wrapper.emitted('remove')).toBeUndefined()
    })
  })

  describe('past weeks', () => {
    it('offers no Delete on an entry from a week that has ended, but still offers Edit', () => {
      wrapper = mount(EntryCard, { props: { entry: entry({ date: '2026-08-01' }) } })
      expect(wrapper.find('[title="Delete"]').exists()).toBe(false)
      expect(wrapper.find('[title="Edit"]').exists()).toBe(true)
    })

    it('offers Delete on an entry from the current week', () => {
      wrapper = mount(EntryCard, { props: { entry: entry({ date: '2026-08-24' }) } })
      expect(wrapper.find('[title="Delete"]').exists()).toBe(true)
    })
  })
})
