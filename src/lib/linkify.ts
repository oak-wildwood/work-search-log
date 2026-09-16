export interface TextSegment {
  text: string
  /** Present, and set to a navigable href, when this segment is a URL. */
  url: string | null
}

const URL_PATTERN = /(https?:\/\/[^\s<>"')]+|www\.[^\s<>"')]+)/gi

// A sentence-ending period, comma, or closing bracket right after a URL almost
// always belongs to the surrounding prose, not the link itself.
const TRAILING_PUNCTUATION = /[.,;:!?)\]]+$/

/**
 * Splits free text around any URLs it contains so a template can render the
 * rest as plain text and each URL as a link. Never invents or alters an
 * entry's own words — it only marks spans that were already there.
 */
export function splitLinks(text: string): TextSegment[] {
  if (!text) return [{ text, url: null }]

  const segments: TextSegment[] = []
  let lastIndex = 0

  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index
    let raw = match[0]
    let end = start + raw.length

    const trailing = raw.match(TRAILING_PUNCTUATION)
    if (trailing) {
      raw = raw.slice(0, raw.length - trailing[0].length)
      end -= trailing[0].length
    }
    if (!raw) continue

    if (start > lastIndex) segments.push({ text: text.slice(lastIndex, start), url: null })
    segments.push({ text: raw, url: raw.startsWith('www.') ? `https://${raw}` : raw })
    lastIndex = end
  }

  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex), url: null })
  return segments
}
