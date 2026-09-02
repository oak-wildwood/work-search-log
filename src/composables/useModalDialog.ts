import type { Ref } from 'vue'

/**
 * The mechanics native `<dialog>` doesn't give a component for free, shared by
 * every modal in the app rather than reimplemented per component:
 *
 * - Scroll lock. `showModal()` traps focus and makes the background inert,
 *   but confirmed by hand, not assumed — it does *not* stop the page behind
 *   the `::backdrop` from scrolling under wheel/touch input.
 * - Backdrop-click detection. `::backdrop` isn't a real element, so a click
 *   "on it" lands on the dialog itself. `offsetX`/`offsetY` are relative to
 *   the dialog's own padding box, so anything outside that box is the true
 *   backdrop.
 * - Re-entrancy for the native `close` event, which also fires for our own
 *   `hide()`-driven `.close()` call — that shouldn't re-trigger the caller's
 *   own dismissal logic a second time.
 */
export function useModalDialog(dialogEl: Ref<HTMLDialogElement | null>) {
  // Restored to whatever it was before locking, rather than assumed to be '',
  // so this doesn't clobber an overflow style some other part of the app set.
  let previousBodyOverflow = ''
  let hidingProgrammatically = false

  function show() {
    // Guards against a double-invocation (e.g. a double-click on the button
    // that opens this dialog) re-running the lock while already open — that
    // would re-capture `previousBodyOverflow` as 'hidden' instead of the real
    // original value, so the next `hide()` would restore scroll to 'hidden'
    // and leave the page permanently unscrollable with no dialog left open to
    // explain why.
    if (dialogEl.value?.open) return
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogEl.value?.showModal()
  }

  function hide() {
    // Only set when this call will actually cause the browser to fire `close`
    // — calling `.close()` on an already-closed dialog is a silent no-op, so
    // if the flag were set unconditionally here it would never get cleared
    // and would wrongly swallow the *next* real native close instead.
    if (dialogEl.value?.open) hidingProgrammatically = true
    document.body.style.overflow = previousBodyOverflow
    dialogEl.value?.close()
  }

  function isBackdropClick(event: MouseEvent): boolean {
    const dialog = dialogEl.value
    if (!dialog || event.target !== dialog) return false
    const inside =
      event.offsetX >= 0 &&
      event.offsetX <= dialog.clientWidth &&
      event.offsetY >= 0 &&
      event.offsetY <= dialog.clientHeight
    return !inside
  }

  /** Call from the dialog's `@close` handler with the caller's own dismissal
   *  logic; it only runs when the browser initiated the close, not `hide()`. */
  function onNativeClose(dismiss: () => void) {
    if (hidingProgrammatically) {
      hidingProgrammatically = false
      return
    }
    dismiss()
  }

  return { show, hide, isBackdropClick, onNativeClose }
}
