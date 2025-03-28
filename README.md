# To-Do List 任務管理系統

這是一個簡單但功能強大的任務管理系統，使用 Google Apps Script 作為後端資料庫，讓您可以隨時隨地管理您的任務，無需擔心資料遺失。

## 功能特點

- ✅ 新增、編輯和刪除任務
- 📅 設定任務日期
- ✓ 標記任務為已完成狀態
- 🔄 拖曳排序任務優先順序
- 📱 響應式設計，支援各種裝置

## 技術架構

- **前端**：HTML, CSS, JavaScript
- **後端**：Google Apps Script (GAS)
- **資料庫**：Google 試算表
- **外部庫**：Sortable.js (用於拖曳排序功能)

## 安裝與部署

### 1. 設置 Google Apps Script

1. 前往 [Google Apps Script](https://script.google.com/) 並建立新專案
2. 複製 `gas/Code.gs` 中的程式碼到專案中
3. 建立一個 Google 試算表，並複製其 ID（可從 URL 中獲取）
4. 在 `Code.gs` 中更新 `SPREADSHEET_ID` 和 `SHEET_NAME` 常數
5. 部署為網頁應用程式：
   - 點選「部署」>「新增部署」
   - 部署類型選擇「網頁應用程式」
   - 執行身分選擇「以您的身分執行」
   - 存取權限選擇「任何人（匿名）」
   - 點選「部署」並複製產生的網頁 URL

### 2. 設置前端

1. 複製專案程式碼到您的網頁伺服器
2. 在 `js/list.js` 中更新 `API_URL` 為您的 GAS 網頁應用程式 URL
3. 開啟 `index.html` 即可開始使用

## 使用說明

### 新增任務

1. 在輸入框中輸入任務內容
2. 選擇任務日期（預設為今天）
3. 點擊「新增」按鈕或按下 Enter 鍵

### 管理任務

- 點擊核取方塊可標記任務為已完成
- 點擊「編輯」按鈕可修改任務內容
- 點擊「刪除」按鈕可移除任務
- 拖曳任務可重新排序

## 系統需求

- 現代網頁瀏覽器（Chrome, Firefox, Safari, Edge 等）
- 有網路連線（需連接到 Google Apps Script）
- Google 帳號（用於部署 GAS）

## 自訂調整

您可以自訂多種方面：

- 在 CSS 文件中調整視覺樣式
- 修改 GAS 代碼以增加額外功能（如標籤、優先級等）
- 更改試算表結構以儲存更多資訊

## 注意事項

- GAS 有每日配額限制，如果您有大量使用者，請考慮升級到其他後端解決方案
- 請確保 GAS 部署時設定正確的存取權限

## 授權

MIT 授權。詳見 LICENSE 文件。
