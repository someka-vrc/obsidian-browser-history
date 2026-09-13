import type { BrowserHistoryPluginSettings } from './setting'

export type ExclusionReason = 'denied' | 'not-allowed'

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
