// main.js
// 2D：MapLibre（OSM 免金鑰）＋ Canvas 粒子
// 3D：Cesium（可選；需 CESIUM_ION_TOKEN）
const CESIUM_ION_TOKEN = ""; // ← 若要 3D，貼上你的 Cesium Ion Token

const MONTHS = Array.from({length:12}, (_,i)=> String(i+1).padStart(2,'0'));

class CurrentsField{
  constructor(){ this.loaded = {}; this.grid = null; this.month = 7; }
  async loadMonth(m){
    const key = String(m).padStart(2,'0');
    if(this.loaded[key]){ this.grid = this.loaded[key]; return; }
    const res = await fetch(`data/${key}.json`);
    if(!res.ok) throw new Error(`無法載入 data/${key}.json`);
    const js = await res.json();
    this.loaded[key]=js; this.grid=js;
  }
  sample(lon,lat){
    const g=this.grid; if(!g) return [0,0];
    const {lon0,lat0,dLon,dLat,nLon,nLat,u,v} = g;
    // wrap
    let fx=(lon - lon0)/dLon; let fy=(lat - lat0)/dLat;
    if(fx<0) fx += Math.ceil(-fx/nLon)*nLon; fx = fx % nLon;
    fx = Math.max(0, Math.min(nLon-1-1e-6, fx));
    fy = Math.max(0, Math.min(nLat-1-1e-6, fy));
    const i0 = Math.floor(fx), j0=Math.floor(fy);
    const i1 = (i0+1)%nLon; const j1 = Math.min(j0+1, nLat-1);
    const tx=fx-i0, ty=fy-j0;
    const idx = (ii,jj)=> jj*nLon + (ii % nLon);
    const u00=u[idx(i0,j0)], v00=v[idx(i0,j0)];
    const u10=u[idx(i1,j0)], v10=v[idx(i1,j0)];
    const u01=u[idx(i0,j1)], v01=v[idx(i0,j1)];
    const u11=u[idx(i1,j1)], v11=v[idx(i1,j1)];
    const uu = (u00*(1-tx)+u10*tx)*(1-ty) + (u01*(1-tx)+u11*tx)*ty;
    const vv = (v00*(1-tx)+v10*tx)*(1-ty) + (v01*(1-tx)+v11*tx)*ty;
    return [uu, vv];
  }
}

class Particles{
  constructor(N, field){ this.N=N; this.field=field; this.p=[]; this.init(); }
  init(){ this.p.length=0; for(let i=0;i<this.N;i++) this.p.push(this.randWaterParticle()); }
  randWaterParticle(){
    for(let k=0;k<2000;k++){
      const lon=(Math.random()*360-180), lat=(Math.random()*170-85);
      if(isWaterCoord(lon,lat)) return {lon,lat,life: 300+Math.random()*400};
    }
    return {lon:0,lat:0,life:400};
  }
  step(dt, month){
    for(const q of this.p){
      const [u,v]=this.field.sample(q.lon,q.lat);
      const nx = wrapLon(q.lon + u*dt), ny = clamp(q.lat + v*dt, -85,85);
      if(isWaterCoord(nx,ny)) { q.lon=nx; q.lat=ny; } else { Object.assign(q, this.randWaterParticle()); }
      q.life -= 1; if(q.life<=0 || Math.random()<0.002) Object.assign(q, this.randWaterParticle());
    }
  }
}

class Ducks{
  constructor(){ this.items=[]; }
  add(lon,lat){ this.items.push({lon,lat,trail:[],following:false,drag:false}); }
  clear(){ this.items.length=0; }
  step(dt, month, field){ for(const d of this.items){ if(d.following && !d.drag){ const [u,v]=field.sample(d.lon,d.lat); const nx=wrapLon(d.lon + u*dt), ny=clamp(d.lat + v*dt, -85,85); if(isWaterCoord(nx,ny)){ d.lon=nx; d.lat=ny; } else { d.following=false; } } const last=d.trail[d.trail.length-1]; if(!last || Math.hypot(last[0]-d.lon,last[1]-d.lat)>0.02){ d.trail.push([d.lon,d.lat]); if(d.trail.length>1200) d.trail.shift(); } } }
}

function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function wrapLon(l){ return ((l+180)%360+360)%360 - 180; }

// -------- Land/Sea mask (simplified polygons + whitelists + corridors) --------
function pointInPoly(lon, lat, poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i][0], yi=poly[i][1];
    const xj=poly[j][0], yj=poly[j][1];
    const intersect=((yi>lat)!=(yj>lat)) && (lon < (xj-xi)*(lat-yi)/(yj-yi+1e-12)+xi);
    if(intersect) inside=!inside;
  }
  return inside;
}

const LAND_POLYS = {
  north_america: [[-168,72],[-50,72],[-80,8],[-100,15],[-120,50],[-140,55],[-160,66],[-168,72]],
  south_america: [[-82,12],[-35,5],[-54,-56],[-70,-30],[-76,-10],[-82,12]],
  eurasia: [[-10,72],[60,72],[100,70],[130,60],[150,55],[160,50],[150,45],[140,42],[135,38],[130,35],[125,33],[122,31],[120,29],[118,25],[116,22],[114,21],[112,20],[110,18],[108,16],[106,14],[105,12],[104,10],[102,8],[100,6],[75,10],[60,20],[40,25],[20,30],[10,20],[-5,35],[-10,50],[-10,72]],
  africa: [[-17,37],[10,30],[35,28],[51,30],[52,-35],[30,-35],[10,-30],[-5,-20],[-10,0],[-17,37]],
  australia: [[112,-10],[154,-10],[150,-30],[146,-44],[128,-36],[114,-35],[112,-10]],
  greenland: [[-73,83],[-11,83],[-22,60],[-60,60],[-73,83]],
  antarctica: [[-180,-60],[180,-60],[180,-85],[-180,-85],[-180,-60]],
  japan: [[130,32],[131,35],[135,37],[140,39],[141,41],[143,44],[146,43],[145,40],[142,36],[139,34],[135,33],[132,32],[130,32]],
  philippines: [[120,19],[122,18],[124,16],[126,14],[123,12],[122,11],[120,13],[118,15],[120,19]],
  taiwan: [[120.0,25.3],[121.6,25.3],[122.2,24.3],[121.8,23.1],[121.0,22.5],[120.0,23.5],[120.0,25.3]],
  new_guinea: [[131,-2],[142,-4],[150,-6],[151,-9],[145,-10],[136,-7],[132,-5],[131,-2]],
  nz: [[166,-41],[172,-43],[178,-45],[176,-48],[170,-47],[166,-41]]
};

function isLandCoord(lon, lat){
  for(const k in LAND_POLYS){
    if(pointInPoly(lon,lat,LAND_POLYS[k])) return true;
  }
  return false;
}

// lakes / inland seas whitelist (rectangles)
const WATER_BOXES = [
  {name:'Superior', lon1:-92, lon2:-84, lat1:46, lat2:49},
  {name:'Michigan', lon1:-89.5, lon2:-86, lat1:41.5, lat2:45.5},
  {name:'Huron', lon1:-84.8, lon2:-81, lat1:43, lat2:46.6},
  {name:'Erie', lon1:-83.6, lon2:-78, lat1:41, lat2:43.2},
  {name:'Ontario', lon1:-79.9, lon2:-76, lat1:43, lat2:44.7},
  {name:'Caspian', lon1:46, lon2:55, lat1:36, lat2:48},
  {name:'Aral', lon1:58, lon2:64, lat1:42, lat2:47},
  {name:'BlackSea', lon1:27, lon2:42, lat1:40, lat2:47.5},
  {name:'DeadSea', lon1:34.9, lon2:35.7, lat1:31.0, lat2:31.9}
];
function inBox(lon,lat,b){ return lon>=b.lon1 && lon<=b.lon2 && lat>=b.lat1 && lat<=b.lat2; }

// River corridors (polyline + tolerance in degrees)
const CORRIDORS = [
  {name:'Zhuoshui', path:[[121.05,23.48],[120.88,23.64],[120.70,23.75],[120.53,23.82],[120.45,23.90],[120.33,23.85],[120.24,23.85]], tol:0.10},
  {name:'Tamsui', path:[[121.45,25.17],[121.42,25.13],[121.40,25.11],[121.38,25.09],[121.30,25.09]], tol:0.02},
  {name:'Amazon', path:[[-50,-1.0],[-55,-1.5],[-60,-3.0],[-65,-3.8],[-70,-4.2],[-73,-4.2]], tol:0.60},
  {name:'Yangtze', path:[[121,31],[118,31],[115,30.6],[112,30.6],[110,30.7],[107,30.8],[105,30.7],[103,30.7],[101,30.7],[99.5,30.6]], tol:0.12},
  {name:'Mississippi', path:[[-90,29],[-91,31],[-92,33],[-92,36],[-91,39],[-90,41]], tol:0.12},
  {name:'Nile', path:[[31,30],[30,27],[31,24],[32,20],[32,15],[31,10],[31,5],[31,1]], tol:0.12}
];
function distToSeg(px,py, ax,ay, bx,by){
  const vx=bx-ax, vy=by-ay, wx=px-ax, wy=py-ay;
  const c1=wx*vx+wy*vy; if(c1<=0) return Math.hypot(px-ax,py-ay);
  const c2=vx*vx+vy*vy; if(c2<=0) return Math.hypot(px-ax,py-ay);
  const t=c1/c2; if(t>=1) return Math.hypot(px-bx,py-by);
  const cx=ax+t*vx, cy=ay+t*vy; return Math.hypot(px-cx,py-cy);
}
function nearCorridor(lon,lat, path, tol){
  for(let i=1;i<path.length;i++){
    if(distToSeg(lon,lat, path[i-1][0],path[i-1][1], path[i][0],path[i][1]) <= tol) return true;
  }
  return false;
}
function nearAnyCorridor(lon,lat){
  for(const c of CORRIDORS){ if(nearCorridor(lon,lat,c.path,c.tol)) return true; }
  return false;
}

// Master water check
function isWaterCoord(lon,lat){
  if(!isLandCoord(lon,lat)) return true;            // ocean
  for(const b of WATER_BOXES){ if(inBox(lon,lat,b)) return true; }  // inland seas/lakes
  if(nearAnyCorridor(lon,lat)) return true;         // river corridors
  return false;
}


// ------------------------- 2D MapLibre -------------------------
class MapLibreRenderer{
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.map = null;
  }
  async init(){
    // Night style with OSM raster tiles (no key)
    this.map = new maplibregl.Map({
      container: document.getElementById('map'),
      style: {
        "version": 8,
        "sources": {
          "osm": {
            "type":"raster",
            "tiles":["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            "tileSize":256,
            "attribution":"© OpenStreetMap"
          }
        },
        "layers": [
          {"id":"bg","type":"background","paint":{"background-color":"#050b16"}},
          {"id":"osm","type":"raster","source":"osm","minzoom":0,"maxzoom":19},
          // dark overlay
          {"id":"shade","type":"background","paint":{"background-color":"#000000","background-opacity":0.15}}
        ]
      },
      center: [130,22], zoom: 3.5
    });
    await new Promise(res=> this.map.on('load', res));
    const resize = ()=>{
      const r = Math.min(2, window.devicePixelRatio||1);
      this.canvas.width = Math.round(this.map.getContainer().clientWidth * r);
      this.canvas.height = Math.round(this.map.getContainer().clientHeight * r);
      this.canvas.style.width = this.map.getContainer().clientWidth+'px';
      this.canvas.style.height = this.map.getContainer().clientHeight+'px';
      this.ctx.setTransform(r,0,0,r,0,0);
    };
    this.map.on('resize', resize); resize();
  }
  project(lon,lat){
    const p = this.map.project([lon,lat]); return {x:p.x, y:p.y};
  }
  // Visible viewport check
  inView(x,y){ return x>=-50 && y>=-50 && x<=this.canvas.width+50 && y<=this.canvas.height+50; }
}

// ------------------------- 3D Cesium -------------------------
class CesiumRenderer{
  constructor(canvas){
    this.canvas=canvas; this.ctx=canvas.getContext('2d'); this.viewer=null;
  }
  async init(){
    if(!CESIUM_ION_TOKEN){ alert("請先在 main.js 設定 CESIUM_ION_TOKEN 才能使用 3D。"); throw new Error("NO_TOKEN"); }
    Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;
    this.viewer = new Cesium.Viewer('cesiumContainer', {
      terrain: Cesium.Terrain.fromWorldTerrain(),
      baseLayerPicker:true, timeline:false, animation:false
    });
    document.getElementById('cesiumContainer').style.display='block';
    const resize = ()=>{
      const r = Math.min(2, window.devicePixelRatio||1);
      this.canvas.width = Math.round(this.viewer.container.clientWidth * r);
      this.canvas.height = Math.round(this.viewer.container.clientHeight * r);
      this.canvas.style.width = this.viewer.container.clientWidth+'px';
      this.canvas.style.height = this.viewer.container.clientHeight+'px';
      this.ctx.setTransform(r,0,0,r,0,0);
    };
    window.addEventListener('resize', resize); resize();
    // Fly to East Asia view
    this.viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(130,22, 3_000_000) });
  }
  project(lon,lat){
    const c3 = Cesium.Cartesian3.fromDegrees(lon, lat);
    const win = Cesium.SceneTransforms.wgs84ToWindowCoordinates(this.viewer.scene, c3);
    if(!win) return {x:-9999,y:-9999};
    return {x: win.x, y: win.y};
  }
  addDuckEntity(lon,lat){
    this.viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon,lat,0),
      model: { uri: "RubberDuck.glb", scale: 25000 }
    });
  }
}

// ------------------------- App Logic -------------------------
(async function(){
  const overlay = document.getElementById('overlay');
  const ctx = overlay.getContext('2d');
  // Place mode uses overlay to capture clicks so MapLibre doesn't swallow events
  overlay.style.pointerEvents = 'none';
  overlay.style.cursor = 'default';

  const field = new CurrentsField();
  await field.loadMonth(7);

  let mode = "2d";
  let renderer = new MapLibreRenderer(overlay);
  await renderer.init();

  let particles = new Particles(10000, field);
  let ducks = new Ducks();

  const monthEl = document.getElementById('month');
  const mval = document.getElementById('mval');
  const countEl = document.getElementById('count');
  const cval = document.getElementById('cval');
  const speedEl = document.getElementById('speed');
  const sval = document.getElementById('sval');
  const fadeEl = document.getElementById('fade');
  const fval = document.getElementById('fval');

  const placeBtn = document.getElementById('place');
  const dropTWBtn = document.getElementById('dropTW');
  const goBtn = document.getElementById('go');
  const stopBtn = document.getElementById('stop');
  const clearBtn = document.getElementById('clear');
  const removeBtn = document.getElementById('remove');
  const mode2dBtn = document.getElementById('mode2d');
  const mode3dBtn = document.getElementById('mode3d');

  let place=false, play=true;
  placeBtn.onclick=()=>{ place=!place; placeBtn.textContent = "放鴨模式："+(place?"開":"關"); };
  dropTWBtn.onclick=()=>{ ducks.add(123.3,24.0); if(mode==="3d" && renderer.addDuckEntity) renderer.addDuckEntity(123.3,24.0); };
  goBtn.onclick=()=>{ ducks.items.forEach(d=>d.following=true); };
  stopBtn.onclick=()=>{ ducks.items.forEach(d=>d.following=false); };
  clearBtn.onclick=()=>{ ducks.items.forEach(d=>d.trail=[]); };
  removeBtn.onclick=()=>{ ducks.clear(); if(mode==="3d" && renderer.viewer){ renderer.viewer.entities.removeAll(); } };

  monthEl.oninput = async ()=>{ const m=+monthEl.value|0; mval.textContent=m; await field.loadMonth(m); };
  countEl.oninput = ()=>{ const n=+countEl.value|0; cval.textContent=n; particles = new Particles(n, field); };
  speedEl.oninput = ()=>{ sval.textContent = (+speedEl.value).toFixed(1)+"×"; };
  fadeEl.oninput = ()=>{ fval.textContent = (+fadeEl.value).toFixed(2); };

  // Place ducks by click
  overlay.addEventListener('pointerdown', (e)=>{
    if(!place) return;
    const rect = overlay.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    // Inverse project
    if(mode==="2d"){
      const ll = renderer.map.unproject([x,y]);
      if(isWaterCoord(ll.lng, ll.lat)) { ducks.add(ll.lng, ll.lat); }
      else { console.warn('點在陸地上，無法放鴨'); }
    }else if(mode==="3d"){
      // Ray pick to ellipsoid
      const scene = renderer.viewer.scene;
      const pos = new Cesium.Cartesian2(x,y);
      const ray = renderer.viewer.camera.getPickRay(pos);
      const cart = scene.globe.pick(ray, scene);
      if(cart){
        const carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(cart);
        const lon = Cesium.Math.toDegrees(carto.longitude);
        const lat = Cesium.Math.toDegrees(carto.latitude);
        ducks.add(lon,lat);
        renderer.addDuckEntity(lon,lat);
      }
    }
  });

  // Switch modes
  mode2dBtn.onclick = async ()=>{
    mode="2d";
    document.getElementById('cesiumContainer').style.display='none';
    if(renderer.viewer){ /* Cesium present */ }
    renderer = new MapLibreRenderer(overlay);
    await renderer.init();
  };
  mode3dBtn.onclick = async ()=>{
    try{
      mode="3d";
      renderer = new CesiumRenderer(overlay);
      await renderer.init();
      // Add 3D models for existing ducks
      ducks.items.forEach(d=> renderer.addDuckEntity(d.lon,d.lat));
    }catch(err){
      console.warn(err);
      alert("3D 模式初始化失敗，已維持 2D。");
      mode="2d";
      renderer = new MapLibreRenderer(overlay);
      await renderer.init();
    }
  };

  // Draw helpers
  function drawDuck2D(x,y,r=10){
    // Use embedded PNG if present; fallback to vector duck
    const img = drawDuck2D._img;
    if(img && img.complete){
      ctx.drawImage(img, x-r, y-r, r*2, r*2);
      return;
    }
    // vector fallback
    ctx.save();
    ctx.translate(x,y);
    ctx.fillStyle = '#FFD93D';
    ctx.beginPath(); ctx.ellipse(0, 4, r, r*0.7, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-r*0.4, -r*0.2, r*0.45, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#F4A261'; ctx.beginPath();
    ctx.moveTo(-r*0.8, -r*0.25); ctx.quadraticCurveTo(-r*0.3,-r*0.5, 0,-r*0.2); ctx.quadraticCurveTo(-r*0.2,-r*0.1,-r*0.25,0);
    ctx.fill();
    ctx.fillStyle='#0a0a0a'; ctx.beginPath(); ctx.arc(-r*0.55, -r*0.35, r*0.08, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  drawDuck2D._img = new Image(); drawDuck2D._img.src = "assets/duck.png";

  // Main loop
  let last = performance.now();
  function loop(t){
    const dt = 0.09 * (+speedEl.value);
    const dsec = (t-last)/1000; last = t;

    // Fade or clear
    const a = +fadeEl.value;
if(a>0){
  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';
  // Keep a fraction of previous frame (1-a), fade the rest to transparent
  ctx.fillStyle = `rgba(255,255,255,${(1-a).toFixed(3)})`;
  ctx.fillRect(0,0,overlay.width,overlay.height);
  ctx.restore();
} else {
  ctx.clearRect(0,0,overlay.width,overlay.height);
}

    // Step particles & ducks
    particles.step(dt, +monthEl.value|0);
    ducks.step(dt, +monthEl.value|0, field);

    // Draw particles
    ctx.fillStyle = 'rgba(11,61,145,0.95)';
    for(const q of particles.p){
      const P = renderer.project(q.lon,q.lat);
      if(P && P.x===P.x && P.y===P.y) ctx.fillRect(P.x, P.y, 1, 1);
    }

    // Draw duck trails & ducks (2D only; 3D has real models)
    if(mode==="2d"){
      ctx.strokeStyle='rgba(255,230,80,0.9)'; ctx.lineWidth=2;
      for(const d of ducks.items){
        ctx.beginPath();
        for(let i=1;i<d.trail.length;i++){
          const a = renderer.project(d.trail[i-1][0], d.trail[i-1][1]);
          const b = renderer.project(d.trail[i][0], d.trail[i][1]);
          if(i===1) ctx.moveTo(a.x,a.y);
          ctx.lineTo(b.x,b.y);
        }
        ctx.stroke();
        const p = renderer.project(d.lon,d.lat);
        drawDuck2D(p.x,p.y,12);
      }
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
