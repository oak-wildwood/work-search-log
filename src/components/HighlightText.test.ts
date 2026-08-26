import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HighlightText from './HighlightText.vue'

describe('HighlightText', () => {
  it('renders the plain text with no marks when the query is empty', () => {
    const wrapper = mount(HighlightText, { props: { text: 'Applied to Acme Corp', query: '' } })
    expect(wrapper.text()).toBe('Applied to Acme Corp')
    expect(wrapper.findAll('mark')).toHaveLength(0)
  })

  it('marks a single match while preserving the original casing', () => {
    const wrapper = mount(HighlightText, {
      props: { text: 'Applied to Acme Corp', query: 'acme' },
    })
    const marks = wrapper.findAll('mark')
    expect(marks).toHaveLength(1)
    expect(marks[0].text()).toBe('Acme')
    // textContent rather than wrapper.text(): this component's root is a
    // fragment, and Vue Test Utils trims each root node before joining them,
    // which eats the spaces either side of the <mark>. The DOM is correct —
    // only the helper's view of it isn't.
    expect(wrapper.element.textContent).toBe('Applied to Acme Corp')
  })

  it('marks every occurrence of a repeated match', () => {
    const wrapper = mount(HighlightText, { props: { text: 'apply apply', query: 'apply' } })
    const marks = wrapper.findAll('mark')
    expect(marks.map((m) => m.text())).toEqual(['apply', 'apply'])
  })

  it('splits back-to-back matches of a repeating pattern without an infinite loop', () => {
    const wrapper = mount(HighlightText, { props: { text: 'aaaa', query: 'aa' } })
    const marks = wrapper.findAll('mark')
    expect(marks).toHaveLength(2)
    expect(wrapper.text()).toBe('aaaa')
  })

  it('renders nothing to highlight when the text does not contain the query', () => {
    const wrapper = mount(HighlightText, { props: { text: 'Acme Corp', query: 'xyz' } })
    expect(wrapper.findAll('mark')).toHaveLength(0)
    expect(wrapper.text()).toBe('Acme Corp')
  })

  it('applies the active class only when the active prop is set', () => {
    const active = mount(HighlightText, { props: { text: 'Acme', query: 'acme', active: true } })
    expect(active.get('mark').classes()).toContain('active')

    const inactive = mount(HighlightText, { props: { text: 'Acme', query: 'acme' } })
    expect(inactive.get('mark').classes()).not.toContain('active')
  })
})
