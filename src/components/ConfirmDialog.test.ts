import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import ConfirmDialog from './ConfirmDialog.vue'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

function mountDialog(props: Record<string, unknown> = {}) {
  wrapper = mount(ConfirmDialog, {
    props,
    slots: { default: 'Delete this thing?' },
  })
  return wrapper
}

// `defineExpose`'d members aren't visible on `VueWrapper.vm`'s type — a real
// consumer reaches them through a typed template ref instead — so this is the
// one place that reaches past it, the same way a template ref would at runtime.
function openDialog(w: VueWrapper): Promise<boolean> {
  return (w.vm.$.exposed as { open: () => Promise<boolean> }).open()
}

describe('ConfirmDialog', () => {
  it('renders the slot content and the given labels', async () => {
    const w = mountDialog({ confirmLabel: 'Delete', cancelLabel: 'Never mind' })
    void openDialog(w)
    await w.vm.$nextTick()

    const dialog = document.body.querySelector('dialog')!
    expect(dialog.textContent).toContain('Delete this thing?')
    expect(dialog.textContent).toContain('Delete')
    expect(dialog.textContent).toContain('Never mind')
  })

  it('resolves true when the confirm button is clicked', async () => {
    const w = mountDialog({ danger: true })
    const result = openDialog(w)
    await w.vm.$nextTick()

    document.body.querySelector<HTMLButtonElement>('dialog button.danger')!.click()

    expect(await result).toBe(true)
  })

  it('resolves false when the cancel button is clicked', async () => {
    const w = mountDialog({ danger: true })
    const result = openDialog(w)
    await w.vm.$nextTick()

    document.body.querySelector<HTMLButtonElement>('dialog button.ghost')!.click()

    expect(await result).toBe(false)
  })

  it('resolves false on a native close (Escape) without a second settle', async () => {
    const w = mountDialog({ danger: true })
    const result = openDialog(w)
    await w.vm.$nextTick()

    const dialog = document.body.querySelector('dialog')!
    dialog.dispatchEvent(new Event('close'))

    expect(await result).toBe(false)
  })

  it('puts the default focus on Cancel for the danger variant, Confirm otherwise', async () => {
    const dangerWrapper = mountDialog({ danger: true })
    void openDialog(dangerWrapper)
    await dangerWrapper.vm.$nextTick()
    expect(document.body.querySelector('dialog button.ghost')?.hasAttribute('autofocus')).toBe(true)
    expect(document.body.querySelector('dialog button.danger')?.hasAttribute('autofocus')).toBe(
      false,
    )
    dangerWrapper.unmount()

    const plainWrapper = mountDialog({ danger: false })
    void openDialog(plainWrapper)
    await plainWrapper.vm.$nextTick()
    expect(document.body.querySelector('dialog button.ghost')?.hasAttribute('autofocus')).toBe(
      false,
    )
    expect(document.body.querySelector('dialog button.primary')?.hasAttribute('autofocus')).toBe(
      true,
    )
  })
})
