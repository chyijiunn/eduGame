'use strict';
/* Ocean Drift Lab v0.8
   One coordinate system, one U/V field, one ocean mask for particles and ducks.
   No MapLibre/Cesium overlay interception. No remote API or token.
   Velocity is in m/s, simulation time in days. Demo source is plainly labeled.
*/
(()=>{
const $=id=>document.getElementById(id);
const base=$('base'), flow=$('flow'), objects=$('objects'), viewport=$('viewport');
const bctx=base.getContext('2d'), fctx=flow.getContext('2d'), octx=objects.getContext('2d');
const els={month:$('month'),count:$('count'),speed:$('speed'),trails:$('trails'),placing:$('placing'),showFlow:$('showFlow'),play:$('play')};
let coast=null,waterMask=null,manifest=null,velocityMonths=[],loaded=false;
let W=1,H=1,dpr=1;
let view={lon:129,lat:21,zoom:6}; // 60 degrees across viewport initially
let particles=[],ducks=[],simDate=Date.UTC(2025,6,1),elapsedDays=0;
let mode='season',currentMonth=7,playing=true,framePrev=0,toastTimer=0;
let pointerEvents=new Map(),draggingDuck=null,draggingMap=false,pointerStart=null,pinch=null;
let frameCount=0;
const PI=Math.PI, RAD=PI/180, DAY=86400;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const wrap=lon=>((lon+180)%360+360)%360-180;
const degPerPx=()=>360/(Math.max(W,1)*view.zoom);
const pxPerDeg=()=>1/degPerPx();
const pixel=lonLat=>({x:W/2+wrap(lonLat.lon-view.lon)*pxPerDeg(),y:H/2+(view.lat-lonLat.lat)*pxPerDeg()});
const pixelRaw=(lon,lat)=>({x:W/2+(lon-view.lon)*pxPerDeg(),y:H/2+(view.lat-lat)*pxPerDeg()});
const screenToGeo=(x,y)=>({lon:wrap(view.lon+(x-W/2)*degPerPx()),lat:clamp(view.lat-(y-H/2)*degPerPx(),-89.5,89.5)});
const worldPx=()=>360*pxPerDeg();
const dtMs=day=>day*DAY*1000;
const fmtMonth=m=>`${m} 月`;
const fmtNum=n=>Number(n).toLocaleString('zh-TW');
function toast(text){const a=$('toast');a.textContent=text;a.style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>{a.style.display='none';},2400);}
function disableLoading(message){$('loading').style.display='none';if(message)toast(message);}
function monthForFrame(){return mode==='date'?new Date(simDate).getUTCMonth()+1:currentMonth;}
function redraw(){if(!loaded)return;drawMap();fctx.clearRect(0,0,W,H);drawDucks();}
function resize(){
 const rect=viewport.getBoundingClientRect();W=Math.max(1,rect.width);H=Math.max(1,rect.height);dpr=Math.min(2,window.devicePixelRatio||1);
 for(const canvas of [base,flow,objects]){
  canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
  canvas.style.width=W+'px';canvas.style.height=H+'px';
  canvas.getContext('2d').setTransform(dpr,0,0,dpr,0,0);
 }
 redraw();if(loaded)seedParticles(+els.count.value);
}
function maskAt(lon,lat){
 if(!waterMask||!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lat)>=90)return 1;
 const i=clamp(Math.floor((wrap(lon)+180)/0.25),0,1439);
 const j=clamp(Math.floor((clamp(lat,-89.999,89.999)+90)/0.25),0,719);
 return waterMask[j*1440+i];
}
const ocean=(lon,lat)=>maskAt(lon,lat)===0;
function sampleVelocity(lon,lat,month){
 if(!manifest||!ocean(lon,lat))return null;
 const raw=velocityMonths[month-1];if(!raw)return null;
 const {lon0,lat0,dLon,dLat,nLon,nLat,scale,missing}=manifest;
 const lonEast=wrap(lon),world=nLon*dLon;
 let fx=((lonEast-lon0)%world+world)%world/dLon;
 let fy=(lat-lat0)/dLat;
 if(fy<0||fy>nLat-1)return null;
 const i0=Math.floor(fx),i1=(i0+1)%nLon,j0=Math.floor(fy),j1=Math.min(j0+1,nLat-1);
 const tx=fx-i0,ty=fy-j0;
 const nodes=[
  [i0,j0,(1-tx)*(1-ty)],[i1,j0,tx*(1-ty)],
  [i0,j1,(1-tx)*ty],[i1,j1,tx*ty]
 ];
 let u=0,v=0,w=0;
 for(const [i,j,weight] of nodes){
  const idx=(j*nLon+i)*2;
  const a=raw[idx],b=raw[idx+1];
  if(a===missing||b===missing||!Number.isFinite(a)||!Number.isFinite(b))continue;
  u+=a*weight;v+=b*weight;w+=weight;
 }
 return w>0.01?[u/w*scale,v/w*scale]:null;
}
// U eastward and V northward in metres per second -> degrees/day at latitude.
function move(lon,lat,days,month,strict){
 const a=sampleVelocity(lon,lat,month);if(!a)return null;
 const midLat=clamp(lat+a[1]*days*DAY/(2*111132),-89.5,89.5);
 const midLon=wrap(lon+a[0]*days*DAY/(2*111320*Math.max(.13,Math.cos(lat*RAD))));
 const b=sampleVelocity(midLon,midLat,month)||a;
 const newLat=clamp(lat+b[1]*days*DAY/111132,-89.5,89.5);
 const newLon=wrap(lon+b[0]*days*DAY/(111320*Math.max(.13,Math.cos(midLat*RAD))));
 if(!ocean(newLon,newLat))return null;
 // Check intermediate locations for coastline crossing, especially ducks.
 if(strict){
  const delta=wrap(newLon-lon);
  const checks=Math.max(2,Math.min(16,Math.ceil(Math.max(Math.abs(delta),Math.abs(newLat-lat))/.12)));
  for(let k=1;k<checks;k++){
   const t=k/checks;
   if(!ocean(wrap(lon+delta*t),lat+(newLat-lat)*t))return null;
  }
 }
 return {lon:newLon,lat:newLat};
}
function newDuck(lon,lat){return {lon,lat,active:true,stranded:false,track:[{lon,lat,day:elapsedDays}],distanceKm:0};}
function addDuck(lon,lat,quiet=false){
 if(!ocean(lon,lat)){if(!quiet)toast(maskAt(lon,lat)===2?'內陸水體尚未有流速資料，請投放在海洋':'這裡是陸地，不能投放小鴨');return false;}
 if(!sampleVelocity(lon,lat,monthForFrame())){if(!quiet)toast('此處目前沒有有效的洋流資料，請換個海域');return false;}
 ducks.push(newDuck(wrap(lon),lat));updateDuckStats();
 if(!quiet)toast(`已投放第 ${ducks.length} 隻小鴨，自動開始漂流`);
 return true;
}
function advanceDucks(days){
 const month=monthForFrame();
 for(const d of ducks){
  if(!d.active)continue;
  // Substeps prevent flying across islands or jumping through coastal land.
  const steps=Math.max(1,Math.min(12,Math.ceil(days/.16)));
  let success=true;
  for(let k=0;k<steps;k++){
   const n=move(d.lon,d.lat,days/steps,month,true);
   if(!n){d.active=false;d.stranded=true;success=false;break;}
   const dl=wrap(n.lon-d.lon);
   d.distanceKm+=Math.hypot(dl*111.32*Math.cos((n.lat+d.lat)/2*RAD),(n.lat-d.lat)*111.13);
   d.lon=n.lon;d.lat=n.lat;
  }
  const tail=d.track[d.track.length-1];
  if(!tail||Math.abs(wrap(d.lon-tail.lon))>0.055||Math.abs(d.lat-tail.lat)>0.055||elapsedDays-tail.day>2){
    d.track.push({lon:d.lon,lat:d.lat,day:elapsedDays});
    if(d.track.length>4800)d.track.shift();
  }
 }
}
function seedParticle(){
 for(let attempt=0;attempt<90;attempt++){
  const x=Math.random()*W,y=Math.random()*H;
  const geo=screenToGeo(x,y);
  if(ocean(geo.lon,geo.lat)&&sampleVelocity(geo.lon,geo.lat,monthForFrame()))return {lon:geo.lon,lat:geo.lat,life:70+Math.random()*400};
 }
 for(let attempt=0;attempt<60;attempt++){
  const lon=wrap(Math.random()*360-180),lat=Math.random()*158-79;
  if(ocean(lon,lat)&&sampleVelocity(lon,lat,monthForFrame()))return {lon,lat,life:90+Math.random()*250};
 }
 return {lon:-160,lat:0,life:10};
}
function seedParticles(count){particles=Array.from({length:count},()=>seedParticle());fctx.clearRect(0,0,W,H);}
function drawMap(){
 if(!coast)return;
 const c=bctx;c.clearRect(0,0,W,H);
 c.fillStyle='#061523';c.fillRect(0,0,W,H);
 const scale=pxPerDeg(),ww=worldPx();
 // Subtle graticule, no location names or roads.
 c.save();c.strokeStyle='rgba(52,93,111,.10)';c.lineWidth=.65;
 c.beginPath();for(let lat=-75;lat<=75;lat+=15){const y=pixelRaw(view.lon,lat).y;c.moveTo(0,y);c.lineTo(W,y)}
 for(let lon=-720;lon<=720;lon+=15){const x=pixelRaw(lon,0).x;if(x>=0&&x<=W){c.moveTo(x,0);c.lineTo(x,H)}}c.stroke();c.restore();
 function renderPolys(list,fill,stroke){
  c.fillStyle=fill;c.strokeStyle=stroke;c.lineWidth=0.75;
  for(const {poly,bounds} of list){
   if(poly.length<6)continue;
   const [lo,hi,latLo,latHi]=bounds;
   const minY=pixelRaw(view.lon,latHi).y,maxY=pixelRaw(view.lon,latLo).y;
   if(minY>H+8||maxY< -8)continue;
   for(let shift=-720;shift<=720;shift+=360){
    const minX=pixelRaw(lo+shift,0).x,maxX=pixelRaw(hi+shift,0).x;
    if(minX>W+8||maxX< -8)continue;
    c.beginPath();
    for(let i=0;i<poly.length;i+=2){
     const x=W/2+(poly[i]/1000+shift-view.lon)*scale;
     const y=H/2+(view.lat-poly[i+1]/1000)*scale;
     if(i===0)c.moveTo(x,y);else c.lineTo(x,y);
    }
    c.closePath();c.fill();c.stroke();
   }
  }
 }
 renderPolys(coast.land,'#172a32','#3b5c62');
 renderPolys(coast.lakes,'#061523','#3b5c62');
 // Latitude/longitude lines in background are intentional; no labels.
}
function fadeFlow(){
 const t=+els.trails.value;
 if(t===0){fctx.clearRect(0,0,W,H);return;}
 // Fade transparent, never paint black on overlay (previous bug).
 fctx.save();fctx.globalCompositeOperation='destination-in';
 fctx.fillStyle=`rgba(255,255,255,${(.40+t*.0056).toFixed(3)})`;
 fctx.fillRect(0,0,W,H);fctx.restore();
}
function drawFlow(days){
 if(!els.showFlow.checked){fctx.clearRect(0,0,W,H);return;}
 fadeFlow();
 const step=Math.max(.00001,days);
 const month=monthForFrame(),ww=worldPx();
 const ctx=fctx;ctx.beginPath();ctx.strokeStyle='rgba(67,180,219,.75)';ctx.lineWidth=0.9;ctx.lineCap='round';
 for(let i=0;i<particles.length;i++){
  let p=particles[i],prevLon=p.lon,prevLat=p.lat;
  const result=move(prevLon,prevLat,step,month,false);
  p.life--;
  if(!result||p.life<0){particles[i]=seedParticle();continue;}
  p.lon=result.lon;p.lat=result.lat;
  const s=pixel({lon:prevLon,lat:prevLat});
  const e={x:s.x+wrap(p.lon-prevLon)*pxPerDeg(),y:s.y-(p.lat-prevLat)*pxPerDeg()};
  // Never draw 360-degree discontinuity. A particle is stored only once.
  if(Math.hypot(e.x-s.x,e.y-s.y)>28)continue;
  for(const shift of [-ww,0,ww]){
   const x=s.x+shift,xe=e.x+shift;
   if(x< -35&&xe< -35||x>W+35&&xe>W+35||e.y<-10||e.y>H+10)continue;
   ctx.moveTo(x,s.y);ctx.lineTo(xe,e.y);
  }
 }
 ctx.stroke();
}
function drawDuckShape(ctx,x,y,active){
 const r=10;ctx.save();ctx.translate(x,y);
 ctx.fillStyle='rgba(2,8,17,.48)';ctx.beginPath();ctx.ellipse(1,8,12,4,0,0,PI*2);ctx.fill();
 ctx.fillStyle=active?'#ffd84a':'#cfb965';ctx.strokeStyle='#715e22';ctx.lineWidth=.65;
 ctx.beginPath();ctx.ellipse(2,1,11,6,0,0,PI*2);ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.arc(-4,-6,6.5,0,PI*2);ctx.fill();ctx.stroke();
 ctx.fillStyle='#ff9243';ctx.beginPath();ctx.moveTo(-9,-5);ctx.lineTo(-17,-2);ctx.lineTo(-8,0);ctx.closePath();ctx.fill();
 ctx.fillStyle='#1a2730';ctx.beginPath();ctx.arc(-6.5,-8,1.25,0,PI*2);ctx.fill();
 ctx.restore();
}
function drawDucks(){
 octx.clearRect(0,0,W,H);
 const ww=worldPx();
 for(let i=0;i<ducks.length;i++){
  const d=ducks[i];
  octx.beginPath();octx.strokeStyle='rgba(255,209,97,.77)';octx.lineWidth=1.6;
  for(let k=1;k<d.track.length;k++){
   const a=d.track[k-1],b=d.track[k];
   const s=pixel(a), e={x:s.x+wrap(b.lon-a.lon)*pxPerDeg(),y:s.y+(a.lat-b.lat)*pxPerDeg()};
   if(Math.abs(e.x-s.x)>100)continue;
   for(const shift of [-ww,0,ww]){
    if(Math.max(s.x+shift,e.x+shift)<-8||Math.min(s.x+shift,e.x+shift)>W+8)continue;
    octx.moveTo(s.x+shift,s.y);octx.lineTo(e.x+shift,e.y);
   }
  }
  octx.stroke();
  const p=pixel(d);
  for(const shift of [-ww,0,ww]){
   const x=p.x+shift;if(x< -24||x>W+24||p.y< -24||p.y>H+24)continue;
   drawDuckShape(octx,x,p.y,d.active);
   octx.font='10px system-ui';octx.textAlign='center';octx.fillStyle='#eadba3';octx.fillText(String(i+1),x,p.y+25);
  }
 }
}
function updateDuckStats(){
 $('duckCount').textContent=`${ducks.length} 隻`;
 const active=ducks.filter(d=>d.active).length;
 $('duckState').textContent=`${active} / ${ducks.length-active}`;
}
function updateTimeText(){
 if(mode==='date'){
  const date=new Date(simDate);
  $('dateText').textContent=date.toISOString().substring(0,10);
  els.month.value=date.getUTCMonth()+1;
  $('monthText').textContent=fmtMonth(+els.month.value);
 }else{
  $('dateText').textContent=fmtMonth(currentMonth)+'平均流場';
 }
 $('daysText').textContent=elapsedDays.toFixed(1)+' 天';
}
function runTests(){
 const tests=[
  ['Pacific is ocean',ocean(-160,0)],
  ['Taiwan is land',maskAt(121,24)===1],
  ['Lake Michigan is inland water',maskAt(-87,44)===2],
  ['Antimeridian wrap',wrap(181)===-179&&wrap(-181)===179],
  ['Near-antimeridian ocean',ocean(-179.7,0)&&ocean(179.7,0)],
  ['Velocity resolves in Taiwan east',!!sampleVelocity(125,23,7)],
  ['U/V exists in Indian Ocean',!!sampleVelocity(65,10,1)&&!!sampleVelocity(65,10,7)],
  ['New duck auto-follow',newDuck(125,23).active],
  ['No duck on Taiwan land',!ocean(121,24)],
  ['Real 12-month data buffers',velocityMonths.length===12]
 ];
 if(manifest.synthetic){const jan=sampleVelocity(62,11,1),jul=sampleVelocity(62,11,7);tests.push(['Demo monsoon reversal',!!jan&&!!jul&&jan[0]*jul[0]<0]);}
 const bad=tests.filter(([,result])=>!result);
 $('tests').textContent=bad.length?`自動測試：${tests.length-bad.length}/${tests.length} 通過\n失敗：${bad.map(x=>x[0]).join('，')}`:`自動測試：全部 ${tests.length} 項通過`;
 $('tests').style.color=bad.length?'#ffa4a4':'#9cdec0';
 if(bad.length)console.warn('Ocean Drift tests failed:',bad);
}
function drawAll(){redraw();updateTimeText();updateDuckStats();}
function getScreenPos(e){const r=objects.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
function duckNear(x,y){const ww=worldPx();for(let i=ducks.length-1;i>=0;i--){const d=ducks[i],p=pixel(d);for(const sh of [-ww,0,ww]){if(Math.hypot(p.x+sh-x,p.y-y)<22)return d;}}return null;}
function changeZoom(factor,x=W/2,y=H/2){
 const before=screenToGeo(x,y),old=view.zoom;
 view.zoom=clamp(view.zoom*factor,1,45);
 if(view.zoom===old)return;
 const after=screenToGeo(x,y);
 view.lon=wrap(view.lon+wrap(before.lon-after.lon));
 view.lat=clamp(view.lat+(before.lat-after.lat),-80,80);
 drawAll();seedParticles(+els.count.value);
}
function pan(dx,dy){view.lon=wrap(view.lon-dx*degPerPx());view.lat=clamp(view.lat+dy*degPerPx(),-80,80);redraw();}
function initEvents(){
 objects.addEventListener('pointerdown',e=>{
  if(!loaded)return;
  const p=getScreenPos(e);pointerEvents.set(e.pointerId,p);
  objects.setPointerCapture(e.pointerId);
  if(pointerEvents.size===1){pointerStart={x:p.x,y:p.y,last:p};draggingMap=false;draggingDuck=duckNear(p.x,p.y);}
  else if(pointerEvents.size===2){const pts=[...pointerEvents.values()];pinch={dist:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),zoom:view.zoom};draggingDuck=null;}
 });
 objects.addEventListener('pointermove',e=>{
  if(!pointerEvents.has(e.pointerId))return;
  const p=getScreenPos(e),old=pointerEvents.get(e.pointerId);
  pointerEvents.set(e.pointerId,p);
  if(pointerEvents.size>=2){
   const pts=[...pointerEvents.values()];const dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
   const midX=(pts[0].x+pts[1].x)/2,midY=(pts[0].y+pts[1].y)/2;
   if(pinch&&pinch.dist>0)changeZoom(clamp(dist/pinch.dist,.7,1.3),midX,midY);
   if(pinch)pinch.dist=dist;
   return;
  }
  if(!pointerStart)return;
  if(Math.hypot(p.x-pointerStart.x,p.y-pointerStart.y)>5)draggingMap=true;
  if(draggingDuck&&draggingMap){
   const geo=screenToGeo(p.x,p.y);
   if(ocean(geo.lon,geo.lat)&&sampleVelocity(geo.lon,geo.lat,monthForFrame())){
    draggingDuck.lon=geo.lon;draggingDuck.lat=geo.lat;
    draggingDuck.active=true;draggingDuck.stranded=false;
    draggingDuck.track=[{lon:geo.lon,lat:geo.lat,day:elapsedDays}];
   }
   drawDucks();return;
  }
  if(draggingMap){pan(p.x-old.x,p.y-old.y);}
 });
 function pointerUp(e){
  if(!pointerEvents.has(e.pointerId))return;
  const p=getScreenPos(e);
  if(pointerEvents.size===1&&pointerStart&&!draggingMap&&!draggingDuck&&els.placing.checked){
   const g=screenToGeo(p.x,p.y);addDuck(g.lon,g.lat);
  }
  pointerEvents.delete(e.pointerId);
  if(pointerEvents.size===0){pointerStart=null;draggingDuck=null;draggingMap=false;pinch=null;updateDuckStats();}
  else if(pointerEvents.size===1){const q=[...pointerEvents.values()][0];pointerStart={x:q.x,y:q.y,last:q};pinch=null;}
 }
 objects.addEventListener('pointerup',pointerUp);
 objects.addEventListener('pointercancel',e=>{pointerEvents.delete(e.pointerId);pointerStart=null;draggingDuck=null;draggingMap=false;pinch=null;});
 objects.addEventListener('wheel',e=>{e.preventDefault();const p=getScreenPos(e);changeZoom(Math.exp(-e.deltaY*.0016),p.x,p.y);},{passive:false});
 $('zoomIn').onclick=()=>changeZoom(1.35);
 $('zoomOut').onclick=()=>changeZoom(1/1.35);
 $('eastAsia').onclick=()=>{view={lon:129,lat:21,zoom:6};drawAll();seedParticles(+els.count.value);};
 $('hidePanel').onclick=()=>{document.body.classList.add('panel-hidden');$('showPanel').hidden=false;setTimeout(resize,30)};
 $('showPanel').onclick=()=>{document.body.classList.remove('panel-hidden');$('showPanel').hidden=true;setTimeout(resize,30)};
 $('seasonMode').onclick=()=>{mode='season';$('seasonMode').classList.add('active');$('dateMode').classList.remove('active');$('dateRow').hidden=true;els.month.disabled=false;drawAll();};
 $('dateMode').onclick=()=>{mode='date';$('dateMode').classList.add('active');$('seasonMode').classList.remove('active');$('dateRow').hidden=false;els.month.disabled=true;simDate=Date.parse($('simStart').value+'T00:00:00Z');drawAll();};
 $('simStart').onchange=()=>{simDate=Date.parse($('simStart').value+'T00:00:00Z');elapsedDays=0;updateTimeText();};
 els.month.oninput=()=>{currentMonth=+els.month.value;$('monthText').textContent=fmtMonth(currentMonth);seedParticles(+els.count.value);updateTimeText();};
 els.count.oninput=()=>{$('countText').textContent=fmtNum(+els.count.value);seedParticles(+els.count.value);};
 els.speed.oninput=()=>{$('speedText').textContent=+els.speed.value+' 天 / 秒';};
 els.trails.oninput=()=>{$('trailsText').textContent=+els.trails.value===0?'關':+els.trails.value<40?'短':+els.trails.value<75?'中':'長';};
 els.showFlow.onchange=()=>{if(!els.showFlow.checked)fctx.clearRect(0,0,W,H);};
 els.placing.onchange=()=>{objects.style.cursor=els.placing.checked?'crosshair':'grab';};
 els.play.onclick=()=>{playing=!playing;els.play.textContent=playing?'暫停模擬':'繼續模擬';};
 $('refreshFlow').onclick=()=>seedParticles(+els.count.value);
 $('dropTaiwan').onclick=()=>addDuck(123.5,24.0);
 $('dropMany').onclick=()=>{let success=0;for(let n=0;n<10;n++){if(addDuck(123.5+(Math.random()-.5)*1.4,24+(Math.random()-.5)*1.4,true))success++;}toast(`已投放 ${success} 隻小鴨，自動開始漂流`);};
 $('resumeDucks').onclick=()=>{ducks.forEach(d=>{if(!d.stranded)d.active=true;});updateDuckStats();};
 $('pauseDucks').onclick=()=>{ducks.forEach(d=>d.active=false);updateDuckStats();};
 $('clearTracks').onclick=()=>{ducks.forEach(d=>d.track=[{lon:d.lon,lat:d.lat,day:elapsedDays}]);drawDucks();};
 $('removeDucks').onclick=()=>{ducks=[];drawDucks();updateDuckStats();};
 $('exportTracks').onclick=()=>{
  const lines=['duck_id,simulation_day,longitude,latitude'];
  for(let i=0;i<ducks.length;i++)for(const p of ducks[i].track)lines.push(`${i+1},${p.day.toFixed(4)},${p.lon.toFixed(6)},${p.lat.toFixed(6)}`);
  const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ocean-drift-ducks.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
}
async function loadData(){
 try{
  const [shores,mask,info]=await Promise.all([
   fetch('geo/shorelines.json').then(r=>{if(!r.ok)throw new Error(`岸線 ${r.status}`);return r.json();}),
   fetch('geo/watermask.bin').then(r=>{if(!r.ok)throw new Error(`海陸遮罩 ${r.status}`);return r.arrayBuffer();}),
   fetch('data/manifest.json').then(r=>{if(!r.ok)throw new Error(`流場說明 ${r.status}`);return r.json();})
  ]);
  // Calculate immutable bounding boxes once; panning must not rescan every vertex.
  const prepare=list=>list.map(poly=>{
   let lo=Infinity,hi=-Infinity,latLo=Infinity,latHi=-Infinity;
   for(let i=0;i<poly.length;i+=2){const lon=poly[i]/1000,lat=poly[i+1]/1000;lo=Math.min(lo,lon);hi=Math.max(hi,lon);latLo=Math.min(latLo,lat);latHi=Math.max(latHi,lat)}
   return {poly,bounds:[lo,hi,latLo,latHi]};
  });
  coast={land:prepare(shores.land),lakes:prepare(shores.lakes)};waterMask=new Uint8Array(mask);manifest=info;
  if(waterMask.length!==720*1440)throw new Error('海陸遮罩檔案大小不符');
  if(info.format!=='ocean-drift-uv-int16-v1')throw new Error('不支援的洋流資料格式');
  velocityMonths=await Promise.all(Array.from({length:12},async(_,i)=>{
   const url=`data/${String(i+1).padStart(2,'0')}.bin`;
   const r=await fetch(url);if(!r.ok)throw new Error(`無法載入 ${url}: ${r.status}`);
   const buff=await r.arrayBuffer();
   if(buff.byteLength!==info.nLon*info.nLat*4)throw new Error(`${url} 大小不符`);
   return new Int16Array(buff);
  }));
  loaded=true;resize();seedParticles(+els.count.value);drawAll();runTests();
  $('dataType').textContent=manifest.synthetic?'DEMO｜合成示範流場（非 NASA）':'OSCAR｜真實洋流資料';
  $('dataType').classList.toggle('demo',!!manifest.synthetic);$('dataType').classList.toggle('real',!manifest.synthetic);
  $('sourceDetail').textContent=`${manifest.source}。${manifest.description}`;
  disableLoading();
  requestAnimationFrame(loop);
 }catch(err){console.error(err);$('loading').textContent=`資料載入失敗：${err.message}。請在專案根目錄執行 python -m http.server 8000；不要直接以 file:// 開啟。`;
  $('tests').textContent='自動測試：尚未執行（資料載入失敗）';}
}
function loop(t){
 const delta=Math.min(.07,Math.max(0,(t-(framePrev||t))/1000));framePrev=t;
 // The slider is simulated days per REAL second; it is not a hidden visual multiplier.
 const days=playing?delta*(+els.speed.value):0;
 if(playing&&days>0){
  elapsedDays+=days;
  if(mode==='date')simDate+=dtMs(days);
  advanceDucks(days);
  drawFlow(days);
 }else if(!els.showFlow.checked){fctx.clearRect(0,0,W,H);}
 drawDucks();
 if(frameCount++%12===0){updateTimeText();updateDuckStats();}
 requestAnimationFrame(loop);
}
initEvents();resize();loadData();
})();
