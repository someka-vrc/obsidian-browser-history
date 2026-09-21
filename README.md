# Browser History Plugin for Obsidian

This is a fork customized for my own workflow.

## Settings
### Database Location (Modified)
You can now specify multiple browser history database files; their history is merged together.

### Show Time (Added)
Toggle whether to show the `HH:mm` time on each line. Default: off.

### Allow List / Deny List (Added)
Specify wildcard (`*`) patterns for URLs, one pattern per line. URLs matching the deny list are always excluded (deny takes priority). If the allow list is empty, everything is allowed unless denied.

### Uniquify (Added)
Skip entries in a day whose title and path match an already-output entry, absorbing differences in query strings. Default: on.

## Commands

### Show excluded URLs for this note (Added)
While a generated history note is open, run this command from the command palette to show a modal (select-from-list) listing the URLs excluded for that note's date (not allowed, or denied), along with their title and the reason for exclusion. Selecting an item opens that URL in the browser.

## 開発

### ローカルデプロイ

`local:deploy` スクリプトで、ビルド後に必要なファイル（`main.js` / `manifest.json` / `styles.css`）だけを手元の Obsidian Vault のプラグインフォルダへコピーできます。

1. `.env.example` を `.env` にコピーする
2. `.env` の `OBSIDIAN_PLUGIN_DIR` を自分の Vault のプラグインフォルダのパスに書き換える（例: `D:\Vault\.obsidian\plugins\browser-history`）
3. 以下を実行する

   ```sh
   pnpm run local:deploy
   ```

---

Original README:

# Browser History Plugin for Obsidian

Sync your browser history to notes.

<img src="assets/browser_history_preview.png" alt="Browser History" width="600"/>

## Usage

1. Install and enable the plugin.
2. Go to the plugin settings.
3. Configure the database location, and click `Check` button to verify database access.
    <img src="assets/browser_history_setting.png" alt="Settings" width="600"/>
4. Click "Open today's browser history" in the ribbon.  
    <img src="assets/browser_history_ribbon.png" alt="Ribbon" width="300"/>
5. Optionally enable auto sync features

## !!Caution!!
- **Do not publish history notes.** The URLs in the notes may contain authentication information.
- Some antivirus software may flag this plugin as suspicious due to its access to browser data. This is a false positive as the plugin only reads the browser's history database file.

## Settings

### Database Location
Path to your browser history database file. Select your browser to automatically set the database path.

### Check Connection
Test the connection to your browser history database.

### New File Location
Directory where your browser history notes will be saved. **Warning**: Please select a different folder than your daily notes to avoid any conflicts. Default: `Browser History`

### File Name Format
Examples:
- `YYYY-MM-DD` (default) → `2025-06-16.md`
- `[Browser History] YYYY-MM-DD` → `Browser History 2025-06-16.md`

For more syntax, refer to [format reference](https://momentjs.com/docs/#/displaying/format/)

### Start Date
Starting date for history note creation. This automatically updates to today after each sync.

### Sync
Manually trigger the creation or update of history notes from the specified start date.

### Sync on Startup
Enable automatic synchronization when Obsidian starts.

### Auto Sync
Set an interval for automatic history note synchronization. Available options:
- Disabled
- 1 minute
- 5 minutes
- 10 minutes
- 30 minutes
- 5 seconds (for testing)
