#!/usr/bin/env python3
"""
process_currents.py
將 NASA OSCAR NetCDF 洋流檔轉為每月一個 JSON（u/v 速度場）。

需求：
  pip install netCDF4 numpy

使用：
  將本檔與 OSCAR NetCDF 檔置於同資料夾（例如 oscar_vel2019.nc）
  python process_currents.py --nc oscar_vel2019.nc --out data --dlon 2.0 --dlat 2.0

輸出 JSON schema（小端扁平陣列）：
  {
    "lon0": -180, "lat0": -85, "dLon": 2.0, "dLat": 2.0,
    "nLon": 180, "nLat": 85,
    "u": [...],  # 長度 = nLon*nLat，依 j(row) 再 i(col) 排
    "v": [...]
  }
"""
import argparse, os, json
import numpy as np
from netCDF4 import Dataset

def regrid_uv(lon_in, lat_in, u_in, v_in, dLon=2.0, dLat=2.0):
    lon0, lat0 = -180.0, -85.0
    nLon = int(round(360.0/dLon))
    nLat = int(round(170.0/dLat)) + 1
    lon_grid = lon0 + np.arange(nLon)*dLon
    lat_grid = lat0 + np.arange(nLat)*dLat

    # 簡單雙線性插值（可用更高級方法）
    def interp2(x, y, Z, xi, yi):
        # 假設 x=經度遞增、y=緯度遞增
        i = np.searchsorted(x, xi) - 1
        j = np.searchsorted(y, yi) - 1
        i = np.clip(i, 0, len(x)-2)
        j = np.clip(j, 0, len(y)-2)
        x0, x1 = x[i], x[i+1]
        y0, y1 = y[j], y[j+1]
        tx = (xi - x0) / (x1 - x0 + 1e-9)
        ty = (yi - y0) / (y1 - y0 + 1e-9)
        z00 = Z[j, i]
        z10 = Z[j, i+1]
        z01 = Z[j+1, i]
        z11 = Z[j+1, i+1]
        z0 = z00*(1-tx)+z10*tx
        z1 = z01*(1-tx)+z11*tx
        return z0*(1-ty)+z1*ty

    U = np.zeros((nLat, nLon), dtype=np.float32)
    V = np.zeros((nLat, nLon), dtype=np.float32)
    for jj, b in enumerate(lat_grid):
        for ii, L in enumerate(lon_grid):
            # 經度包裝到 0..360 或 -180..180 視實際資料而定
            Li = L
            # 若資料 lon_in 0..360，調整 Li
            if lon_in.min() >= 0 and lon_in.max() > 180:
                Li = (L + 360.0) % 360.0
            U[jj, ii] = interp2(lon_in, lat_in, u_in, Li, b)
            V[jj, ii] = interp2(lon_in, lat_in, v_in, Li, b)
    return lon0, lat0, dLon, dLat, U, V

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--nc", required=True, help="OSCAR NetCDF 檔案路徑")
    ap.add_argument("--out", default="data", help="輸出資料夾（預設 data）")
    ap.add_argument("--dlon", type=float, default=2.0)
    ap.add_argument("--dlat", type=float, default=2.0)
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)

    ds = Dataset(args.nc)
    # 根據 OSCAR 檔案變數命名調整（通常為 'u', 'v', 'lat', 'lon', 'time'）
    u_all = ds.variables['u']  # [time, lat, lon]
    v_all = ds.variables['v']
    lat_in = ds.variables['lat'][:]
    lon_in = ds.variables['lon'][:]
    time_dim = u_all.shape[0]
    months = min(12, time_dim)

    for m in range(months):
        u_in = u_all[m,:,:]
        v_in = v_all[m,:,:]
        lon0, lat0, dLon, dLat, U, V = regrid_uv(lon_in, lat_in, u_in, v_in, args.dlon, args.dlat)
        out = {
            "lon0": lon0, "lat0": lat0, "dLon": dLon, "dLat": dLat,
            "nLon": U.shape[1], "nLat": U.shape[0],
            "u": U.flatten().tolist(),
            "v": V.flatten().tolist()
        }
        with open(os.path.join(args.out, f"{m+1:02d}.json"), "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False)
    print(f"完成：輸出 {months} 個月份到 {args.out}/")

if __name__ == "__main__":
    main()
