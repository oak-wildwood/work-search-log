import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useModalDialog } from './useModalDialog'

function makeDialog() {
  const dialog = document.createElement('dialog')
  document.body.appendChild(dialog)
  return dialog
}

describe('useModalDialog', () => {
  it('shows and hides the dialog, locking and restoring background scroll', () => {
    const dialog = makeDialog()
    const dialogEl = ref(dialog)
    const { show, hide } = useModalDialog(dialogEl)

    document.body.style.overflow = 'scroll'
    show()
    expect(dialog.open).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')

    hide()
    expect(dialog.open).toBe(false)
    expect(document.body.style.overflow).toBe('scroll')

    document.body.style.overflow = ''
    dialog.remove()
  })

  it('does not let a redundant show() while already open clobber the restore value', () => {
    // Regression: a double-click on the button that opens a dialog can call
    // show() twice before the browser makes the trigger inert. Without a
    // guard, the second call re-captures `previousBodyOverflow` as 'hidden'
    // (the value locked in by the first call), so a single hide() afterwards
    // would restore scroll to 'hidden' instead of the real original value —
    // permanently locking the page with no dialog left open to explain why.
    const dialog = makeDialog()
    const dialogEl = ref(dialog)
    const { show, hide } = useModalDialog(dialogEl)

    document.body.style.overflow = 'scroll'
    show()
    show()
    expect(document.body.style.overflow).toBe('hidden')

    hide()
    expect(document.body.style.overflow).toBe('scroll')

    document.body.style.overflow = ''
    dialog.remove()
  })

  describe('isBackdropClick', () => {
    it('is false for a click that lands on the dialog itself but inside its box', () => {
      const dialog = makeDialog()
      vi.spyOn(dialog, 'clientWidth', 'get').mockReturnValue(300)
      vi.spyOn(dialog, 'clientHeight', 'get').mockReturnValue(200)
      const { isBackdropClick } = useModalDialog(ref(dialog))

      const event = new MouseEvent('click')
      Object.defineProperty(event, 'target', { value: dialog })
      Object.defineProperty(event, 'offsetX', { value: 150 })
      Object.defineProperty(event, 'offsetY', { value: 100 })

      expect(isBackdropClick(event)).toBe(false)
      dialog.remove()
    })

    it('is true for a click outside the dialog box, but false for a click on a descendant', () => {
      const dialog = makeDialog()
      const child = document.createElement('button')
      dialog.appendChild(child)
      vi.spyOn(dialog, 'clientWidth', 'get').mockReturnValue(300)
      vi.spyOn(dialog, 'clientHeight', 'get').mockReturnValue(200)
      const { isBackdropClick } = useModalDialog(ref(dialog))

      const outside = new MouseEvent('click')
      Object.defineProperty(outside, 'target', { value: dialog })
      Object.defineProperty(outside, 'offsetX', { value: -5 })
      Object.defineProperty(outside, 'offsetY', { value: 100 })
      expect(isBackdropClick(outside)).toBe(true)

      const onChild = new MouseEvent('click')
      Object.defineProperty(onChild, 'target', { value: child })
      expect(isBackdropClick(onChild)).toBe(false)

      dialog.remove()
    })
  })

  describe('onNativeClose', () => {
    it('suppresses the dismiss callback for a close caused by hide() on an open dialog', () => {
      const dialog = makeDialog()
      const { show, hide, onNativeClose } = useModalDialog(ref(dialog))
      const dismiss = vi.fn()

      show()
      hide()
      onNativeClose(dismiss)
      expect(dismiss).not.toHaveBeenCalled()

      dialog.remove()
    })

    it('runs the dismiss callback for a close the browser initiated on its own', () => {
      const dialog = makeDialog()
      const { onNativeClose } = useModalDialog(ref(dialog))
      const dismiss = vi.fn()

      onNativeClose(dismiss)
      expect(dismiss).toHaveBeenCalledOnce()

      dialog.remove()
    })

    it('does not let a no-op hide() on an already-closed dialog swallow a later real close', () => {
      // Regression: a watcher's `open` starts `false` on mount, so `hide()` on
      // an already-closed dialog is a real call this composable has to expect
      // — and since that `.close()` is a silent no-op, nothing ever fires to
      // reset a flag set unconditionally here, permanently swallowing the
      // *next* genuine close instead.
      const dialog = makeDialog()
      const { hide, onNativeClose } = useModalDialog(ref(dialog))
      const dismiss = vi.fn()

      hide()
      onNativeClose(dismiss)

      expect(dismiss).toHaveBeenCalledOnce()
      dialog.remove()
    })
  })
})
