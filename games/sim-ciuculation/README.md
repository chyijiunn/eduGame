# Ocean Drift Lab v0.9 — 全球洋流與小鴨漂流（正射地球儀）

**預設視角以台灣為中心，但模擬範圍始終是全球。**

- 預設正射地球儀：從台灣觀看東亞，滾輪縮小可看到完整地球；拖曳旋轉地球。
- 可切換「全球平面圖」，左右經度環接，拖曳、縮放功能一致。
- 全球粒子持續運算（不因目前看到東亞而只模擬東亞），最高 50,000。
- 點海面投放多隻黃色小鴨，立即漂流；碰到岸線擱淺。
- 季節平均／連續日期（連續日期使用每月平均場，**不是逐日實測或當日預報**）。
- 軌跡 CSV 匯出，台灣附近一鍵投放、投放十隻、拖曳小鴨、暫停及清除。
- 使用 GSHHG 全球向量海岸線＋水陸遮罩，不用第三方地圖 API，也沒有地名。

## 部署
直接上傳解壓縮的所有檔案到 GitHub Pages 的同一子目錄，保持 index.html、main.js、style.css、geo/、data/ 原有相對位置。

本地開發：`python -m http.server 8000`，開啟 http://localhost:8000 。不可用 file:// 直接開啟。

## OSCAR 資料來源（重要）
隨附的 `data/*.bin` 為**合成示範資料**，不能推論真實小鴨會漂到哪裡。
正式使用 NASA OSCAR v2.0 必須先從 Earthdata 取得有權限的 NetCDF 原始資料。
請安裝 `pip install numpy netCDF4` 後，參照原有 `process_currents.py` 匯入全年數據，
再把 `data/manifest.json` 與 `01.bin`–`12.bin` 一起重新部署。

OSCAR 以 m/s 記錄 u(向東) 與 v(向北)；本專案採用地理位置＋時間積分，非直接像素速度。
注意：實際小鴨受風、波浪等影響；本專案只模擬理想化純洋流漂流。

## 資料和授權
見 ATTRIBUTION.md。

## 測試
- `node tests/test_browser_logic.cjs`（互動）
- `python -m unittest discover -s tests -p "test_*.py"`（資料匯入與幾何）

## 原始 v0.8 說明

# Ocean Drift Lab v0.8 — 洋流與小鴨漂流實驗室

這是重新建立的**第一階段核心版**。使用 GSHHG 全球真實岸線與獨立海陸遮罩，沒有 OSM/MapLibre 的點擊圖層攔截問題。海洋粒子與小鴨共用相同的 U/V 流場，每隻小鴨**投放後立即自動漂流**，經度在 180° 左右連續。

> **重要資料聲明**：壓縮檔為方便直接測試，附帶的 `data/*.bin` 是**合成的示範流場**，不是 NASA 實測。頁面顯示黃色 `DEMO｜合成示範流場（非 NASA）`。要以真實資料進行研究，必須先下載 NASA OSCAR v2.0 NetCDF 並執行轉檔腳本覆蓋 `data/`。未匯入前請勿用示範路線推論真實漂流位置。

## 啟動

```bash
cd ocean-drift-v0.8
python -m http.server 8000
```

開啟 http://localhost:8000 。可直接部署到 GitHub Pages（含 `index.html`, `main.js`, `style.css`, `geo/`, `data/`）。不需 Token、不需 CDN，也不需 3D 小鴨模型。

## 主要控制

- 點海洋：投放黃色小鴨，小鴨立即自動開始漂流，不需再按開始。
- 拖曳地圖：平移；滑鼠滾輪或手機雙指：縮放；拖曳已放的小鴨可改變起點。
- 月份：觀察 1～12 月流場差異。
- 連續日期模式：自動依「模擬日期的月份」選擇對應月平均流場，並累計漂流天數。**不是逐日真實預報**。
- 粒子數最多 50,000，調整模擬速度（天／秒）和尾跡；暫停、重置粒子。
- 小鴨：在台灣東側投放、一次投放 10 隻、停止／恢復漂流、清除軌跡、移除小鴨、匯出 CSV。
- 只允許洋流資料有效的**海洋**投放：陸地不允許；內陸水體雖有地圖輪廓，但 OSCAR 不提供河湖速度場，所以目前不允許在湖河投放。

## 取得並使用 NASA OSCAR v2.0

資料官方說明：https://podaac.jpl.nasa.gov/dataset/OSCAR_L4_OC_FINAL_V2.0

最新版 OSCAR v2.0 每日 netCDF，海洋速度為公尺／秒（zonal `u`、meridional `v`），空間解析度 0.25°。下載可能需要 NASA Earthdata Login；可使用 PO.DAAC 官方 `podaac-data-downloader`，或官方 Earthdata 搜尋入口。建議先準備**一整年的每日資料**，才能計算完整 12 個月的月平均。

```bash
pip install numpy netCDF4
python process_currents.py --input 'OSCAR/*.nc' --out data --degree 1.0
```

- 轉檔程式使用座標維度名稱識別軸，正確處理 OSCAR v2.0 的 `u(time, longitude, latitude)`，與舊版 OSCAR 格式不同。
- 各月內的每日 U/V 分別平均，**不會補造缺漏值**，缺漏格保留 sentinel 並由模擬器忽略。
- 輸出 `data/01.bin` ... `12.bin` 和 `manifest.json`。刷新網頁後會顯示綠色 `OSCAR｜真實洋流資料`。
- `--degree 0.5` 可提高流場格網精度，但增加網頁下載與計算量；`1.0` 是第一階段兼顧效能的預設。
- 12 個月資料是所提供年份的月平均，不應稱為長期氣候平均；如果提供多個年份才是跨年度樣本月平均。時間模式目前使用各月平均，不是真實逐日時間序列。

**研究限制**：OSCAR 估算海洋上層混合層流速，不等同塑膠小鴨實際速度（尚未考慮風壓與 Stokes drift）。海岸擱淺判定受海陸遮罩 0.25° 格網限制，沿岸及狹窄海峽仍需要更細資料驗證。

## 主要檔案

```
index.html             頁面（含小鴨與粒子控制面板）
style.css              夜視、無地名的 UI
main.js                經緯投影、海水判定、U/V 插值、粒子與小鴨引擎
geo/shorelines.json    GSHHG 中解析度真實岸線（簡化後）
geo/watermask.bin      0.25° 海/陸/內水遮罩（0=海、1=陸、2=內陸水）
data/manifest.json     流場來源／維度／月份資料說明
data/01.bin..12.bin    U/V 每月流速；int16 毫米/秒；-32768 表示無資料
process_currents.py    從 OSCAR NetCDF 產製真正的 12 個月流速
make_demo_data.py      清楚標示的示範資料產生器
build_geography.py     重新從 GSHHG/BaseMap 產製地理資料（可選）
tests/                 靜態與 UI 事件測試腳本
ATTRIBUTION.md         資料來源與授權
```

## 後續版本

本版先穩固真實地理資料、洋流資料讀取、放鴨事件與海洋遮罩。**尚未實作 Nullschool 的正射 3D 地球投影**，後續再做地球儀／平面切換、流速色階及更細的日期資料。這樣不會讓 3D 視覺框架妨礙核心漂流功能除錯。
