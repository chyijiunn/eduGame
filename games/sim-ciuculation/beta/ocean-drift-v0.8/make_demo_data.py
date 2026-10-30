"""Development-only illustration. DO NOT label this as NASA measured data.
The frontend shows an explicit SIMULATED banner until real OSCAR is imported.
"""
from pathlib import Path
import json, math
import numpy as np
ROOT=Path(__file__).parent
mask=np.frombuffer((ROOT/'geo'/'watermask.bin').read_bytes(),dtype='uint8').reshape(720,1440)
deg=1.0
lons=np.arange(-179.5,180,deg)
lats=np.arange(-89.5,90,deg)
LO,LA=np.meshgrid(lons,lats)
# Mask at 0.25° cell center -179.875,-89.875
ix=np.clip(np.round((LO+179.875)/0.25).astype(int),0,1439)
iy=np.clip(np.round((LA+89.875)/0.25).astype(int),0,719)
sea=mask[iy,ix]==0

def bump(x,y,cx,cy,sx,sy):
    dx=((x-cx+180)%360-180)/sx
    dy=(y-cy)/sy
    return np.exp(-0.5*(dx*dx+dy*dy))

def gyre(u,v,cx,cy,sx,sy,rate,clockwise):
    w=bump(LO,LA,cx,cy,sx,sy)
    # circulation: clockwise at northern lat -> east on northern side
    u += clockwise*(LA-cy)/sy*w*rate
    v -= clockwise*(((LO-cx+180)%360)-180)/sx*w*rate

def make(month):
    u=np.zeros_like(LO);v=np.zeros_like(LO)
    # Major gyres, cyclonic subpolar and circumpolar currents
    gyre(u,v,-155,32,45,19,0.66,1)
    gyre(u,v,-161,52,32,13,0.24,-1)
    gyre(u,v,-132,-33,38,19,0.48,-1)
    gyre(u,v,-45,31,27,17,0.62,1)
    gyre(u,v,-38,-33,27,19,0.45,-1)
    gyre(u,v,76,-35,35,20,0.62,-1)
    u+=0.50*np.exp(-0.5*((LA+56)/6)**2)
    # Equatorial currents, everywhere with basin weighting
    p=bump(LO,LA,180,0,75,45)+bump(LO,LA,-150,0,70,45)
    atl=bump(LO,LA,-34,0,38,30)
    u+=-0.33*np.exp(-0.5*((LA-14)/5)**2)*(p+atl)
    u+=0.30*np.exp(-0.5*((LA-6)/2.8)**2)*(p+atl)
    u+=-0.25*np.exp(-0.5*((LA+12)/6)**2)*(p+atl)
    # Kuroshio / Gulf stream
    u+=0.36*bump(LO,LA,126,27,6,8);v+=0.48*bump(LO,LA,123,24,5,8)
    u+=0.55*bump(LO,LA,-75,34,10,7);v+=0.26*bump(LO,LA,-78,31,8,8)
    # Seasonal switching: southwest summer monsoon vs northeast winter
    monsoon=math.cos(2*math.pi*(month-7)/12)
    u+=monsoon*0.62*bump(LO,LA,62,11,15,7)
    v+=monsoon*0.60*bump(LO,LA,52,8,8,9)
    u+=monsoon*0.40*bump(LO,LA,87,9,14,9)
    u+=monsoon*0.43*bump(LO,LA,76,0,18,4)
    u+=-0.35*bump(LO,LA,75,-15,35,7)
    # Small seasonal change to gyres; no months are identical
    factor=1+0.19*math.cos(2*math.pi*(month-1)/12)
    u*=factor;v*=factor
    u[~sea]=np.nan;v[~sea]=np.nan
    arr=np.empty((180,360,2),dtype='<i2')
    for k,a in enumerate((u,v)):
        arr[:,:,k]=np.where(np.isfinite(a),np.clip(np.rint(np.nan_to_num(a)*1000),-32767,32767),-32768)
    (ROOT/'data'/f'{month:02d}.bin').write_bytes(arr.tobytes())

for month in range(1,13):make(month)
manifest={'format':'ocean-drift-uv-int16-v1','source':'DEMO SYNTHETIC — illustrative gyres/monsoons, NOT OSCAR',
    'synthetic':True,'lon0':-179.5,'lat0':-89.5,'dLon':1.0,'dLat':1.0,
    'nLon':360,'nLat':180,'scale':0.001,'missing':-32768,'monthSampleDays':[0]*12,
    'description':'Illustrative currents only. Replace with real NASA OSCAR via process_currents.py.'}
(ROOT/'data'/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('demo data written, 12 months')
