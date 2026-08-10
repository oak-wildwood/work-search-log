import type { Entry } from '../types'

const REQUIRED_KEYS: (keyof Entry)[] = ['id', 'date', 'activity']

export function toBackupJson(entries: Entry[]): string {
  return JSON.stringify({ schema: 'work-search-log', version: 1, entries }, null, 2)
}

export function parseBackupJson(raw: string): Entry[] | null {
  try {
    const parsed = JSON.parse(raw)
    const entries = Array.isArray(parsed) ? parsed : parsed?.entries
    if (!Array.isArray(entries)) return null
    const valid = entries.every(
      (e) => e && typeof e === 'object' && REQUIRED_KEYS.every((key) => key in e),
    )
    return valid ? (entries as Entry[]) : null
  } catch {
    return null
  }
}
