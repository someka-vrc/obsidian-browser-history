import type { Database, QueryExecResult, SqlJsStatic, SqlValue } from 'sql.js'
import * as fs from 'node:fs'
import initSqlJs from 'sql.js'

// @ts-expect-error wasm binary
// eslint-disable-next-line antfu/no-import-dist, antfu/no-import-node-modules-by-path
import sqlWasm from '../node_modules/sql.js/dist/sql-wasm.wasm'
import { BrowserType, detectBrowserType } from './browser'

/**
 * Converts a Chrome timestamp (microseconds since 1601-01-01) to a Unix timestamp (milliseconds since 1970-01-01).
 *
 * ref. [sqlite - What is the format of Chrome's timestamps? - Stack Overflow](https://stackoverflow.com/questions/20458406/what-is-the-format-of-chromes-timestamps)
 */
function chromeTimeToUnixTime(chromeTimestamp: number) {
  return chromeTimestamp / 1000 - 11644473600000
}

function firefoxTimeToUnixTime(firefoxTimestamp: number): number {
  return firefoxTimestamp / 1000
}

function toRecords(
  result: QueryExecResult,
): Record<string, SqlValue>[] {
  const { columns, values } = result
  return values.map(row =>
    Object.assign({}, ...row.map((value, index) => ({
      [columns[index]]: value,
    }))),
  )
}

interface GetUrlsParams {
  fromDate?: Date
  toDate?: Date
  limit?: number
  desc?: boolean
}

interface LoadOptions {
  sqlitePath: string
}

interface LoadMultipleOptions {
  sqlitePaths: string[]
}

let sqlJsPromise: Promise<SqlJsStatic> | undefined

/**
 * Initializes sql.js (and its WASM instance) only once and shares it across all databases.
 */
function getSqlJs() {
  sqlJsPromise ??= initSqlJs({ wasmBinary: sqlWasm }).catch((e) => {
    sqlJsPromise = undefined
    throw e
  })
  return sqlJsPromise
}

export class DBClient {
  db: Database
  browserType: BrowserType

  constructor(db: Database, browserType: BrowserType) {
    this.db = db
    this.browserType = browserType
  }

  static async load(options: LoadOptions) {
    const SQL = await getSqlJs()
    const dbBuffer = fs.readFileSync(options.sqlitePath)
    const db = new SQL.Database(dbBuffer)

    // Determine browser type
    const browserType = detectBrowserType(options.sqlitePath)

    // Register functions based on browser type
    if (browserType === BrowserType.FIREFOX) {
      db.create_function('firefox_unix', firefoxTimeToUnixTime)
    }
    else {
      db.create_function('unix', chromeTimeToUnixTime)
    }

    return new DBClient(db, browserType)
  }

  /**
   * Releases the WASM heap held by this database.
   */
  close() {
    this.db.close()
  }

  getUrls(params: GetUrlsParams) {
    const { fromDate, toDate, limit, desc = true } = params

    if (this.browserType === BrowserType.FIREFOX) {
      // Query for Firefox
      const whereClause = [
        fromDate && `${fromDate.getTime()} <= firefox_unix(moz_historyvisits.visit_date)`,
        toDate && `firefox_unix(moz_historyvisits.visit_date) < ${toDate.getTime()}`,
      ].filter(Boolean).join(' and ')

      const query = `
        SELECT moz_places.title, moz_places.url, firefox_unix(moz_historyvisits.visit_date) as visit_time
        FROM moz_historyvisits
        LEFT JOIN moz_places ON moz_historyvisits.place_id = moz_places.id
        ${whereClause ? `WHERE ${whereClause}` : ''}
        ORDER BY moz_historyvisits.visit_date ${desc ? 'DESC' : 'ASC'}
        ${limit ? `LIMIT ${limit}` : ''}
      `
      const results = this.db.exec(query)
      const records = results.map(toRecords)[0] || []
      return records
    }
    else {
      // Query for Chrome
      const whereClause = [
        fromDate && `${fromDate.getTime()} <= unix(visit_time)`,
        toDate && `unix(visit_time) < ${toDate.getTime()}`,
      ].filter(Boolean).join(' and ')

      const query = `
        select
          urls.title,
          urls.url,
          unix(visits.visit_time) as visit_time
        from visits
        left join urls on visits.url = urls.id
        ${whereClause ? `where ${whereClause}` : ''}
        order by visits.id ${desc ? 'desc' : 'asc'}
        ${limit ? `limit ${limit}` : ''}
      `
      const results = this.db.exec(query)
      const records = results.map(toRecords)[0] || []
      return records
    }
  }

  getUrlCount() {
    let query = ''

    if (this.browserType === BrowserType.FIREFOX) {
      // Query for Firefox
      query = `
        SELECT count(*) as count FROM moz_historyvisits
      `
    }
    else {
      // Query for Chrome
      query = `
        select count(*) as count from visits
      `
    }

    const results = this.db.exec(query)
    const records = results.map(toRecords)[0] || []
    return records[0]?.count as number || 0
  }
}

/**
 * Aggregates multiple browser history databases behind the same interface as a single `DBClient`.
 */
export class MultiDBClient {
  clients: DBClient[]

  constructor(clients: DBClient[]) {
    this.clients = clients
  }

  static async load(options: LoadMultipleOptions) {
    const sqlitePaths = options.sqlitePaths.filter(Boolean)
    const clients: DBClient[] = []
    const errors: string[] = []

    for (const sqlitePath of sqlitePaths) {
      try {
        clients.push(await DBClient.load({ sqlitePath }))
      }
      catch (e) {
        errors.push(`${sqlitePath}: ${e}`)
      }
    }

    if (!clients.length)
      throw new Error(errors.join('\n') || 'No database path specified')

    if (errors.length)
      console.warn(`Failed to load some databases:\n${errors.join('\n')}`)

    return new MultiDBClient(clients)
  }

  close() {
    for (const client of this.clients)
      client.close()
  }

  getUrls(params: GetUrlsParams) {
    const { limit, desc = true } = params
    const merged = this.clients.flatMap(client => client.getUrls({ ...params, limit: undefined }))

    merged.sort((a, b) => {
      const diff = (a.visit_time as number) - (b.visit_time as number)
      return desc ? -diff : diff
    })

    return limit ? merged.slice(0, limit) : merged
  }

  getUrlCount() {
    return this.clients.reduce((sum, client) => sum + client.getUrlCount(), 0)
  }
}
