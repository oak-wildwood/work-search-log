import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import EntryForm from './EntryForm.vue'
import { useSettings } from '../composables/useSettings'
import type { Entry, EntryDraft } from '../types'
import { toLocalISODate } from '../lib/weeks'

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'e1',
    date: '2026-08-10',
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
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
    ...overrides,
  }
}

afterEach(() => {
  useSettings().setStateCode(null)
})

describe('EntryForm', () => {
  describe('validation', () => {
    it('emits nothing and shows a message when date or activity is missing', async () => {
      const wrapper = mount(EntryForm)
      await wrapper.get('form').trigger('submit')
      expect(wrapper.emitted('submit')).toBeUndefined()
      expect(wrapper.text()).toContain('Date and activity are required.')
    })
  })

  describe('site field sync', () => {
    it('writes a known site straight through', async () => {
      const wrapper = mount(EntryForm)
      await wrapper.get('#f-date').setValue('2026-08-10')
      await wrapper.get('#f-activity').setValue('apply_online')
      await wrapper.get('#f-site').setValue('LinkedIn')

      await wrapper.get('form').trigger('submit')
      const draft = wrapper.emitted('submit')?.[0]?.[0] as EntryDraft
      expect(draft.siteAppliedOn).toBe('LinkedIn')
    })

    it('clears a previously known site when switching to Other, and accepts a typed value', async () => {
      const wrapper = mount(EntryForm)
      await wrapper.get('#f-date').setValue('2026-08-10')
      await wrapper.get('#f-activity').setValue('apply_online')
      await wrapper.get('#f-site').setValue('LinkedIn')

      const otherOption = wrapper.findAll('#f-site option').find((o) => o.text() === 'Other…')
      await wrapper.get('#f-site').setValue((otherOption!.element as HTMLOptionElement).value)
      await nextTick()

      const otherInput = wrapper.get('.site-other-input')
      expect((otherInput.element as HTMLInputElement).value).toBe('')

      await otherInput.setValue('Some Job Board')
      await wrapper.get('form').trigger('submit')
      const draft = wrapper.emitted('submit')?.[0]?.[0] as EntryDraft
      expect(draft.siteAppliedOn).toBe('Some Job Board')
    })
  })

  describe('offline activities', () => {
    it('hides the site field and clears any site already entered', async () => {
      const wrapper = mount(EntryForm)
      await wrapper.get('#f-date').setValue('2026-08-10')
      await wrapper.get('#f-activity').setValue('apply_online')
      await wrapper.get('#f-site').setValue('LinkedIn')
      expect(wrapper.find('#f-site').exists()).toBe(true)

      // apply_person is offline in the generic config.
      await wrapper.get('#f-activity').setValue('apply_person')
      await nextTick()
      expect(wrapper.find('#f-site').exists()).toBe(false)

      await wrapper.get('form').trigger('submit')
      const draft = wrapper.emitted('submit')?.[0]?.[0] as EntryDraft
      expect(draft.siteAppliedOn).toBe('')
    })
  })

  describe('today button', () => {
    it('leaves the date blank until clicked, then sets it to today', async () => {
      const wrapper = mount(EntryForm)
      const date = () => (wrapper.get('#f-date').element as HTMLInputElement).value
      expect(date()).toBe('')

      await wrapper.get('.today-btn').trigger('click')
      expect(date()).toBe(toLocalISODate(new Date()))
    })
  })

  describe('date pinning', () => {
    it('keeps the date after saving when pinned', async () => {
      const wrapper = mount(EntryForm)
      await wrapper.get('#f-date').setValue('2026-08-10')
      await wrapper.get('#f-activity').setValue('apply_online')
      await wrapper.get('.pin-btn').trigger('click')

      await wrapper.get('form').trigger('submit')
      await nextTick()
      expect((wrapper.get('#f-date').element as HTMLInputElement).value).toBe('2026-08-10')
    })

    it('resets to a blank date after saving when not pinned', async () => {
      const wrapper = mount(EntryForm)
      await wrapper.get('#f-date').setValue('2026-08-10')
      await wrapper.get('#f-activity').setValue('apply_online')

      await wrapper.get('form').trigger('submit')
      await nextTick()
      expect((wrapper.get('#f-date').element as HTMLInputElement).value).toBe('')
    })
  })

  describe('contract flag', () => {
    async function submitted(wrapper: ReturnType<typeof mount>) {
      await wrapper.get('form').trigger('submit')
      return wrapper.emitted('submit')?.[0]?.[0] as EntryDraft
    }

    it('is unchecked by default and saves as false', async () => {
      const wrapper = mount(EntryForm)
      await wrapper.get('#f-date').setValue('2026-08-10')
      await wrapper.get('#f-activity').setValue('apply_online')
      expect((wrapper.get('#f-contract').element as HTMLInputElement).checked).toBe(false)
      expect((await submitted(wrapper)).contract).toBe(false)
    })

    it('saves true once checked, and starts unchecked again after saving', async () => {
      const wrapper = mount(EntryForm)
      await wrapper.get('#f-date').setValue('2026-08-10')
      await wrapper.get('#f-activity').setValue('apply_online')
      await wrapper.get('#f-contract').setValue(true)
      expect((await submitted(wrapper)).contract).toBe(true)
      expect((wrapper.get('#f-contract').element as HTMLInputElement).checked).toBe(false)
    })

    it('loads an entry that predates the flag as unchecked, even after a contract one', async () => {
      const wrapper = mount(EntryForm, { props: { editing: makeEntry({ contract: true }) } })
      expect((wrapper.get('#f-contract').element as HTMLInputElement).checked).toBe(true)
      await wrapper.setProps({ editing: makeEntry({ id: 'e2' }) })
      expect((wrapper.get('#f-contract').element as HTMLInputElement).checked).toBe(false)
    })
  })

  describe('legacy activity path', () => {
    it('keeps the original label instead of reassigning or blanking it', async () => {
      const { setStateCode } = useSettings()
      setStateCode('WA')

      // Logged under a config (generic/TX-shaped) whose id and label WA doesn't define.
      const entry = makeEntry({ activityId: 'apply_online', activity: 'Applied online for a job' })
      const wrapper = mount(EntryForm, { props: { editing: entry } })
      await nextTick()

      const select = wrapper.get('#f-activity').element as HTMLSelectElement
      const selectedOption = select.options[select.selectedIndex]
      expect(selectedOption.textContent).toContain('Applied online for a job (as logged)')

      await wrapper.get('form').trigger('submit')
      const draft = wrapper.emitted('submit')?.[0]?.[0] as EntryDraft
      expect(draft.activityId).toBe('')
      expect(draft.activity).toBe('Applied online for a job')
    })

    it('resolves normally when the current config recognizes the entry', async () => {
      const { setStateCode } = useSettings()
      setStateCode('TX')

      const entry = makeEntry({ activityId: 'apply_online', activity: 'Applied online for a job' })
      const wrapper = mount(EntryForm, { props: { editing: entry } })
      await nextTick()

      const select = wrapper.get('#f-activity').element as HTMLSelectElement
      expect(select.value).toBe('apply_online')
    })
  })

  describe('follow up', () => {
    const source = () =>
      makeEntry({
        id: 'app',
        date: '2026-09-12',
        siteAppliedOn: 'LinkedIn',
        jobType: 'Frontend Engineer',
        employer: 'Acme Robotics',
        address: 'https://acme.example/jobs/1',
        phone: '555-201-4488',
        contactName: 'Priya Shah',
        contactMethod: 'Email',
        result: 'Application submitted',
        notes: 'Referred by a friend',
        contract: true,
      })

    it("copies the job's own fields and leaves every activity field blank", async () => {
      const wrapper = mount(EntryForm, { props: { followingUp: source() } })
      await nextTick()

      const value = (selector: string) =>
        (wrapper.get(selector).element as HTMLInputElement | HTMLSelectElement).value
      expect(value('#f-employer')).toBe('Acme Robotics')
      expect(value('#f-jobtype')).toBe('Frontend Engineer')
      expect(value('#f-addr')).toBe('https://acme.example/jobs/1')
      expect(value('#f-phone')).toBe('555-201-4488')
      expect(value('#f-contact')).toBe('Priya Shah')
      expect((wrapper.get('#f-contract').element as HTMLInputElement).checked).toBe(true)

      expect(value('#f-date')).toBe('')
      expect(value('#f-activity')).toBe('')
      expect(value('#f-site')).toBe('')
      expect(value('#f-method')).toBe('')
      expect(value('#f-result')).toBe('')
      expect(value('#f-notes')).toBe('')
    })

    it('opens the extra fields even when the source entry has none filled in', async () => {
      const bare = makeEntry({ id: 'bare', employer: 'Acme Robotics' })
      const wrapper = mount(EntryForm, { props: { followingUp: bare } })
      await nextTick()
      expect(wrapper.find('#f-method').exists()).toBe(true)
    })

    it('saves nothing until the claimant picks a date and activity', async () => {
      const wrapper = mount(EntryForm, { props: { followingUp: source() } })
      await nextTick()
      await wrapper.get('form').trigger('submit')
      expect(wrapper.emitted('submit')).toBeUndefined()
    })

    it('saves the link to the source entry with the new activity', async () => {
      const wrapper = mount(EntryForm, { props: { followingUp: source() } })
      await nextTick()
      await wrapper.get('#f-date').setValue('2026-09-19')
      await wrapper.get('#f-activity').setValue('follow_up')
      await wrapper.get('form').trigger('submit')

      const draft = wrapper.emitted('submit')?.[0]?.[0] as EntryDraft
      expect(draft).toMatchObject({
        date: '2026-09-19',
        activityId: 'follow_up',
        employer: 'Acme Robotics',
        siteAppliedOn: '',
        notes: '',
        linkedTo: 'app',
      })
    })

    it('links a follow-up on a follow-up to the original entry', async () => {
      const second = makeEntry({ id: 'second', employer: 'Acme Robotics', linkedTo: 'app' })
      const wrapper = mount(EntryForm, { props: { followingUp: second } })
      await nextTick()
      await wrapper.get('#f-date').setValue('2026-09-26')
      await wrapper.get('#f-activity').setValue('interview')
      await wrapper.get('form').trigger('submit')

      const draft = wrapper.emitted('submit')?.[0]?.[0] as EntryDraft
      expect(draft.linkedTo).toBe('app')
    })

    it('marks a copied field until the claimant changes it', async () => {
      const wrapper = mount(EntryForm, { props: { followingUp: source() } })
      await nextTick()
      const employerLabel = () => wrapper.get('label[for="f-employer"]').text()
      expect(employerLabel()).toContain('copied')

      await wrapper.get('#f-employer').setValue('Acme Robotics Inc.')
      expect(employerLabel()).not.toContain('copied')
    })

    it('adds no link key to an ordinary new entry', async () => {
      const wrapper = mount(EntryForm)
      await wrapper.get('#f-date').setValue('2026-09-19')
      await wrapper.get('#f-activity').setValue('apply_online')
      await wrapper.get('form').trigger('submit')

      const draft = wrapper.emitted('submit')?.[0]?.[0] as EntryDraft
      expect('linkedTo' in draft).toBe(false)
    })

    it('starts the next entry unlinked after saving a follow-up', async () => {
      const wrapper = mount(EntryForm, { props: { followingUp: source() } })
      await nextTick()
      await wrapper.get('#f-date').setValue('2026-09-19')
      await wrapper.get('#f-activity').setValue('follow_up')
      await wrapper.get('form').trigger('submit')
      await wrapper.setProps({ followingUp: null })

      await wrapper.get('#f-date').setValue('2026-09-20')
      await wrapper.get('#f-activity').setValue('apply_online')
      await wrapper.get('form').trigger('submit')
      const next = wrapper.emitted('submit')?.[1]?.[0] as EntryDraft
      expect('linkedTo' in next).toBe(false)
      expect(next.employer).toBe('')
    })

    it('keeps the link when a linked entry is edited, and none leaks into the next', async () => {
      const linked = makeEntry({ id: 'f1', employer: 'Acme Robotics', linkedTo: 'app' })
      const wrapper = mount(EntryForm, { props: { editing: linked } })
      await nextTick()
      await wrapper.get('form').trigger('submit')
      expect((wrapper.emitted('submit')?.[0]?.[0] as EntryDraft).linkedTo).toBe('app')

      await wrapper.setProps({ editing: makeEntry({ id: 'plain' }) })
      await wrapper.get('form').trigger('submit')
      expect('linkedTo' in (wrapper.emitted('submit')?.[1]?.[0] as EntryDraft)).toBe(false)
    })

    it('emits cancel from a follow-up', async () => {
      const wrapper = mount(EntryForm, { props: { followingUp: source() } })
      await nextTick()
      await wrapper
        .findAll('button')
        .find((b) => b.text() === 'Cancel')!
        .trigger('click')
      expect(wrapper.emitted('cancel')).toHaveLength(1)
    })
  })
})
