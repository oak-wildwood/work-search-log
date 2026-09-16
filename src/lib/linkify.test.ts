import { describe, expect, it } from 'vitest'
import { splitLinks } from './linkify'

describe('splitLinks', () => {
  it('returns the whole string as a single non-link segment when there is no URL', () => {
    expect(splitLinks('Applied online for a job')).toEqual([
      { text: 'Applied online for a job', url: null },
    ])
  })

  it('treats an empty string as a single empty segment', () => {
    expect(splitLinks('')).toEqual([{ text: '', url: null }])
  })

  it('splits an https URL out from surrounding text', () => {
    expect(splitLinks('Apply at https://example.com/jobs today')).toEqual([
      { text: 'Apply at ', url: null },
      { text: 'https://example.com/jobs', url: 'https://example.com/jobs' },
      { text: ' today', url: null },
    ])
  })

  it('adds a scheme to a bare www. link so it is navigable', () => {
    expect(splitLinks('www.example.com')).toEqual([
      { text: 'www.example.com', url: 'https://www.example.com' },
    ])
  })

  it('strips trailing sentence punctuation from the link', () => {
    expect(splitLinks('See https://example.com/jobs.')).toEqual([
      { text: 'See ', url: null },
      { text: 'https://example.com/jobs', url: 'https://example.com/jobs' },
      { text: '.', url: null },
    ])
  })

  it('splits multiple links in the same string', () => {
    expect(splitLinks('https://a.example and https://b.example')).toEqual([
      { text: 'https://a.example', url: 'https://a.example' },
      { text: ' and ', url: null },
      { text: 'https://b.example', url: 'https://b.example' },
    ])
  })
})
