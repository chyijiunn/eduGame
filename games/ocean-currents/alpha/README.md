# 全球洋流互動地圖（2D MapLibre／3D Cesium）

這個專案可以**不需金鑰**直接用 2D 地圖跑粒子，也可以選擇貼上 Cesium Ion Token 用 3D 球體顯示。

## 檔案結構
```
ocean-currents-globe/
  ├─ index.html          # 主頁：2D/3D 模式切換
  ├─ main.js             # 邏輯：載入 12 個月份 JSON、粒子/小鴨動畫
  ├─ process_currents.py # 將 NetCDF 轉為每月 JSON（使用 netCDF4, numpy）
  ├─ RubberDuck.glb      # 3D 模式的鴨子（示例為簡易黃方塊，請自行替換）
  ├─ assets/
  │   └─ duck.png        # 2D 鴨子圖示
  └─ data/               # 12 個月份 JSON（已放入示例資料，可直接跑）
```

## 立即執行（2D 模式，免金鑰）
```bash
cd ocean-currents-globe
python -m http.server
# 瀏覽 http://localhost:8000
```
> 2D 模式使用 OSM raster 瓦片，不需金鑰。若需離線，請將底圖改為你自己的本地瓦片或靜態圖。

## 3D 模式（可選）
1. 申請 Cesium Ion 帳號，取得 Access Token。
2. 打開 `main.js`，將 `const CESIUM_ION_TOKEN = ""` 改成你的 Token 字串。
3. 重新整理頁面，按「3D Cesium」即可啟動（鴨子為 `RubberDuck.glb`）。

## 用 NASA OSCAR 資料重建 12 個 JSON
1. 安裝：`pip install netCDF4 numpy`
2. 下載 OSCAR NetCDF（例如 `oscar_velYYYY.nc`）。
3. 執行：
```bash
python process_currents.py --nc oscar_vel2019.nc --out data --dlon 2.0 --dlat 2.0
```
完成後會覆寫 `data/01.json ~ 12.json`。

## JSON 結構
```json
{
  "lon0": -180, "lat0": -85,
  "dLon": 2.0, "dLat": 2.0,
  "nLon": 180, "nLat": 85,
  "u": [ ... nLon*nLat ... ],
  "v": [ ... nLon*nLat ... ]
}
```
採「先 j(緯度) 再 i(經度)」的 row-major，以雙線性插值採樣。

## 小鴨
- 2D 模式：用 `assets/duck.png` 當 Billboard。
- 3D 模式：`RubberDuck.glb`（此為示例 **黃方塊**，請替換成你自己的小鴨模型）

## 授權
- OSM Tiles 由 `https://tile.openstreetmap.org/{z}/{x}/{y}.png` 提供，請遵守其使用條款。
