# 公開部署指南

本專案是 FastAPI 後端加上地圖前端，不能只使用 GitHub Pages。建議使用 Render 的免費 Web Service。

## GitHub 安全原則

- 不可上傳 `.env`。
- 不可把 `GEMINI_API_KEY` 寫進任何程式碼、README 或 `render.yaml`。
- `.env`、`.venv` 與 Python cache 已加入忽略清單。
- `data/` 內的人流、地點與商家都是 Mock / Simulated Data，可以公開展示。

## Render 部署

1. 在 Render 連接 GitHub 儲存庫。
2. 選擇 Blueprint，Render 會讀取根目錄的 `render.yaml`。
3. 在 Render 的 Environment 設定 `GEMINI_API_KEY`，不要把值寫回 GitHub。
4. 建立服務後等待測試、安裝與部署完成。
5. 開啟 Render 提供的 `onrender.com` 網址，並測試 `/api/health`。

若暫時不設定 Gemini key，網站仍會使用 deterministic fallback 正常推薦。免費服務閒置後可能休眠，第一次開啟需要等待約一分鐘。

## 部署設定摘要

- Build：`pip install -r requirements.txt && python -m unittest discover -v`
- Start：`uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check：`/api/health`
- Region：Singapore
- Plan：Free
