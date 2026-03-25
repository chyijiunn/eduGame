# 相簿網頁 v0.3

## 功能
1. 首頁先顯示縮圖目錄
2. 預設每頁 20 張，可切換成 50 或 100 張
3. 點縮圖後，會跳出遮罩式浮動視窗顯示原圖
4. 原圖下方會顯示檔案名稱
5. 浮動視窗下方提供「上一張 / 下一張 / 關閉」按鈕
6. 點選大圖本身，會直接切換到下一張
7. 支援鍵盤操作：
   - `←` 上一張
   - `→` 下一張
   - `Esc` 關閉
8. 圖片來源：
   - 原圖放在 `pics/`
   - 縮圖放在 `thumbnail/`

## 使用流程
1. 把原圖放進 `pics/`
2. 執行：`python3 build_thumbnails.py`
   - 會自動把 `pics/` 內所有圖片建立成縮圖，輸出到 `thumbnail/`
3. 執行：`python3 build_gallery.py`
   - 會掃描 `pics/` 與 `thumbnail/`，產生 `gallery.json`
4. 開啟 `index.html`

## 注意
- `pics/` 與 `thumbnail/` 的檔名必須一致
- `build_thumbnails.py` 需要 Pillow：
  ```bash
  pip install pillow
  ```
- 若直接用瀏覽器開啟 `index.html` 讀不到 JSON，請改用本機伺服器，例如：
  ```bash
  python3 -m http.server 8000
  ```
  然後到瀏覽器開啟 `http://localhost:8000/`
