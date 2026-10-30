/* Unit-style browser harness, no external npm dependencies.
   Run from project root: node tests/test_browser_logic.cjs
   Simulates DOM, Canvas and asynchronous local fetch for logic-level checks.
   The test does not replace a full real-browser visual inspection.
*/
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const registry=new Map();
function el(id){
 if(registry.has(id))return registry.get(id);
 const x={id,style:{},value:'',textContent:'',innerText:'',checked:false,hidden:false,disabled:false,
  events:{},classList:{add(){},remove(){},toggle(){}},
  addEventListener(event,cb){this.events[event]=cb;},
  getBoundingClientRect(){return {left:0,top:0,width:1116,height:900};},
  setPointerCapture(){},releasePointerCapture(){},click(){if(this.onclick)this.onclick();},
  getContext(){if(!this.ctx)this.ctx=new Proxy({}, {get:(target,key)=>{if(key==='canvas')return x;if(!target[key])target[key]=()=>{};return target[key];},set(target,key,val){target[key]=val;return true;}});return this.ctx;}
 };
 registry.set(id,x);return x;
}
const defaults={month:'7',count:'12000',speed:'4',trails:'50',placing:'true',showFlow:'true',simStart:'2025-07-01'};
for(const [k,v]of Object.entries(defaults))el(k).value=v;
el('placing').checked=true;el('showFlow').checked=true;
let frame=null;
const document={getElementById:el,body:{classList:{add(){},remove(){}}},createElement:(tag)=>{if(tag==='canvas'){const c=el('offscreen');const ctx=c.getContext();ctx.createImageData=(w,h)=>({data:new Uint8ClampedArray(w*h*4)});return c;}return {click(){}};}};
const context={console,document,window:{devicePixelRatio:1},Math,Date,Array,Map,Set,Int16Array,Uint8Array,Number,Object,String,Promise,performance,setTimeout,clearTimeout,URL,Blob,
 requestAnimationFrame:cb=>{frame=cb;},
 fetch:async f=>{
  const raw=fs.readFileSync(path.resolve(root,f));
  return {ok:true,status:200,json:async()=>JSON.parse(raw.toString()),arrayBuffer:async()=>raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)};
 }
};
vm.runInNewContext(fs.readFileSync(path.join(root,'main.js'),'utf8'),context,{filename:'main.js'});
(async()=>{
 for(let i=0;i<200;i++){if(el('loading').style.display==='none')break;await new Promise(r=>setTimeout(r,25));}
 assert.equal(el('loading').style.display,'none','data load must finish');
 assert.match(el('tests').textContent,/全部 14 項通過/,'self-tests');
 assert.match(el('dataType').textContent,/DEMO/,'demo disclaimer');
 assert.equal(el('duckCount').textContent,'0 隻');
 const evs=el('objects').events;
 evs.pointerdown({pointerId:1,clientX:586,clientY:450});
 evs.pointerup({pointerId:1,clientX:586,clientY:450});
 assert.equal(el('duckCount').textContent,'1 隻','ocean click should place a duck');
 assert.match(el('duckState').textContent,/1 \/ 0/,'new duck auto-follow');
 // Clicking land must refuse the duck, even while place mode is ON.
 evs.pointerdown({pointerId:2,clientX:558,clientY:450});
 evs.pointerup({pointerId:2,clientX:558,clientY:450});
 assert.equal(el('duckCount').textContent,'1 隻','land click must not place a duck');
 // Dragging while place mode is ON must pan, not accidentally spawn a duck.
 evs.pointerdown({pointerId:3,clientX:600,clientY:600});
 evs.pointermove({pointerId:3,clientX:620,clientY:615});
 evs.pointerup({pointerId:3,clientX:620,clientY:615});
 assert.equal(el('duckCount').textContent,'1 隻','drag pan must not spawn a duck');
 el('dropTaiwan').onclick();
 assert.equal(el('duckCount').textContent,'2 隻','button should add another duck');
 // Switch projection; ducks persist independently of the camera.
 el('flatMode').onclick();
 assert.equal(el('duckCount').textContent,'2 隻','switch to flat does not reset ducks');
 el('globeMode').onclick();
 assert.equal(el('duckCount').textContent,'2 隻','switch to globe does not reset ducks');
 // Out-of-globe click must not place a duck.
 evs.pointerdown({pointerId:4,clientX:0,clientY:0});
 evs.pointerup({pointerId:4,clientX:0,clientY:0});
 assert.equal(el('duckCount').textContent,'2 隻','outside globe not placeable');
 // Advance ~3 real seconds to assert simulation time changes
 for(let i=0;i<180;i++)frame(1000+i*16.67);
 assert.ok(parseFloat(el('daysText').textContent)>5,'simulation time advances');
 el('removeDucks').onclick();
 assert.equal(el('duckCount').textContent,'0 隻','removal clears ducks');
 console.log('PASS: load, field, on-map placement, auto-follow, time, removal');
 process.exit(0);
})().catch(err=>{console.error(err);process.exit(1)});
