/**
 * Spread onto a text input that holds work-search or profile data rather than
 * a credential. `autocomplete="off"` alone doesn't stop most password manager
 * extensions from offering to fill a name, company, address, or phone field
 * with saved identity data — they each need their own opt-out attribute.
 */
export const noAutofillAttrs = {
  autocomplete: 'off',
  'data-1p-ignore': '',
  'data-lpignore': 'true',
  'data-bwignore': 'true',
  'data-form-type': 'other',
} as const
