import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import EntryForm from './EntryForm.vue'
import { useSettings } from '../composables/useSettings'
import type { Entry, EntryDraft } from '../types'

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
})
