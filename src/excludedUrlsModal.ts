import type { App } from 'obsidian'
import type { ExclusionReason } from './filter'
import { SuggestModal } from 'obsidian'

export interface ExcludedEntry {
  title: string
  url: string
  reason: ExclusionReason
}

function reasonLabel(reason: ExclusionReason): string {
  switch (reason) {
    case 'denied':
      return 'Denied'
    case 'duplicate':
      return 'Duplicate'
    default:
      return 'Not allowed'
  }
}

export class ExcludedUrlsModal extends SuggestModal<ExcludedEntry> {
  entries: ExcludedEntry[]

  constructor(app: App, entries: ExcludedEntry[]) {
    super(app)
    this.entries = entries
    this.setPlaceholder('Filter excluded URLs...')
  }

  getSuggestions(query: string): ExcludedEntry[] {
    const q = query.toLowerCase()
    if (!q)
      return this.entries
    return this.entries.filter(entry =>
      entry.title.toLowerCase().includes(q) || entry.url.toLowerCase().includes(q),
    )
  }

  renderSuggestion(entry: ExcludedEntry, el: HTMLElement) {
    el.createEl('div', { text: entry.title || entry.url })
    el.createEl('small', { text: `[${reasonLabel(entry.reason)}] ${entry.url}` })
  }

  onChooseSuggestion(entry: ExcludedEntry) {
    window.open(entry.url)
  }
}
