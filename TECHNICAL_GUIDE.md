# 智慧出行小幫手：完整技術說明與交接指南

更新日期：2026-07-24  
適用版本：OD 歷史人流串接工作區版本

## 1. 先用一句白話說明這個系統

這是一個以台北捷運站為中心的旅遊決策 Prototype。使用者可以搜尋目的地，或用自然語言告訴 AI 想做什麼；系統會找出目的地最近的捷運站，用真實 OD 資料產生的歷史時段人流分數計算舒適度，再顯示附近的模擬悠遊付商家與建議。

目前它可以展示完整操作流程，但還不是正式的即時人流產品。人流來自 2026 年 6 月 OD 歷史分析，只有一個月、可靠度低；地點、商家、活動、餘額及優惠仍是 Prototype 資料。

## 2. 系統全貌

```text
使用者的手機／電腦瀏覽器
        │
        ├─ 地圖、搜尋、語言、可拖曳資訊面板
        │        前端：HTML + CSS + JavaScript + Leaflet
        │
        ▼
FastAPI HTTP API
        │
        ├─ 地點解析與最近捷運站
        ├─ 人流／舒適度計算
        ├─ 附近 Mock 商家搜尋
        ├─ 餘額可負擔推薦
        └─ Travel Decision Agent
                 │
                 ├─ 有 Gemini API Key：Gemini 理解需求及撰寫說明
                 └─ 無法使用 Gemini：規則式解析自動備援
        │
        ▼
本機 JSON 資料
historical_crowd.json + stations.json + places.json + merchants.json
```

前端和後端由同一個 FastAPI 服務提供，因此瀏覽器呼叫的是同一個網域下的 `/api/...`，目前不需要額外設定 CORS。

## 3. 使用的技術，以及各自負責什麼

| 分類 | 技術 | 白話用途 | 對應功能／檔案 |
|---|---|---|---|
| 前端結構 | HTML5 | 定義地圖、搜尋畫面、資訊卡、按鈕與表單 | `frontend/index.html` |
| 前端樣式 | CSS3 | 手機版版面、環狀舒適度、三段式資訊面板、卡片與多語言選單 | `frontend/styles.css` |
| 前端互動 | 原生 JavaScript | 呼叫 API、更新畫面、拖曳面板、切換語言與控制地圖 | `frontend/app.js` |
| 地圖 | Leaflet 1.9.4 | 顯示地圖、捷運站圓圈、站點與商家標記 | `frontend/index.html`、`frontend/app.js` |
| 地圖底圖 | OpenStreetMap | 提供道路、街區與地名底圖圖磚 | `frontend/app.js` |
| 後端框架 | FastAPI | 建立網站伺服器及 JSON API | `app/main.py` |
| 資料驗證 | Pydantic | 檢查 API 輸入，例如餘額不得小於 0、搜尋文字不可為空 | `app/schemas.py` |
| 後端語言 | Python 3.12.7 | 執行分析、推薦、距離與 AI 流程 | `app/`、`services/`、`agent/` |
| 正式啟動伺服器 | Uvicorn | 在本機或 Render 啟動 FastAPI | `start_app.bat`、`render.yaml` |
| 環境變數 | python-dotenv | 從 `.env` 讀取 Gemini API Key 與模型名稱 | `agent/gemini_adapter.py` |
| 生成式 AI | Google Gemini REST API | 理解自然語言需求、呼叫推薦工具、產生繁中摘要 | `agent/gemini_adapter.py` |
| Agent 協調 | 自製 Travel Decision Agent | 串接意圖、候選地點、人流、商家、排序及回覆，並處理備援 | `agent/travel_decision_agent.py` |
| OD 資料轉換 | Python + openpyxl | 將分析 Excel 的星期時段平均結果轉成網站可讀 JSON | `scripts/build_historical_crowd_json.py` |
| 歷史人流查詢 | Python | 依車站、星期與小時查詢 OD 歷史人流壓力及可靠度 | `services/crowd_service.py` |
| 資料儲存 | JSON 檔案 | 儲存 OD 歷史人流、展示站點、地點與商家資料 | `data/*.json` |
| 距離計算 | Haversine 公式 | 用經緯度估算兩點球面直線距離 | `services/station_service.py`、`services/merchant_service.py` |
| 快取 | Python `lru_cache` | JSON 第一次讀取後留在記憶體，減少重複讀檔 | `station_service.py`、`merchant_service.py` |
| 測試 | Python `unittest` | 驗證服務邏輯、Agent 備援與 API 回傳格式 | `tests/` |
| 版本管理 | GitHub | 保存並分享程式碼，讓組員 Clone、分支修改與審查 | GitHub repository |
| 部署 | Render Blueprint | 安裝依賴、執行測試、啟動網站及健康檢查 | `render.yaml` |

### 目前沒有使用的技術

- 沒有 React、Vue、Next.js 或其他前端框架。
- 沒有資料庫，資料只放在 JSON 檔案。
- 沒有 Google Maps／Google Places API；目前任意地址或店名無法自動地理編碼。
- 沒有登入、會員、權限管理或真實悠遊卡／悠遊付帳戶連線。
- 沒有 WebSocket 或即時資料串流。
- 沒有正式的機器學習人流預測模型。

## 4. 專案資料夾怎麼看

```text
smart-travel-assistant/
├─ app/
│  ├─ main.py                 FastAPI 入口與所有 API 路由
│  └─ schemas.py              API 輸入格式及驗證規則
├─ agent/
│  ├─ gemini_adapter.py       Gemini 呼叫、Function Calling、輸出驗證
│  └─ travel_decision_agent.py AI 與本機推薦工具的協調流程
├─ services/
│  ├─ station_service.py      地點解析、捷運站資料、最近車站
│  ├─ crowd_service.py        OD歷史人流查詢、站名對應、資料期間與可靠度
│  ├─ comfort_service.py      歷史人流壓力轉換為舒適度
│  ├─ intent_service.py       無 AI 時的關鍵字／預算／時間解析
│  ├─ recommendation_service.py 地點符合度計算與 Top 3 排序
│  ├─ merchant_service.py     700 公尺內 Mock 商家與距離
│  └─ balance_service.py      依模擬餘額找可負擔商家
├─ data/
│  ├─ historical_crowd.json   119站、17,493組星期時段OD歷史人流
│  ├─ stations.json           119 筆 OD 站名、線別站號與代表座標
│  ├─ taipei_metro_stations_source.csv  135 筆線別站點座標來源
│  ├─ places.json             9 個可搜尋／推薦的 Mock 地點
│  └─ merchants.json          15 個 Mock 悠遊付商家
├─ frontend/
│  ├─ index.html              畫面結構
│  ├─ styles.css              視覺與響應式版面
│  └─ app.js                  地圖、API 與所有瀏覽器互動
├─ scripts/                   重建OD歷史人流與119站座標JSON
├─ tests/                     21 項 Python 自動測試
├─ requirements.txt           Python 套件清單
├─ render.yaml                Render 建置與部署設定
├─ start_app.bat              Windows 本機啟動捷徑
├─ .env.example               Gemini 環境變數範例
├─ .gitignore                 防止密鑰與虛擬環境被上傳
└─ DEPLOYMENT.md              部署說明
```

`historical_crowd.json` 的每個時段使用 `[crowd_score, sample_count]`
精簡編碼。`crowd_service.py` 讀取後再依既定門檻補出人流等級與可靠度，
避免在 17,493 筆資料中重複儲存相同文字。

## 5. 前端功能如何實作

### 5.1 地圖與所謂的「熱區圖」

網站使用 Leaflet 建立地圖，底圖來自 OpenStreetMap。載入時前端同時呼叫：

- `GET /api/places`
- `GET /api/stations`
- `GET /api/merchants`

每個捷運站會畫出兩個圖形：

1. 一個彩色半透明圓圈，圓圈半徑是 `280 + crowd_index × 5` 公尺。
2. 一個較小的圓形站點標記。

顏色依 `crowd_index` 分級：

- 0–34：綠色，較少
- 35–54：黃色，普通
- 55–74：橘色，偏高
- 75–100：紅色，擁擠

因此目前畫面比較精確的名稱是「站點人流熱區圓」，不是根據大量即時座標產生的連續式 Heatmap。畫面仍只有 10 個已有經緯度的固定站點，但圓圈數值已改由 `historical_crowd.json` 依當天星期與小時查詢。

### 5.2 地圖上的商家

15 個 Mock 商家會以「悠」字圖示顯示。點擊標記會開啟商家卡；商家卡也能反向把地圖移到該商家。所有商家都只是示意資料。

### 5.3 可拖曳資訊面板

資訊面板有三個狀態：

- `collapsed`：縮小，高度 178px
- `half`：半開，高度 46vh
- `expanded`：展開到接近整個畫面

使用者可以點擊把手循環切換，也可以使用 Pointer Events 拖曳。放手時依面板高度吸附到最近狀態，所以滑鼠和手機觸控都能共用同一套程式。

### 5.4 舒適度環狀圖與人流圖示

舒適度環使用 CSS 圓錐漸層，角度為 `comfort_score × 3.6`。例如 63 分會填滿 226.8 度；剩餘部分使用無彩色背景。

人流不只顯示數字，而是依程度點亮 1–4 個人物圖示：

- 1 人：人流較少
- 2 人：人流普通
- 3 人：人流偏高
- 4 人：非常擁擠

### 5.5 清除搜尋結果

分析成功後顯示「清除結果」。按下後會：

- 隱藏搜尋結果、商家與推薦區塊
- 清空搜尋欄、AI 文字與已選條件
- 把地圖移回台北預設範圍
- 把資訊面板縮小
- 恢復原始站點熱區圖

### 5.6 多語言

前端內建繁體中文、英文、日文與韓文翻譯字典，由 JavaScript 直接替換部分 UI 文字，沒有呼叫翻譯 API。

目前只完成主要標題、搜尋入口、頁籤、餘額推薦、預設提示等核心文字；人流狀態、商家資料、AI 回覆、部分搜尋欄位及歷史搜尋仍以中文為主。因此目前是「部分四語介面」，不是完整國際化。

語言選擇也沒有存入 `localStorage`，重新整理後會回到繁體中文。

## 6. 後端 API 一覽

| 方法與路徑 | 用途 | 主要輸入 | 主要輸出 |
|---|---|---|---|
| `GET /` | 傳回網站首頁 | 無 | `frontend/index.html` |
| `GET /api/health` | Render 健康檢查 | 無 | `status: ok` |
| `GET /api/stations` | 取得地圖站點與OD歷史人流推估 | 可選日期、時間 | 10 個已有座標的站點及可靠度 |
| `GET /api/places` | 取得可搜尋地點 | 無 | 9 個地點及最近捷運站 |
| `GET /api/merchants` | 取得全部或指定座標附近的 Mock 商家 | 可選經緯度、半徑 | 商家列表及類型統計 |
| `POST /api/analyze-place` | 分析指定目的地 | 地點、日期、時間、偏好 | 最近站、OD歷史人流、舒適度、附近商家 |
| `POST /api/recommend` | 純規則式地點推薦 | 自然語言文字 | 結構化需求與 Top 3 |
| `POST /api/agent/recommend` | Gemini Agent 推薦 | 自然語言文字 | Top 3、AI 摘要、流程紀錄、備援狀態 |
| `POST /api/balance-recommend` | 模擬餘額推薦 | 餘額、數量 | 可負擔的 Mock 商家 |

FastAPI 預設還會提供 `/docs` 的 Swagger API 文件，技術組可以直接用瀏覽器測試 API。

## 7. 普通搜尋完整資料流

以使用者輸入「中山站咖啡商圈」、時間 19:00 為例：

1. `frontend/app.js` 將輸入送到 `POST /api/analyze-place`。
2. Pydantic 確認地點文字非空，並整理時間與偏好陣列。
3. `resolve_place()` 在 `places.json` 的名稱與 aliases 中比對。
4. 找到地點經緯度後，`find_nearest_station()` 用 Haversine 公式比較所有站點。
5. `crowd_service.py` 依站名、星期與小時查詢 OD 歷史人流壓力。
6. `analyze_station_comfort()` 將歷史人流壓力反向轉為舒適度，再加入偏好扣分。
7. `find_nearby_merchants()` 搜尋目的地 700 公尺內的 Mock 商家。
8. API 回傳地點、最近站、距離、舒適度、人流因素、可靠度、理由與商家。
9. 前端移動地圖、畫環狀分數、點亮人物圖示、顯示建議並展開面板。

目前普通搜尋不是網路搜尋。只有名稱或別名能對到 `places.json`，或文字能對到既有站名時才會成功。

搜尋畫面上的「出行目的」下拉選單目前沒有送到後端；部分偏好按鈕雖會送出，但舒適度服務目前只有實際處理「不想太擠」與「少走路」。這些屬於尚未接完的 UI。

## 8. 最近捷運站如何決定

每個地點與捷運站都有經緯度。系統使用 Haversine 公式估算地球表面兩點的直線距離，再從 10 個站中取距離最短的一個。

這能回答「使用者不知道目的地靠近哪一站」的問題，但有三項限制：

- 算的是直線距離，不是實際步行路線。
- 只會在 10 個模擬站中選擇，不是完整台北捷運網。
- 沒有考慮出口位置、道路阻隔、轉乘或無障礙路線。

## 9. 人流與舒適度怎麼算

### 9.1 歷史人流資料

`historical_crowd.json` 由 Excel 的「星期時段平均擁擠度」產生，查詢鍵為：

```text
車站 + 星期編號 + 小時
```

每筆包含：

- `crowd_score`：歷史相對人流壓力，0–100。
- `crowd_level`：舒適、普通、偏擠、擁擠或非常擁擠。
- `sample_count`：同星期同時段樣本數。
- `reliability`：目前全部為 `low`，因樣本未達 8 筆。

系統已移除固定早晚尖峰加分，因為 OD 時段資料本身已反映尖峰；再次加分會重複計算。

### 9.3 舒適度公式

```text
舒適度 = 100
       - 歷史相對人流擁擠指數
       - 個人偏好扣分
```

結果會限制在 0–100：

- 66–100：舒適
- 46–65：尚可
- 31–45：偏擠
- 0–30：擁擠

個人偏好扣分：

- 選擇「不想太擠」且歷史人流壓力 ≥ 55：扣 8 分
- 選擇「少走路」且最近站超過 500 公尺：扣 6 或 12 分

如果查詢時段沒有 OD 紀錄，系統回傳「資料不足」，不會回頭使用 `stations.json` 的舊模擬值。`nearby_crowd_index`、`peak_index` 與 `event_flag` 目前不再參與舒適度。

## 10. AI 推薦與 Agent 到底怎麼運作

### 10.1 Gemini 有正常運作時

1. 使用者輸入：「想和朋友喝咖啡聊天，有冷氣，預算 500 元內」。
2. `GeminiTravelAdapter.plan()` 把文字傳給 Gemini。
3. 系統強制 Gemini 呼叫 `find_recommended_places` Function。
4. Gemini 只負責整理出：活動類型、環境條件、預算、時間及避開人潮偏好。
5. 程式再驗證 Gemini 的參數，無效值會用規則式解析結果補上。
6. `recommend_places()` 用本機 JSON 資料真正計算所有候選地點。
7. 取出 Top 3 後，再把精簡結果交給 Gemini 撰寫 2–3 句繁中說明。

因此 Gemini 不會自己發明真實人流或商家。系統 Prompt 也要求它不可增加工具結果中不存在的資訊。

### 10.2 Gemini 無法使用時

以下情況會自動備援：

- 沒有設定 API Key
- Key 無效或沒有權限
- 免費額度或呼叫頻率已達上限
- 網路失敗或逾時
- Gemini 沒有依要求呼叫 Function
- Gemini 回傳格式不完整

備援流程用 `intent_service.py` 的關鍵字與正規表示式解析需求，再使用相同的本機推薦與排序服務。網站仍可產生 Top 3，只是理解能力較有限，回覆文字也改由固定規則組合。

### 10.3 這算不算 AI Agent

算是簡化的 Tool-using Agent：它有明確任務、工具定義、流程紀錄、模型呼叫及失敗備援。但目前流程是固定的六步協調，不是可以自由規劃大量任務的通用自主 Agent。

### 10.4 Agent 的六步流程紀錄

1. Gemini Intent Planner／Fallback Intent Parser
2. Place Candidate Tool
3. Crowd & Comfort Tools
4. Merchant Search Tool
5. Recommendation Ranking Tool
6. Gemini Response Composer／Fallback Composer

前端的「查看 Travel Decision Agent 分析流程」會顯示這份 trace。

## 11. Top 3 推薦怎麼排序

每個 `places.json` 地點都會計算：

- 舒適度貢獻：`舒適度 × 0.35`，最高約 35 分
- 活動類型符合：最高 30 分
- 環境條件符合：最高 20 分
- 預算符合：最高 15 分

```text
推薦分數 = 0.35 × 舒適度 + 類型分 + 特徵分 + 預算分
```

所有地點依推薦分數排序；同分時以舒適度較高者優先，最後只回傳前三名。

這是可解釋的規則式排序，不是訓練過的推薦模型，也沒有使用者行為資料。

## 12. 商家與餘額推薦

### 12.1 附近商家

系統會計算目的地與每個商家的直線距離，只保留 700 公尺內且 `easywallet_available` 為真的商家，最多顯示 6 間。步行時間用 `距離 ÷ 75` 粗估，並非路線導航結果。

### 12.2 餘額推薦

使用者輸入模擬餘額後，系統從商家的 `price_range` 取第一個數字作為最低消費。例如 `$150–350` 會用 150 元估算：

```text
估計剩餘餘額 = 輸入餘額 - 商家最低消費
```

只保留最低消費不超過餘額的商家，再按最低消費由低到高顯示三間。

目前限制：

- 不會讀取真實悠遊卡／悠遊付餘額。
- 不會確認商家是否真的接受悠遊付。
- 不會確認最新價格、營業時間或優惠。
- 推薦是全域最低價排序，尚未結合使用者目前位置或搜尋目的地。
- 用價格區間下限估算，可能低估真正消費。

## 13. 哪些資料是真實、哪些是模擬

| 項目 | 目前狀態 | 能否對外宣稱即時／官方 |
|---|---|---|
| OpenStreetMap 底圖 | 外部公開地圖圖磚 | 可稱公開底圖，但需保留 attribution |
| 捷運站名稱與展示座標 | 專案內靜態資料 | 不應宣稱完整或官方 |
| 捷運人流壓力 | 2026年6月OD歷史推估；可靠度低 | 不可稱即時站內人數或官方容量 |
| 資料期間 | 2026-06-01至2026-06-30 | 可以揭露資料截止日，不可稱即時更新 |
| 活動狀態 | 人工布林值 | 不可以 |
| 舒適度 | OD歷史人流壓力反向換算＋偏好扣分 | 只能稱歷史推估舒適度 |
| 地點及典型預算 | Mock 目錄 | 不可以稱完整市場資料 |
| 悠遊付商家與優惠 | Mock 資料 | 不可以稱合作商家或現行優惠 |
| 餘額 | 使用者手動輸入的模擬值 | 不是真實帳戶餘額 |
| Gemini 文字理解 | 真實 Gemini API（有 Key 時） | 可說使用 Gemini；人流依據為低可靠度OD歷史推估 |

對公司介紹時最安全的說法是：

> 目前版本已接入一個月真實OD產製的歷史人流推估，用於驗證產品流程與UX；由於同星期同時段樣本只有約4–5筆，可靠度仍低，不代表即時站內人數或官方容量。

## 14. 測試目前做到什麼

目前共有 18 項 Python `unittest`，主要驗證：

- 地點別名能解析並找出最近捷運站
- 尖峰時間會降低舒適度
- 不想擁擠偏好會影響分數
- 自然語言能解析咖啡、聊天、冷氣與預算
- 推薦能回傳三個有名稱與理由的地點
- Mock 商家資料標示及 700 公尺距離排序
- 餘額推薦不會超過輸入餘額
- Agent 沒有 Key 時能完成規則式備援
- 模擬 Gemini Function Calling 能完成工具流程
- API 函式回傳必要欄位與 Mock 標籤

Render 每次建置都會先執行：

```text
python -m unittest discover -v
```

測試通過後才啟動新版本。

目前測試缺口：

- 多數 API 測試是直接呼叫 Python 函式，不是透過真實 HTTP TestClient。
- 沒有自動化瀏覽器測試放進 repository。
- 沒有測試手機尺寸、拖曳手勢、四語完整性與錯誤畫面。
- 沒有正式負載、資安、可用性或無障礙測試。
- 沒有獨立 GitHub Actions workflow；目前主要靠 Render build 執行測試。

## 15. 部署與執行

### 15.1 本機啟動

Windows 使用者可雙擊 `start_app.bat`，它會執行：

```text
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

再開啟 `http://127.0.0.1:8000/`。Terminal 必須保持開啟。

### 15.2 Render

`render.yaml` 設定：

- Python 3.12.7
- Singapore region
- Free plan
- Build：安裝套件並執行測試
- Start：以 Uvicorn 監聽 Render 提供的 `$PORT`
- Health check：`/api/health`
- Gemini 模型環境變數：`gemini-2.5-flash`
- Gemini API Key：只在 Render 後台設定

Render 免費服務閒置後可能休眠，第一次開啟會需要等待。GitHub `main` 更新後會觸發重新部署。

## 16. 現有資安與工程做法

已做到：

- `.env` 已加入 `.gitignore`，API Key 不應上傳 GitHub。
- Render 的 Key 使用環境變數，`render.yaml` 不含實際值。
- Pydantic 限制文字長度、餘額及推薦數量等基本輸入。
- Gemini 回傳的 Function 參數會再次驗證，不完全信任模型。
- AI 失敗時有明確例外與備援，不會讓整個推薦功能直接消失。
- Mock／Simulated Data 在 API 與 UI 多處標示。

仍需改善：

- 沒有使用者登入、API rate limit、濫用防護與請求追蹤。
- 前端多處使用 `innerHTML`。現在資料是本機可信 JSON，但接入外部內容前必須改為安全 DOM 或做輸出清理，避免 XSS。
- 沒有正式 logging、錯誤監控或告警。
- Gemini 請求沒有重試、快取、成本監控及每位使用者額度。
- `requirements.txt` 沒有鎖定版本，未來重新部署可能安裝到不相容的新版本。
- OpenStreetMap 公開圖磚適合 Prototype；正式大量流量需要確認 Tile Usage Policy 或使用合適供應商。

## 17. 目前最重要的限制與改善優先順序

### A. 正式產品前「必要」

1. **接入有來源、有授權的人流資料**  
   先定義資料來源、更新頻率、站點 ID、時間粒度、缺值與延遲處理。現在的舒適度不能拿來驗證真實準確度。

2. **擴充完整地點與捷運站資料**  
   接入 Google Places、政府地理資料或其他正式地點服務，再使用完整捷運站、出口及步行路線。Google API 需限制金鑰來源、設定額度和費用警報。

3. **校正舒適度公式**  
   與資料公司確認每個指標定義，用歷史資料、現場觀察或問卷驗證權重與分級，並保存公式版本。

4. **清楚處理隱私及授權**  
   若資料涉及定位、電信訊號、票證或個人行為，需確認去識別化、保存期限、使用同意及法規。

5. **修正前端 XSS 與 API 防護**  
   外部資料不得直接插入 `innerHTML`；加入 rate limit、輸入長度上限、結構化日誌及錯誤監控。

6. **建立正式測試與 CI**  
   加入 FastAPI TestClient、Playwright 瀏覽器測試、GitHub Actions、部署前檢查與正式／測試環境分離。

### B. 對下一版體驗「重要」

1. 完整翻譯所有 UI、動態狀態、AI 回覆與資料名稱，並保存語言偏好。
2. 普通搜尋接上任意地址／店名、自動完成與地理編碼。
3. 將「目的」下拉選單與所有偏好真正接入推薦邏輯。
4. 餘額推薦結合使用者位置、目的地、營業時間、實際典型消費及路線。
5. 提供 loading、離線、API 失敗、無結果與重新嘗試狀態，不只使用 `alert()`。
6. 把人流展示從固定圓圈升級為適合資料密度的視覺，例如站點圖層、時間軸或真正 Heatmap。
7. 加入資料時間與可信度標示，讓使用者知道「多久前更新」及是否為推估。
8. 增加鍵盤操作、焦點狀態、螢幕閱讀器文字及色盲可辨識設計。

### C. 可以延後

1. 會員收藏、搜尋歷史同步與個人化模型。
2. 推播通知、人潮下降提醒或行程排程。
3. 語音輸入與對話記憶。
4. 多城市、多運具及跨平台原生 App。
5. 更自主、可多輪規劃的 Agent；在資料品質未解決前，先增加 Agent 複雜度的價值有限。

## 18. 建議技術組如何分工驗證

### 前端負責人

- 說明 Leaflet 地圖初始化、站點圓圈、商家 Marker 與面板狀態。
- 完成四語盤點，列出仍是中文的文字。
- 實作至少一個改善：錯誤狀態、語言保存、完整翻譯或自動化瀏覽器測試。

### 後端／API 負責人

- 用 `/docs` 實際測試每支 API。
- 繪製普通搜尋的 Request／Response 流程。
- 增加 TestClient 測試、錯誤格式與 logging。

### 資料／模型負責人

- 解釋三種人流指標的業務定義。
- 對舒適度公式做敏感度分析，說明各權重如何影響分數。
- 提出正式資料欄位、更新頻率及驗證方法。

### AI／Agent 負責人

- 分別測試 Gemini 正常、無 Key、429、逾時及格式錯誤。
- 檢查 Function Calling 的參數驗證及 Prompt 限制。
- 評估模型成本、額度、快取、重試與繁中以外輸出。

### 部署／品質負責人

- 建立可重複的本機安裝流程與鎖版套件。
- 增加 GitHub Actions、測試報告與部署檢查。
- 確認 Render 環境變數、健康檢查、日誌及回復上一版的方法。

## 19. 組員第一次接手時的建議步驟

1. 從 GitHub Clone repository，不要只下載單一檔案。
2. 建立自己的 branch，不要直接在 `main` 上多人同時修改。
3. 安裝 Python 3.12、建立虛擬環境並安裝 `requirements.txt`。
4. 複製 `.env.example` 為 `.env`；需要測 Gemini 才填自己的 Key。
5. 執行 `python -m unittest discover -v`。
6. 啟動 Uvicorn，實際操作普通搜尋、AI 推薦、面板、清除、餘額及四語。
7. 先讀 `app/main.py` 知道 API，再依任務進入 `services/` 或 `agent/`。
8. 修改後補測試，建立 Pull Request，請另一位組員 Review。

## 20. 給評審或合作公司的簡短技術說法

> 前端以原生 JavaScript、Leaflet 與 OpenStreetMap 實作行動優先地圖；後端使用 FastAPI，將地點解析、最近捷運站、人流舒適度、商家及推薦拆成獨立服務。AI 使用 Gemini Function Calling 理解自然語言，但實際排序由可驗證的 Python 工具完成，Gemini 不可用時有規則式備援。目前資料為清楚標示的 Prototype 模擬資料；下一階段重點是接入正式人流與地點資料、校正舒適度公式、完整國際化，以及補強測試與資安。

## 21. 最後總結

這個 Prototype 的優點是流程完整、結構清楚、AI 失敗仍可運作，也已把資料、計算、Agent、API 與 UI 分開。技術組可以逐層替換，而不需要整個重寫。

目前最大的風險不是「AI 不夠強」，而是資料仍是模擬、搜尋範圍太小、公式尚未驗證及部分 UI 尚未真正接入邏輯。下一階段應先把資料來源、指標定義、測試及正式搜尋做好，再增加更複雜的 AI 功能。
