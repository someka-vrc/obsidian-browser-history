import type { TFile } from 'obsidian'
import type { ExcludedEntry } from './excludedUrlsModal'
import type BrowserHistoryPlugin from './main'
import { dayjs } from './dayjs'
import { DBClient } from './db'
import { ExcludedUrlsModal } from './excludedUrlsModal'
import { classifyRecords } from './filter'
import { log, notify } from './utils'

/**
 * Loads the browser history database.
 */
export async function loadDB(plugin: BrowserHistoryPlugin) {
  try {
    return plugin.db = await DBClient.load({
      sqlitePath: plugin.settings.sqlitePath || '',
    })
  }
  catch (e) {
    notify(`Failed to load database: ${e}`)
  }
}

/**
 * Tests database connection.
 */
export async function checkConnection(plugin: BrowserHistoryPlugin) {
  const db = await loadDB(plugin)
  if (!db)
    return

  const count = db.getUrlCount().toLocaleString()
  const data = db.getUrls({ limit: 1, desc: false }).at(0)
  const oldestDate = data
    ? dayjs(data.visit_time as number).format('YYYY-MM-DD')
    : ''

  const message = `Successfully connected. ${count} records found${count ? ` (oldest: ${oldestDate})` : ''}`
  notify(message)
}

/**
 * Syncs browser history notes for the specified date range.
 */
export async function syncNotes(plugin: BrowserHistoryPlugin) {
  const db = await loadDB(plugin)
  if (!db)
    return

  const today = dayjs().startOf('day').toDate()
  const _fromDate = plugin.settings.fromDate
  const fromDate = _fromDate ? new Date(`${_fromDate} 00:00:00`) : today
  const dayCount = dayjs(today).diff(fromDate, 'day') + 1
  const dates = Array.from({ length: dayCount })
    .map((_, i) => dayjs(today).subtract(i, 'day').toDate())
  const files: TFile[] = []

  for (const date of dates) {
    const path = await syncNote(plugin, date)
    if (path)
      files.push(path)
  }

  plugin.settings.fromDate = dayjs(today).format('YYYY-MM-DD')
  await plugin.saveSettings()
  log(`synced ${files.length} notes`)
  return files
}

/**
 * Syncs a single history note.
 */
async function syncNote(plugin: BrowserHistoryPlugin, date?: Date) {
  try {
    return await _syncNote(plugin, date)
  }
  catch (e) {
    notify(e)
  }
}

/**
 * _Syncs a single history note.
 */
async function _syncNote(
  plugin: BrowserHistoryPlugin,
  date = dayjs().startOf('day').toDate(),
) {
  const template = plugin.settings.fileNameFormat || 'YYYY-MM-DD'
  const fileName = dayjs(date).format(template)
  const filePath = [plugin.settings.folderPath, `${fileName}.md`].join('/')

  const records = plugin.db.getUrls({
    fromDate: date,
    toDate: dayjs(date).add(1, 'day').toDate(),
  })

  const { included: includedRecords } = classifyRecords(records, plugin.settings)

  // return if no history to write
  if (!includedRecords.length) {
    log(`no history for ${fileName}`)
    return
  }

  const content = includedRecords.map((v) => {
    if (plugin.settings.showTime) {
      const timestamp = dayjs(v.visit_time as number).format('HH:mm')
      return `- ${timestamp} [${v.title}](${v.url})`
    }
    return `- [${v.title}](${v.url})`
  }).join('\n')

  return upsertFile(plugin, { filePath, content })
}

/**
 * Parses the date encoded in a history note's file name, based on the configured file name format.
 */
function parseDateFromFileName(plugin: BrowserHistoryPlugin, file: TFile): Date | undefined {
  const folderPath = plugin.settings.folderPath
  if (folderPath && !file.path.startsWith(`${folderPath}/`))
    return undefined

  const template = plugin.settings.fileNameFormat || 'YYYY-MM-DD'
  const parsed = dayjs(file.basename, template, true)
  return parsed.isValid() ? parsed.startOf('day').toDate() : undefined
}

/**
 * Shows the URLs excluded (by the allow/deny lists) for the given history note.
 */
export async function showExcludedUrlsForFile(plugin: BrowserHistoryPlugin, file: TFile) {
  const date = parseDateFromFileName(plugin, file)
  if (!date) {
    notify('This command must be run from a browser history note.')
    return
  }

  const db = await loadDB(plugin)
  if (!db)
    return

  const records = db.getUrls({
    fromDate: date,
    toDate: dayjs(date).add(1, 'day').toDate(),
  })

  const { excluded: excludedRecords } = classifyRecords(records, plugin.settings)
  const excluded: ExcludedEntry[] = excludedRecords.map(({ record, reason }) => ({
    title: String(record.title ?? ''),
    url: String(record.url ?? ''),
    reason,
  }))

  if (!excluded.length) {
    notify('No excluded URLs for this date.')
    return
  }

  new ExcludedUrlsModal(plugin.app, excluded).open()
}

/**
 * Checks whether the given file (or the active file) is a browser history note.
 */
export function isHistoryNoteFile(plugin: BrowserHistoryPlugin, file: TFile | null): file is TFile {
  return !!file && !!parseDateFromFileName(plugin, file)
}

/**
 * Opens today's browser history note.
 */
export async function openTodayHistory(
  plugin: BrowserHistoryPlugin,
  newLeaf?: boolean,
) {
  const { app } = plugin
  const db = await loadDB(plugin)
  if (!db)
    return

  const todayFile = await syncNote(plugin)

  if (todayFile)
    app.workspace.getLeaf(newLeaf).openFile(todayFile)
  else
    notify('No history for today.')
}

/**
 * Creates or updates a file with the specified content.
 */
async function upsertFile(
  plugin: BrowserHistoryPlugin,
  params: {
    filePath: string
    content: string
  },
) {
  const { app } = plugin
  const { filePath, content } = params
  const paths = filePath.split('/')
  const _fileName = paths.pop()
  const folderPath = paths.join('/')

  // create folder if it doesn't exist
  if (folderPath) {
    const folder = app.vault.getFolderByPath(folderPath)
    if (!folder)
      await app.vault.createFolder(folderPath)
  }

  let file = app.vault.getFileByPath(filePath)
  if (!file)
    file = await app.vault.create(filePath, content)
  else
    await app.vault.modify(file, content)
  return file
}
