# Browser History Plugin for Obsidian

これは自分の使い方にカスタマイズしたフォークです。

カスタム内容：

- **時刻出力のON/OFF設定**（デフォルトOFF）: 設定画面の「Show time」トグルで、各行に `HH:mm` を表示するかどうかを切り替え可能。
- **URLの "allow list" と "deny list"**: 設定画面でワイルドカード（`*`）付きのパターンを1行1つずつ指定可能。deny listにマッチしたURLは常に除外され（deny優先）、allow listが空の場合はdenyされない限り全て許可される。
- **除外URL一覧のモーダル表示**: 生成済みの履歴ノートを開いた状態でコマンドパレットから「Show excluded URLs for this note」を実行すると、そのノートの日付で除外された（allowされていない／denyされた）URLとタイトル・理由の一覧がモーダル（Select from list of suggestions）で表示される。項目を選択するとそのURLをブラウザで開く。

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
