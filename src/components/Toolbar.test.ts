import { afterEach, describe, expect, it } from 'vitest'
import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils'
import Toolbar from './Toolbar.vue'
import { useSettings } from '../composables/useSettings'
import { toBackupJson } from '../lib/backup'
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

async function selectBackupFile(wrapper: VueWrapper, content: string) {
  const input = wrapper.get('input[type="file"]').element as HTMLInputElement
  const file = new File([content], 'backup.json', { type: 'application/json' })
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  await wrapper.get('input[type="file"]').trigger('change')
}

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  useSettings().setStateCode(null)
})

describe('Toolbar', () => {
  describe('clear all', () => {
    it('emits clear-all only once the destructive confirmation is accepted', async () => {
      wrapper = mount(Toolbar, { props: { entries: [entry()] } })

      await wrapper.get('.link-btn.danger').trigger('click')
      expect(body().get('dialog[open]').text()).toContain('This cannot be undone')

      await body().get('dialog[open] button.ghost').trigger('click')
      expect(wrapper.emitted('clear-all')).toBeUndefined()

      await wrapper.get('.link-btn.danger').trigger('click')
      await body().get('dialog[open] button.danger').trigger('click')
      expect(wrapper.emitted('clear-all')).toBeTruthy()
    })
  })

  describe('import backup', () => {
    it('names both counts and replaces only when confirmed, when entries already exist', async () => {
      const existing = [entry({ id: 'existing-1' })]
      wrapper = mount(Toolbar, { props: { entries: existing } })
      const incoming = [entry({ id: 'new-1' }), entry({ id: 'new-2' })]

      await selectBackupFile(wrapper, toBackupJson(incoming))

      const dialogText = body().get('dialog[open]').text()
      expect(dialogText).toContain('current 1 logged entry')
      expect(dialogText).toContain('the 2 from this backup')

      await body().get('dialog[open] button.ghost').trigger('click')
      expect(wrapper.emitted('import')).toBeUndefined()

      await selectBackupFile(wrapper, toBackupJson(incoming))
      await body().get('dialog[open] button.danger').trigger('click')
      expect(wrapper.emitted('import')?.[0]).toEqual([incoming])
    })

    it('skips the confirmation entirely when there is nothing to overwrite', async () => {
      wrapper = mount(Toolbar, { props: { entries: [] } })
      const incoming = [entry()]

      await selectBackupFile(wrapper, toBackupJson(incoming))

      expect(wrapper.emitted('import')?.[0]).toEqual([incoming])
      expect(document.body.querySelector('dialog')?.open).toBeFalsy()
    })

    it('reports unreadable files without opening a confirmation', async () => {
      wrapper = mount(Toolbar, { props: { entries: [entry()] } })

      await selectBackupFile(wrapper, 'not json at all')

      expect(wrapper.text()).toContain('Could not read that file')
      expect(wrapper.emitted('import')).toBeUndefined()
      expect(document.body.querySelector('dialog')?.open).toBeFalsy()
    })
  })
})
