# 智慧出行小幫手

這是一個 Map-first 的 AI-assisted prototype，用來驗證以下流程：

使用者需求 → 歷史 OD 人流推估 → 舒適度分析 → 地點推薦 → 悠遊付模擬商家資訊 → 地圖呈現

## Prototype 聲明

- 人流資料來自 2026 年 6 月 OD 歷史分析結果，屬於低可靠度的歷史推估，不是即時站內人數。
- 商家資料為 `MOCK DATA`。
- 舒適度以 `100 - 歷史相對人流擁擠指數 - 個人偏好扣分` 計算。
- P95 是歷史高流量代理值，不是官方站體容量或安全上限。

## 目前進度

- [x] 建立專案主資料夾
- [x] Phase 1：Map-first UI shell
- [x] Phase 2：模擬人流資料
- [x] Phase 3：舒適度分析
- [x] Phase 4：地圖互動與搜尋
- [x] Phase 5：地點推薦
- [x] Phase 6：Travel Decision Agent（Gemini function calling + 自動備援）
- [x] Phase 7：模擬悠遊付商家
- [x] Phase 8：測試、GitHub 與部署
- [x] Phase 9：可調整資訊面板、搜尋重設、旅客餘額推薦與四語介面
- [x] Phase 10：真實 OD 歷史資料轉換、119 站時段查詢與可靠度揭露
- [x] Phase 11：119 筆 OD 站名座標對照、全站熱區圖與最近站判定

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/steph0410333-oss/smart-travel-assistant)

公開網站：https://smart-travel-assistant-ycn1.onrender.com

技術組交接請先閱讀 [`TECHNICAL_GUIDE.md`](TECHNICAL_GUIDE.md)，內容包含技術架構、功能對照、資料流、演算法、測試、限制及改善優先順序。

## 地點搜尋的 Prototype 範圍

普通搜尋讓使用者輸入「目的地」，系統自動完成以下流程：

目的地名稱 → Mock 地點座標 → 最近捷運站 → 同星期同小時 OD 歷史推估 → 舒適度

目前只支援 `data/places.json` 內的 Mock 地點與站名。未來接入正式地點 API 後，才能辨識任意地址或店家。

AI 推薦由 Gemini 理解自然語言並呼叫本機推薦工具；地點與典型消費仍為 Mock Data，人流改採歷史 OD 推估。Gemini 無法使用時會自動切回 rules-based fallback。

## Phase 10：OD 歷史人流串接

- `data/historical_crowd.json`：119 站、17,493 組「車站 × 星期 × 小時」歷史人流資料。
- 各時段以 `[crowd_score, sample_count]` 精簡儲存；人流文字等級與可靠度由後端依相同門檻即時計算。
- `services/crowd_service.py`：依站名、日期與時間查詢歷史人流壓力。
- `services/comfort_service.py`：以歷史人流壓力反向計算舒適度，不再套用固定尖峰加分。
- `GET /api/stations?date=YYYY-MM-DD&time=HH:MM`：取得地圖站點的指定時段歷史推估。
- `POST /api/analyze-place`：請求可額外提供 `date` 與 `time`。
- 凌晨或缺少 OD 紀錄的時段會回傳「資料不足」，不以模擬值補齊。

地圖會顯示 `data/stations.json` 的 119 筆 OD 站點，並以同一批站點執行最近捷運站判定。OD 有 119 個站名、座標表有 118 個實體站；差異來自板橋站在 OD 中分成 `BL板橋` 與 `Y板橋`。`大橋頭站` 則明確對照座標表的 `大橋頭`。

### Phase 11：119 站座標目錄

- `data/taipei_metro_stations_source.csv`：座標鏡像原始檔，欄位含站名、線別站號、地址、經緯度與臺北捷運地圖連結；鏡像標示更新日期為 2024-12-01。
- `scripts/build_station_catalog.py`：依 `historical_crowd.json` 的 119 個 OD 站名建立 `stations.json`。
- 一般轉乘站使用各線站點座標的平均值作為實體站代表點；`BL板橋` 與 `Y板橋` 保留線別座標。
- 官方參考資料為臺北市資料大平臺的「臺北捷運車站出入口座標」；目前因下載端點限制，專案內使用可稽核的 GitHub 座標鏡像，並在每筆資料保留來源欄位。

重新產生站點目錄：

```powershell
python scripts/build_station_catalog.py `
  data/taipei_metro_stations_source.csv `
  data/historical_crowd.json `
  data/stations.json
```

### 從新版 Excel 重新產生網站資料

開發環境先安裝 `requirements-dev.txt`，再執行：

```powershell
python scripts/build_historical_crowd_json.py `
  hourly_crowd_scores_with_weekday_summary.xlsx `
  data/historical_crowd.json
```

產製後應執行：

```powershell
python -m unittest discover -s tests -v
```

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
- [x] 由 Render 連接 GitHub 並取得公開網址

部署方式請見 [`DEPLOYMENT.md`](DEPLOYMENT.md)。

### Phase 9（已完成）

- [x] 地圖資訊面板可點擊或拖曳，在縮小、半開與展開狀態間切換
- [x] 搜尋後提供「清除結果」，一鍵回到原始熱區圖
- [x] 依模擬悠遊卡／悠遊付餘額推薦可負擔的示意商家
- [x] 繁體中文、English、日本語、한국어介面切換
- [x] 餘額、商家與價格皆清楚標示為 Prototype Mock Data，未連接真實帳戶
