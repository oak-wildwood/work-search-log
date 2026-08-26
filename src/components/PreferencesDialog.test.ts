import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PreferencesDialog from './PreferencesDialog.vue'
import { useSettings } from '../composables/useSettings'
import { resolveRequirement } from '../lib/requirements'
import { currentWeekKey } from '../lib/weeks'

describe('PreferencesDialog', () => {
  describe('draftCount fallback', () => {
    it('re-derives the offered count from the state when nothing has been typed', async () => {
      const wrapper = mount(PreferencesDialog, { props: { open: true } })
      await nextTick()
      const countInput = wrapper.get('[data-testid="weekly-requirement"]')
      expect((countInput.element as HTMLInputElement).value).toBe('')

      const stateSelect = wrapper.get('select')
      await stateSelect.setValue('WA')
      await nextTick()
      expect((countInput.element as HTMLInputElement).value).toBe('3')

      await stateSelect.setValue('')
      await nextTick()
      expect((countInput.element as HTMLInputElement).value).toBe('')
    })

    it('keeps a hand-typed count when switching states', async () => {
      const wrapper = mount(PreferencesDialog, { props: { open: true } })
      await nextTick()
      const countInput = wrapper.get('[data-testid="weekly-requirement"]')
      await countInput.setValue(5)

      const stateSelect = wrapper.get('select')
      await stateSelect.setValue('WA')
      await nextTick()
      expect((countInput.element as HTMLInputElement).value).toBe('5')
    })
  })

  describe('dismiss', () => {
    it('marks onboarded without committing name, state, or count', async () => {
      const { settings } = useSettings()
      const before = {
        name: settings.value.name,
        stateCode: settings.value.stateCode,
        requirements: [...settings.value.requirements],
      }

      const wrapper = mount(PreferencesDialog, { props: { open: true, firstRun: true } })
      await nextTick()

      await wrapper.get('input[type="text"]').setValue('Jordan')
      await wrapper.get('select').setValue('WA')
      await wrapper.get('[data-testid="weekly-requirement"]').setValue(6)

      const dismissButton = wrapper.findAll('button').find((b) => b.text() === 'Skip for now')
      await dismissButton!.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(settings.value.name).toBe(before.name)
      expect(settings.value.stateCode).toBe(before.stateCode)
      expect(settings.value.requirements).toEqual(before.requirements)
      expect(settings.value.onboardedAt).not.toBeNull()
    })
  })

  describe('effective dating in save()', () => {
    it('dates a new requirement to the current week, never backdating over logged weeks', async () => {
      const { schedule, setWeeklyRequirement } = useSettings()
      setWeeklyRequirement('2020-01-01', 2, null)

      const wrapper = mount(PreferencesDialog, { props: { open: true } })
      await nextTick()

      await wrapper.get('[data-testid="weekly-requirement"]').setValue(4)
      await wrapper.get('.primary').trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
      // The old week is scored against the number that was in force at the time.
      expect(resolveRequirement(schedule.value, '2020-01-05')?.total).toBe(2)
      // The new number takes effect from this week forward, not retroactively.
      const key = currentWeekKey(0)
      expect(resolveRequirement(schedule.value, key)?.total).toBe(4)
      expect(schedule.value.requirements.find((r) => r.effective === key)?.total).toBe(4)
    })
  })
})
