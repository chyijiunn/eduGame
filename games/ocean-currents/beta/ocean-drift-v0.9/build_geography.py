"""Offline generator for GSHHG medium-resolution shorelines and its land/water mask.
Requires: basemap, shapely, numpy. Generated files are included in the ZIP;
this script is only needed to regenerate them.
Original data: GSHHG by Wessel and Smith, LGPL. See ATTRIBUTION.md.
"""
import json
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon
from mpl_toolkits.basemap import Basemap, _readlsmask

HERE=Path(__file__).resolve().parent
m=Basemap(projection='cyl',llcrnrlat=-85,urcrnrlat=85,llcrnrlon=-180,urcrnrlon=180,resolution='i')

def convert(polys):
    out=[]
    for poly in polys:
        pts=np.asarray(poly.get_coords())
        if len(pts)<3:continue
        try:
            geom=Polygon(pts).simplify(0.022,preserve_topology=True)
            if geom.is_empty:continue
            pts=np.asarray(geom.exterior.coords)
        except Exception:pass
        if len(pts)<3:continue
        # Polygon data is clipped at the antimeridian by Basemap.
        out.append([int(round(v*1000)) for p in pts for v in p])
    return out

shapes={'scale':1000,'land':convert(m.landpolygons),'lakes':convert(m.lakepolygons),'source':'GSHHG intermediate coastline via Basemap'}
(HERE/'geo'/'shorelines.json').write_text(json.dumps(shapes,separators=(',',':')),encoding='utf-8')
print('coast polygons',len(shapes['land']),len(shapes['lakes']))

# GSHHG mask codes: 0 ocean, 1 land, 2 inland water. 0.25° centers.
lons,lats,mask=_readlsmask(lakes=False,resolution='i',grid=10)
out_lon=-179.875+np.arange(1440)*0.25
out_lat=-89.875+np.arange(720)*0.25
ix=np.clip(np.round((out_lon-float(lons[0]))/(float(lons[-1])-float(lons[0]))*(len(lons)-1)).astype(int),0,len(lons)-1)
iy=np.clip(np.round((out_lat-float(lats[0]))/(float(lats[-1])-float(lats[0]))*(len(lats)-1)).astype(int),0,len(lats)-1)
sampled=mask[np.ix_(iy,ix)].astype('uint8')
(HERE/'geo'/'watermask.bin').write_bytes(sampled.tobytes())
print('mask ocean/land/inland',np.unique(sampled,return_counts=True))
