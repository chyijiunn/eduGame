#!/usr/bin/env python3
"""Import authentic NASA/ESR OSCAR v2.0 netCDF daily currents.

Install: pip install numpy netCDF4
Example: python process_currents.py --input 'oscar_currents_*.nc' --out data

Input variable dimensions: OSCAR v2 uses u(time, longitude, latitude),
not the (time, lat, lon) order of older processors. This importer uses
variable.dimensions and coordinate names to identify axes, including lon/lat.

Creates 12 *monthly means of supplied days*, NOT daily trajectories. Provide
at least one complete calendar year to get all months. Source NaNs are retained.
Binary format: interleaved little-endian int16(u_mms, v_mms) for each grid cell,
lat-major [j][i], sentinel -32768 for missing values. 1 step = 0.001 m/s.
"""
import argparse, glob, json
from datetime import datetime
from pathlib import Path
import numpy as np

SENTINEL=-32768

def day_month(nc, it):
    # Primary use: OSCAR files contain a YYYYMMDD in their filename.
    import re
    match=re.search(r'(?:19|20)\d{6}',Path(nc.filepath()).name)
    if match:
        return int(match.group()[4:6])
    from netCDF4 import num2date
    t=nc.variables['time']
    val=num2date(t[it],units=t.units,calendar=getattr(t,'calendar','standard'))
    return int(val.month)

def reorder_velocity(var, t, latkey, lonkey):
    dims=list(var.dimensions)
    # Remove time and singleton auxiliary dimensions by indexing.
    index=[]
    kept=[]
    for axis,d in enumerate(dims):
        if d.lower() in ('time',): index.append(t)
        elif d==latkey or d==lonkey: index.append(slice(None));kept.append(d)
        elif len(var.get_dims()[axis])==1: index.append(0)
        else: raise ValueError(f'Unsupported dimension {d!r} in {var.name}: {dims}')
    value=np.ma.asarray(var[tuple(index)],dtype=np.float64)
    if tuple(kept)==(lonkey,latkey): value=value.T
    elif tuple(kept)!=(latkey,lonkey):
        raise ValueError(f'Cannot identify lat/lon in {var.name} dims={dims}')
    return np.asarray(value.filled(np.nan),dtype=np.float64)

def coord_var(nc, preferred, candidates):
    for key in candidates:
        if key in nc.variables and len(nc.variables[key].dimensions)==1:
            return key,np.asarray(nc.variables[key][:],dtype=float)
    raise KeyError(f'Missing {preferred} coordinate; tried {candidates}')

def load_gridded(nc,t,grid_lons,grid_lats):
    latkey,lats=coord_var(nc,'latitude',['lat','latitude'])
    lonkey,lons=coord_var(nc,'longitude',['lon','longitude'])
    # NetCDF variable names ('lat') need not match dimension names ('latitude').
    latdim=nc.variables[latkey].dimensions[0]
    londim=nc.variables[lonkey].dimensions[0]
    u=reorder_velocity(nc.variables['u'],t,latdim,londim)
    v=reorder_velocity(nc.variables['v'],t,latdim,londim)
    if lats[0]>lats[-1]:
        lats=lats[::-1]; u=u[::-1,:];v=v[::-1,:]
    # Sort wrap-aware OSCAR longitudes: 0..359.75 or -180..179.75.
    lons=np.mod(lons,360.0)
    order=np.argsort(lons)
    lons=lons[order];u=u[:,order];v=v[:,order]
    # For the regular OSCAR 0.25 deg grid, nearest native cell sampled to
    # target 1 deg center. Invalid nearshore cells remain missing (NaN).
    ti=np.abs(((grid_lons[:,None]%360-lons[None,:]+180)%360)-180).argmin(axis=1)
    tj=np.abs(grid_lats[:,None]-lats[None,:]).argmin(axis=1)
    return u[np.ix_(tj,ti)], v[np.ix_(tj,ti)]

def write_monthly(input_files, out_dir, degree=1.0):
    from netCDF4 import Dataset
    out=Path(out_dir);out.mkdir(parents=True,exist_ok=True)
    nLon=int(round(360/degree));nLat=int(round(180/degree))
    lon0=-180+degree/2;lat0=-90+degree/2
    lons=lon0+np.arange(nLon)*degree
    lats=lat0+np.arange(nLat)*degree
    sums=np.zeros((12,2,nLat,nLon),dtype=np.float64)
    counts=np.zeros((12,2,nLat,nLon),dtype=np.uint32)
    dates=[0]*12
    for file in input_files:
        with Dataset(str(file)) as nc:
            ntime=nc.variables['u'].shape[0] if nc.variables['u'].dimensions[0].lower()=='time' else 1
            for t in range(ntime):
                month=day_month(nc,t)-1
                if not 0<=month<12: raise ValueError('Month out of range')
                u,v=load_gridded(nc,t,lons,lats)
                for channel,a in enumerate((u,v)):
                    good=np.isfinite(a)&(np.abs(a)<20)
                    sums[month,channel][good]+=a[good]
                    counts[month,channel][good]+=1
                dates[month]+=1
        print(f'Processed {file}',flush=True)
    for month in range(12):
        arr=np.empty((nLat,nLon,2),dtype=np.int16)
        for c in range(2):
            with np.errstate(divide='ignore',invalid='ignore'):
                avg=sums[month,c]/counts[month,c]
            valid=(counts[month,c]>0)&np.isfinite(avg)
            arr[:,:,c].fill(SENTINEL)
            arr[:,:,c][valid]=np.clip(np.rint(avg[valid]*1000),-32767,32767).astype('<i2')
        (out/f'{month+1:02d}.bin').write_bytes(arr.astype('<i2').tobytes())
    manifest={
        'format':'ocean-drift-uv-int16-v1','source':'NASA/ESR OSCAR v2.0 — supplied NetCDF monthly mean',
        'synthetic':False,'citation':'https://doi.org/10.5067/OSCAR-25F20',
        'lon0':float(lon0),'lat0':float(lat0),'dLon':float(degree),'dLat':float(degree),
        'nLon':nLon,'nLat':nLat,'scale':0.001,'missing':SENTINEL,
        'monthSampleDays':dates,
        'description':'12 calendar-month averages of the supplied daily netCDF input. Not a dated forecast.'
    }
    (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Wrote monthly velocities:',out,'month counts:',dates)

if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--input',required=True,help='Glob for daily OSCAR NetCDF, e.g. "OSCAR/*.nc"')
    ap.add_argument('--out',default='data')
    ap.add_argument('--degree',type=float,choices=[0.5,1.0,2.0],default=1.0)
    a=ap.parse_args()
    files=sorted(glob.glob(a.input))
    if not files:ap.error('No .nc files match --input. NASA Earthdata login may be required to download.')
    write_monthly(files,a.out,a.degree)
