# 智慧出行小幫手

這是一個 Map-first 的 AI-assisted prototype，用來驗證以下流程：

使用者需求 → 模擬人流資料 → 舒適度分析 → 地點推薦 → 悠遊付模擬商家資訊 → 地圖呈現

## Prototype 聲明

- 人流資料為 `SIMULATED DATA`。
- 商家資料為 `MOCK DATA`。
- 舒適度分數為 `PROTOTYPE LOGIC`。
- 本專案不代表實際悠遊卡 OD Data，也不宣稱具有真實預測準確度。

## 目前進度

- [x] 建立專案主資料夾
- [x] Phase 1：Map-first UI shell
- [x] Phase 2：模擬人流資料
- [x] Phase 3：舒適度分析
- [x] Phase 4：地圖互動與搜尋
- [x] Phase 5：地點推薦
- [x] Phase 6：Travel Decision Agent（Gemini function calling + 自動備援）
- [x] Phase 7：模擬悠遊付商家
- [ ] Phase 8：測試、GitHub 與部署

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/steph0410333-oss/smart-travel-assistant)

## 地點搜尋的 Prototype 範圍

普通搜尋讓使用者輸入「目的地」，系統自動完成以下流程：

目的地名稱 → Mock 地點座標 → 最近捷運站 → 模擬站點人流 → Prototype 舒適度

目前只支援 `data/places.json` 內的 Mock 地點與站名。未來接入正式地點 API 後，才能辨識任意地址或店家。

AI 推薦由 Gemini 理解自然語言並呼叫本機推薦工具；地點、典型消費、人流與舒適度皆為 Mock / Simulated Data。Gemini 無法使用時會自動切回 rules-based fallback。

### Phase 6（已完成）

- [x] Travel Decision Agent orchestration 與 workflow trace
- [x] 無 API key 時可執行的 deterministic fallback
- [x] Gemini API function calling adapter
- [x] Gemini 解析需求 → 本機推薦與舒適度工具 → Gemini 繁中說明
- [x] API、額度或網路失敗時自動切回 deterministic fallback

Gemini 預設使用 `gemini-2.5-flash`，可在 `.env` 以 `GEMINI_MODEL` 調整。API key 只放在本機 `.env`，該檔案已被 `.gitignore` 排除。

### Phase 7（已完成）

- [x] 15 筆清楚標示為「示意」的悠遊付 Mock 商家資料
- [x] 依目的地搜尋 700 公尺內商家、距離、步行時間與類型統計
- [x] 普通搜尋與 AI Top 3 結果都附帶附近商家
- [x] Travel Decision Agent workflow 加入 Merchant Search Tool
- [x] 地圖商家圖示、商家卡、消費區間、營業時間與模擬優惠
- [x] API：`GET /api/merchants`，可選擇以座標與半徑篩選

所有商家名稱、可用狀態、營業時間及優惠都屬於 `MOCK DATA / PROTOTYPE ONLY`，不代表悠遊付真實合作商家或現行活動。

### Phase 8 進度

- [x] 最終單元測試與 API contract tests
- [x] GitHub secret / ignore 安全檢查
- [x] Render 免費方案部署設定與 health check
- [x] 公開部署說明文件
- [x] 建立並授權 GitHub 儲存庫，安全上傳全部程式碼
- [ ] 由 Render 連接 GitHub 並取得公開網址

部署方式請見 [`DEPLOYMENT.md`](DEPLOYMENT.md)。

