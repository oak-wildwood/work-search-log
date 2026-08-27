import { vi } from 'vitest'

// jsdom has no matchMedia. useTheme() calls it lazily on first use (not at
// module scope), but any test that mounts a component reaching useTheme
// still needs a stub to exist.
window.matchMedia ??= vi.fn().mockReturnValue({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}) as unknown as typeof window.matchMedia

// jsdom (as of 29) doesn't implement HTMLDialogElement.showModal()/close() at
// all — the element exists, but those methods are just missing. PreferencesDialog
// relies on both, so without this polyfill every test that opens it throws
// "showModal is not a function" rather than exercising real modal behaviour.
// This approximates the parts of the HTML spec's dialog-focusing steps that
// matter for tests: move focus in on open, remember and restore it on close.
if (!window.HTMLDialogElement.prototype.showModal) {
  const previouslyFocused = new WeakMap<HTMLDialogElement, Element | null>()

  window.HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    previouslyFocused.set(this, document.activeElement)
    this.setAttribute('open', '')
    const target =
      this.querySelector<HTMLElement>('[autofocus]') ??
      this.querySelector<HTMLElement>('input, select, textarea, button, [href], [tabindex]')
    if (target) {
      target.focus()
    } else {
      if (!this.hasAttribute('tabindex')) this.tabIndex = -1
      this.focus()
    }
  }

  window.HTMLDialogElement.prototype.close = function (
    this: HTMLDialogElement,
    returnValue?: string,
  ) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    if (returnValue !== undefined) this.returnValue = returnValue
    this.dispatchEvent(new Event('close'))
    const restore = previouslyFocused.get(this)
    if (restore instanceof HTMLElement) restore.focus()
  }
}
