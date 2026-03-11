# 間隔記憶單字卡 Web App 實作計畫

這個專案旨在建立一個基於「間隔記憶法 (Spaced Repetition)」的單字卡網頁應用程式，並將使用者的所有的資料（單字卡內容、學習進度）儲存於使用者個人的 Google Sheets 中。這不僅讓使用者能擁有資料完全的掌控權，也不需要依賴額外的後端伺服器與資料庫。

## 部署與跨平台策略

這個應用程式是一個 **Web App (網頁應用程式)**，這意味著它天生支援跨平台。只要將網站部署到網路上，無論您是用電腦、手機還是平板的瀏覽器，都可以隨時開啟並使用。為了提升在這兩種裝置上的體驗，我們會特別針對行動裝置設計響應式 (RWD) 介面。

部署方案方面，我們將採用完全免費且易於維護的 **GitHub Pages**。

## Proposed Changes

以下將依據核心模組拆解我們的開發步驟：

### 專案基礎與 UI 系統
- **前端框架**: 使用 React + Vite 進行快速開發與模組化。
- **UI/UX 設計**: 
  - 高質感美學設計 (如：深色模式 Dark Mode、細緻色彩搭配、玻璃擬態 Glassmorphism)。
  - 在卡片點擊翻面(Flip)、頁面間過渡(Transition) 等地方加入順暢的微動畫以提升沉浸式體驗。
  - 響應式佈局 (Mobile-first)，手機上隨時隨地都能複習。

### Google 驗證與資料串接 (BaaS)
- 整合 **Google Identity Services** 讓使用者透過一鍵授權登入。
- 使用 **Google Sheets API** 做為唯一且免費的 Database：
  - 讀取使用者的現有表格（若無則自動建立 `LearnFlashCard_Data` 表格）。
  - 將所有 CRUD (新增、讀取、更新、刪除) 操作透過 API 即時同步回雲端。

### 記憶學習核心模組 (SM-2 演算法實踐)
- 在每次學習/複習時，由系統算出當下須複習的單字。
- 翻卡後提供 4 個按鈕：「忘記」、「困難」、「普通」、「簡單」，藉此重新運算資料庫中的三個參數 (`interval`, `repetition`, `easiness factor`)，並設定下次預定複習時間 `nextReviewDate`。

## 資料結構設計 (Google Sheet Schema)

每筆資料(Row)為一張單字卡，預計的 Google Sheet 欄位 (Columns) 如下：

- **id**: 唯一識別碼 (UUID)
- **front**: 單字正面內容 (如：Apple)
- **back**: 單字背面內容 (如：蘋果)
- **interval**: 距離下次複習的間隔天數 (SM-2 演算法參數)
- **repetition**: 連續答對次數 (SM-2 演算法參數)
- **efactor**: 容易度因子 (Easiness Factor, SM-2 演算法參數，預設通常設為 2.5)
- **nextReviewDate**: 下次預計複習日期 (ISO 8601 格式，如 `2026-03-12T00:00:00Z`)

## Verification Plan

### Automated Tests
- 因這是一個與 Google API 強依賴的前端應用，初期我們將以確保核心邏輯層級為主（例如針對 SM-2 演算法與時間計算進行 Unit Testing）來確認日期的演進推算正確無理。

### Manual Verification
1. **Google Login Flow**: 確認登入介面可順利彈出 Google 帳號授權視窗，並成功取得 Access Token。
2. **Sheet Initialization**: 首次使用時，應用程式能否自動在使用者的 Google Drive 內建立名為 `LearnFlashCard_Data` (名稱暫定) 的空表格，並寫入正確的標題行(Headers)。
3. **CRUD Operations**: 在網頁介面中「新增」、「編輯」與「刪除」單字卡後，打開這份 Google Sheet 能立刻看見資料被成功寫入修改或移除。
4. **Study Experience**:
   - 確認演算法能正確篩選出 `nextReviewDate` 小於等於 `今天是` 的單字卡。
   - 單字卡翻轉動畫流暢。
   - 在點擊「熟悉度」按鈕後，該單詞在 Google Sheet 裡的 `nextReviewDate` 和演算法參數被即時更新。

### GitHub Pages 部署指南
專案開發完成後，將透過以下步驟自動部屬：
1. **Repository 設定**: 在 GitHub 建立儲存庫並上傳程式碼。
2. **安裝套件**: 執行 `npm install gh-pages --save-dev`。
3. **組態設定 (package.json)**:
   - 加入 `"homepage": "https://<你的帳號>.github.io/<專案名稱>"`
   - 加入 script: `"predeploy": "npm run build"` 與 `"deploy": "gh-pages -d dist"`
4. **路徑設定 (vite.config.js)**: 設定 `base: '/<專案名稱>/'`。
5. **部署指令**: 在終端機執行 `npm run deploy` 即可一鍵推上線。
