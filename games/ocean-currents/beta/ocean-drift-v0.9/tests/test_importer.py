"""Test OSCAR v2 longitude-first axis mapping without requiring netCDF4 installed."""
from pathlib import Path
import sys
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from process_currents import load_gridded
class Dim:
    def __init__(self,n):self.n=n
    def __len__(self):return self.n
class Var:
    def __init__(self,arr,dims):self.a=np.ma.array(arr);self.dimensions=dims;self.name='test'
    def __getitem__(self,index):return self.a[index]
    def get_dims(self):return [Dim(self.a.shape[i]) for i in range(self.a.ndim)]
class NC:
    pass
nc=NC()
# actual v2: coordinate variables named lon/lat, but their dimensions
# are longitude/latitude (not matching the variable names).
lons=np.array([0,90,180,270],float);lats=np.array([-1,0,1],float)
u=np.empty((1,4,3),float);v=np.empty((1,4,3),float)
for i in range(4):
    for j in range(3):u[0,i,j]=i*10+j;v[0,i,j]=i*100+j
nc.variables={'lat':Var(lats,('latitude',)),'lon':Var(lons,('longitude',)),
    'u':Var(u,('time','longitude','latitude')),'v':Var(v,('time','longitude','latitude'))}
U,V=load_gridded(nc,0,np.array([-90,0,90,180],float),np.array([-1,0,1],float))
assert U.shape==(3,4)
assert U[2,0]==32 and V[1,2]==101,(U,V)
print('PASS: official OSCAR v2 time/longitude/latitude dimension reorder')
