import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SearchBar from './SearchBar.vue'
import { useEntries } from '../composables/useEntries'
import { useSearch } from '../composables/useSearch'

const { clearAll } = useEntries()
const { searchQuery } = useSearch()

describe('SearchBar', () => {
  beforeEach(() => {
    clearAll()
    searchQuery.value = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('focuses the input on Cmd/Ctrl+K from anywhere on the page', async () => {
    const wrapper = mount(SearchBar, { attachTo: document.body })
    const input = wrapper.get('input').element

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    expect(document.activeElement).toBe(input)

    input.blur()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    expect(document.activeElement).toBe(input)

    wrapper.unmount()
  })

  it('leaves other key combinations alone', () => {
    const wrapper = mount(SearchBar, { attachTo: document.body })
    const input = wrapper.get('input').element

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }))
    expect(document.activeElement).not.toBe(input)

    wrapper.unmount()
  })

  it('stops listening once unmounted', () => {
    const wrapper = mount(SearchBar, { attachTo: document.body })
    const input = wrapper.get('input').element
    wrapper.unmount()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    expect(document.activeElement).not.toBe(input)
  })
})
