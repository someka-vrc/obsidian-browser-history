import type { MultiDBClient } from './db'
import type { BrowserHistoryPluginSettings } from './setting'
import { Plugin } from 'obsidian'
import { isHistoryNoteFile, openTodayHistory, showExcludedUrlsForFile, syncNotes } from './commands'
import { BrowserHistorySettingTab, DEFAULT_SETTINGS } from './setting'

export default class BrowserHistoryPlugin extends Plugin {
  settings: BrowserHistoryPluginSettings
  autoSyncId: number | undefined
  db: MultiDBClient

  async onload() {
    await this.loadSettings()

    this.addRibbonIcon(
      'history',
      'Open today\'s browser history',
      e => openTodayHistory(this, e.metaKey),
    )
    this.addSettingTab(new BrowserHistorySettingTab(this))

    this.addCommand({
      id: 'show-excluded-urls',
      name: 'Show excluded URLs for this note',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile()
        if (!isHistoryNoteFile(this, file))
          return false
        if (!checking)
          showExcludedUrlsForFile(this, file)
        return true
      },
    })

    // sync on startup
    this.app.workspace.onLayoutReady(() => {
      if (this.settings.syncOnStartup)
        syncNotes(this)
    })

    // auto sync
    if ((this.settings.autoSyncMs || -1) > 0) {
      this.autoSyncId = this.registerInterval(window.setInterval(() => {
        syncNotes(this)
      }, this.settings.autoSyncMs))
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())

    // Migrate legacy single-path setting to the sqlitePaths array
    if (this.settings.sqlitePath && !this.settings.sqlitePaths?.length)
      this.settings.sqlitePaths = [this.settings.sqlitePath]
    delete this.settings.sqlitePath
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }
}
