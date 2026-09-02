import { afterEach, describe, expect, it } from 'vitest'
import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import PreferencesDialog from './PreferencesDialog.vue'
import { useSettings } from '../composables/useSettings'
import { resolveRequirement } from '../lib/requirements'
import { currentWeekKey } from '../lib/weeks'

// `<dialog>` is teleported to `document.body`, so it lands outside the
// mounted wrapper's own element tree — queries for its contents have to go
// through the real document instead of `wrapper.find`/`wrapper.get`.
const body = () => new DOMWrapper(document.body)

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

describe('PreferencesDialog', () => {
  describe('draftCount fallback', () => {
    it('re-derives the offered count from the state when nothing has been typed', async () => {
      wrapper = mount(PreferencesDialog, { props: { open: true } })
      await nextTick()
      const countInput = body().get('[data-testid="weekly-requirement"]')
      expect((countInput.element as HTMLInputElement).value).toBe('')

      const stateSelect = body().get('select')
      await stateSelect.setValue('WA')
      await nextTick()
      expect((countInput.element as HTMLInputElement).value).toBe('3')

      await stateSelect.setValue('')
      await nextTick()
      expect((countInput.element as HTMLInputElement).value).toBe('')
    })

    it('keeps a hand-typed count when switching states', async () => {
      wrapper = mount(PreferencesDialog, { props: { open: true } })
      await nextTick()
      const countInput = body().get('[data-testid="weekly-requirement"]')
      await countInput.setValue(5)

      const stateSelect = body().get('select')
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

      wrapper = mount(PreferencesDialog, { props: { open: true, firstRun: true } })
      await nextTick()

      await body().get('input[type="text"]').setValue('Jordan')
      await body().get('select').setValue('WA')
      await body().get('[data-testid="weekly-requirement"]').setValue(6)

      const dismissButton = body()
        .findAll('button')
        .find((b) => b.text() === 'Skip for now')
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

      wrapper = mount(PreferencesDialog, { props: { open: true } })
      await nextTick()

      await body().get('[data-testid="weekly-requirement"]').setValue(4)
      await body().get('.primary').trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
      // The old week is scored against the number that was in force at the time.
      expect(resolveRequirement(schedule.value, '2020-01-05')?.total).toBe(2)
      // The new number takes effect from this week forward, not retroactively.
      const key = currentWeekKey(0)
      expect(resolveRequirement(schedule.value, key)?.total).toBe(4)
      expect(schedule.value.requirements.find((r) => r.effective === key)?.total).toBe(4)
    })
  })

  describe('modal behaviour', () => {
    it('actually opens when mounted with open already true, as on a first run', async () => {
      // Regression: App.vue mounts this with `open` already `true` for a
      // first-run visitor — there's no prior `false` for a prop-change watcher
      // to react to. An earlier version relied on `watch(..., { immediate:
      // true, flush: 'post' })` for this case, which does not reliably wait
      // for `dialogEl` to be populated; `showModal()` would silently no-op
      // while the page's scroll stayed locked, with no dialog visibly open to
      // explain why.
      wrapper = mount(PreferencesDialog, { props: { open: true, firstRun: true } })
      await nextTick()
      await nextTick()

      const dialog = document.body.querySelector('dialog')!
      expect(dialog.open).toBe(true)
      expect(document.body.style.overflow).toBe('hidden')

      await wrapper.setProps({ open: false })
      await nextTick()
    })

    it('moves focus into the dialog when it opens', async () => {
      const opener = document.createElement('button')
      document.body.appendChild(opener)
      opener.focus()

      wrapper = mount(PreferencesDialog, { props: { open: false } })
      await wrapper.setProps({ open: true })
      await nextTick()

      const dialog = document.body.querySelector('dialog')!
      expect(dialog.contains(document.activeElement)).toBe(true)

      opener.remove()
    })

    it('restores focus to the element that opened it once closed', async () => {
      const opener = document.createElement('button')
      document.body.appendChild(opener)
      opener.focus()

      wrapper = mount(PreferencesDialog, { props: { open: false } })
      await wrapper.setProps({ open: true })
      await nextTick()
      expect(document.activeElement).not.toBe(opener)

      // Simulates App.vue's `@close="prefsOpen = false"` — the parent is what
      // actually drives the prop back to false in response to the emit.
      await wrapper.setProps({ open: false })
      await nextTick()

      expect(document.activeElement).toBe(opener)

      opener.remove()
    })

    it('treats Escape (the native close event) the same as an explicit dismiss', async () => {
      const { settings } = useSettings()

      wrapper = mount(PreferencesDialog, { props: { open: true } })
      await nextTick()

      const dialog = document.body.querySelector('dialog')!
      dialog.dispatchEvent(new Event('close'))

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(settings.value.onboardedAt).not.toBeNull()
    })
  })
})
