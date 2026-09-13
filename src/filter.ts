import type { BrowserHistoryPluginSettings } from './setting'

export type ExclusionReason = 'denied' | 'not-allowed' | 'duplicate'

/**
 * Converts a wildcard pattern (`*` matches any sequence of characters) into a RegExp.
 */
function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`, 'i')
}

function matchesAny(url: string, patterns: string[]): boolean {
  return patterns.some(pattern => wildcardToRegExp(pattern).test(url))
}

/**
 * Determines whether a URL should be excluded, based on the allow/deny list settings.
 * Deny list takes priority over allow list. An empty allow list allows everything
 * that isn't denied.
 */
export function getExclusionReason(
  url: string,
  settings: Pick<BrowserHistoryPluginSettings, 'allowList' | 'denyList'>,
): ExclusionReason | null {
  const denyList = (settings.denyList || []).filter(Boolean)
  const allowList = (settings.allowList || []).filter(Boolean)

  if (denyList.length && matchesAny(url, denyList))
    return 'denied'

  if (allowList.length && !matchesAny(url, allowList))
    return 'not-allowed'

  return null
}

/**
 * Normalizes a URL for deduplication by dropping its query string and fragment,
 * so that only the origin and path are compared.
 */
function normalizeUrlForDedupe(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  }
  catch {
    return url
  }
}

function getDedupeKey(title: string, url: string): string {
  return `${title}::${normalizeUrlForDedupe(url)}`
}

export interface HistoryRecordLike {
  title?: unknown
  url?: unknown
  [key: string]: unknown
}

export interface ClassifiedRecord<T> {
  record: T
  reason: ExclusionReason
}

export interface ClassifiedRecords<T> {
  included: T[]
  excluded: ClassifiedRecord<T>[]
}

/**
 * Splits history records into included and excluded, applying the allow/deny list
 * and (if enabled) deduplication of entries whose title and path already appeared.
 */
export function classifyRecords<T extends HistoryRecordLike>(
  records: T[],
  settings: Pick<BrowserHistoryPluginSettings, 'allowList' | 'denyList' | 'uniquify'>,
): ClassifiedRecords<T> {
  const uniquify = settings.uniquify ?? true
  const seen = new Set<string>()
  const included: T[] = []
  const excluded: ClassifiedRecord<T>[] = []

  for (const record of records) {
    const url = String(record.url ?? '')
    const reason = getExclusionReason(url, settings)
    if (reason) {
      excluded.push({ record, reason })
      continue
    }

    if (uniquify) {
      const key = getDedupeKey(String(record.title ?? ''), url)
      if (seen.has(key)) {
        excluded.push({ record, reason: 'duplicate' })
        continue
      }
      seen.add(key)
    }

    included.push(record)
  }

  return { included, excluded }
}
