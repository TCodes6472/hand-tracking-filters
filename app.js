const video = document.querySelector('#video');
const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d', { alpha: true });
const start = document.querySelector('#start');
const filter = document.querySelector('#filter');
const status = document.querySelector('#status');

let camera = null;
let running = false;
let lastFrameAt = 0;
let lastGoodAt = 0;
const HOLD_MS = 900;
const SMOOTH = 0.72;
const points = { leftThumb:null, leftIndex:null, rightThumb:null, rightIndex:null };
const stable = { leftThumb:null, leftIndex:null, rightThumb:null, rightIndex:null };

const hands = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
hands.setOptions({
  selfieMode: false,
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.48,
  minTrackingConfidence: 0.48
});
hands.onResults(onResults);

function resize(){
  if (!video.videoWidth || !video.videoHeight) return;
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
}
function dist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
function p(lm){ return {x:lm.x*canvas.width,y:lm.y*canvas.height}; }
function smooth(key, next){
  const old = stable[key];
  if (!old) return stable[key] = {...next};
  old.x += (next.x-old.x)*(1-SMOOTH);
  old.y += (next.y-old.y)*(1-SMOOTH);
  return old;
}
function handQuality(lm){
  // Require the two useful tips to be clearly separated from the wrist/palm.
  const palm = Math.max(dist(lm[0], lm[9]), 0.001);
  const thumbReach = dist(lm[4], lm[0]) / palm;
  const indexReach = dist(lm[8], lm[0]) / palm;
  return thumbReach > 0.75 && indexReach > 1.15;
}
function onResults(result){
  resize();
  lastFrameAt = performance.now();
  const found = [];
  for (let i=0;i<(result.multiHandLandmarks||[]).length;i++) {
    const lm = result.multiHandLandmarks[i];
    if (!handQuality(lm)) continue;
    found.push({
      x: (lm[4].x+lm[8].x)/2,
      thumb:p(lm[4]),
      index:p(lm[8])
    });
  }
  found.sort((a,b)=>a.x-b.x);
  if (found.length >= 2) {
    const a=found[0], b=found[found.length-1];
    smooth('leftThumb',a.thumb); smooth('leftIndex',a.index);
    smooth('rightThumb',b.thumb); smooth('rightIndex',b.index);
    lastGoodAt = performance.now();
  }
}

function pointOrNull(key){ return stable[key] && performance.now()-lastGoodAt < HOLD_MS ? stable[key] : null; }
function cornerPoints(){
  const lt=pointOrNull('leftThumb'), li=pointOrNull('leftIndex'), rt=pointOrNull('rightThumb'), ri=pointOrNull('rightIndex');
  if(!lt||!li||!rt||!ri) return null;
  return [li,ri,rt,lt];
}
function draw(){
  resize();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const q=cornerPoints();
  if(q){
    const mode=filter.value;
    const [tl,tr,br,bl]=q;
    drawFrame(tl,tr,br,bl,mode);
  }
  requestAnimationFrame(draw);
}
function drawFrame(tl,tr,br,bl,mode){
  const w=Math.max(1,Math.hypot(tr.x-tl.x,tr.y-tl.y));
  const h=Math.max(1,Math.hypot(bl.x-tl.x,bl.y-tl.y));
  const intensity=Math.min(2,Math.max(.25,w/500));
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(tl.x,tl.y);ctx.lineTo(tr.x,tr.y);ctx.lineTo(br.x,br.y);ctx.lineTo(bl.x,bl.y);ctx.closePath();
  ctx.lineWidth=Math.max(3,7*intensity);
  ctx.strokeStyle=mode==='clean'?'rgba(255,255,255,.95)':'rgba(0,234,255,.95)';
  ctx.shadowBlur=mode==='neon'?28:12; ctx.shadowColor='rgba(0,234,255,.9)'; ctx.stroke();
  ctx.clip();
  if(mode==='glitch'||mode==='prism'){
    const slices=mode==='prism'?16:10;
    for(let i=0;i<slices;i++){
      const y=tl.y+(bl.y-tl.y)*(i/slices);
      const offset=(Math.random()-.5)*22*intensity;
      ctx.fillStyle=i%2?'rgba(255,0,90,.08)':'rgba(0,220,255,.08)';
      ctx.fillRect(tl.x+offset,y,w+Math.abs(offset),Math.max(2,h/slices));
    }
  }
  ctx.restore();
  drawCorner(tl);drawCorner(tr);drawCorner(br);drawCorner(bl);
}
function drawCorner(pt){
  const r=10;
  ctx.save();ctx.beginPath();ctx.arc(pt.x,pt.y,r,0,Math.PI*2);
  ctx.fillStyle='rgba(255,255,255,.95)';ctx.shadowBlur=16;ctx.shadowColor='#00eaff';ctx.fill();ctx.restore();
}

start.onclick=async()=>{
  if(running) return;
  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:60}},audio:false});
    video.srcObject=stream;
    await video.play();
    running=true;start.textContent='Camera Running';status.textContent='Show both thumbs + index fingers';
    camera=new Camera(video,{onFrame:async()=>hands.send({image:video}),width:1280,height:720});
    camera.start();
  }catch(err){ status.textContent='Camera permission or camera unavailable'; console.error(err); }
};
filter.addEventListener('change',()=>{ if(status) status.textContent='Show both thumbs + index fingers'; });
draw();
