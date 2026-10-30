"""Run: python tests/test_geodata.py"""
from pathlib import Path
import json,struct
import numpy as np
root=Path(__file__).resolve().parents[1]
mask=np.frombuffer((root/'geo/watermask.bin').read_bytes(),dtype='uint8').reshape(720,1440)
assert mask.shape==(720,1440)
def water_kind(lon,lat):
    i=min(1439,max(0,int((((lon+180)%360)/.25))))
    j=min(719,max(0,int((lat+90)/.25)))
    return int(mask[j,i])
assert water_kind(-160,0)==0, 'Pacific must be ocean'
assert water_kind(121,24)==1, 'Taiwan must be land'
assert water_kind(-87,44)==2, 'Michigan must be inland water'
assert water_kind(-60,-3)==1, 'Amazon corridor is land at 0.25° resolution; no invented river water'
assert water_kind(-179.7,0)==0 and water_kind(179.7,0)==0, 'antimeridian ocean on both sides'
shores=json.loads((root/'geo/shorelines.json').read_text())
assert len(shores['land'])>1000
for m in range(1,13):
    blob=(root/'data'/f'{m:02d}.bin').read_bytes()
    assert len(blob)==360*180*4, f'Month {m} size mismatch'
    a=np.frombuffer(blob,dtype='<i2').reshape(180,360,2)
    assert int(a[100,20,0]) != -32768, 'Open ocean demo current should be available'
manifest=json.loads((root/'data/manifest.json').read_text())
assert manifest['synthetic'] is True, 'Must never present demo as measured OSCAR'
print('PASS: GSHHG mask, global wrap, 12 months, coastline, data source integrity')
