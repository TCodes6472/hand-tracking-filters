const video=document.querySelector('#video');
const canvas=document.querySelector('#canvas');
const ctx=canvas.getContext('2d');
const start=document.querySelector('#start');
const effect=document.querySelector('#effect');
const intensity=document.querySelector('#intensity');
const pointsToggle=document.querySelector('#points');
const status=document.querySelector('#status');
const hint=document.querySelector('#hint');
let camera=null, running=false, lastTips=[], lastGood=0;

const hands=new Hands({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`});
hands.setOptions({maxNumHands:2,modelComplexity:1,minDetectionConfidence:.62,minTrackingConfidence:.62});
hands.onResults(onResults);

start.onclick=async()=>{
  if(running)return;
  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:false});
    video.srcObject=stream; await video.play(); resize();
    camera=new Camera(video,{onFrame:async()=>hands.send({image:video}),width:1280,height:720});
    camera.start(); running=true; start.textContent='Camera Running'; status.textContent='● Tracking fingertips'; hint.style.display='none';
  }catch(e){status.textContent='● Camera permission denied'; hint.textContent='Camera access is required.';}
};

function resize(){if(video.videoWidth){canvas.width=video.videoWidth;canvas.height=video.videoHeight}}
window.addEventListener('resize',resize);

effect.onchange=()=>{};

function onResults(r){
  resize();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const detected=[];
  for(const lm of (r.multiHandLandmarks||[])){
    // Only these two fingertip landmarks are used: thumb tip (4) + index tip (8).
    detected.push({wrist:toPoint(lm[0]),thumb:toPoint(lm[4]),index:toPoint(lm[8])});
  }
  if(detected.length===2){
    detected.sort((a,b)=>a.wrist.x-b.wrist.x);
    const L=detected[0], R=detected[1];
    const quad=[L.index,R.index,R.thumb,L.thumb];
    lastTips=quad; lastGood=performance.now();
    drawFrame(quad);
    if(pointsToggle.checked) drawPoints(quad);
  }else if(lastTips.length===4 && performance.now()-lastGood<220){
    drawFrame(lastTips); if(pointsToggle.checked) drawPoints(lastTips);
  }
}

function toPoint(p){return{x:p.x*canvas.width,y:p.y*canvas.height}}

function drawFrame(q){
  const pad=3, a=q.map(p=>({x:p.x,y:p.y}));
  const minX=Math.min(...a.map(p=>p.x)),maxX=Math.max(...a.map(p=>p.x));
  const minY=Math.min(...a.map(p=>p.y)),maxY=Math.max(...a.map(p=>p.y));
  if(maxX-minX<20||maxY-minY<20)return;
  ctx.save();
  ctx.beginPath();ctx.moveTo(a[0].x,a[0].y);for(let i=1;i<4;i++)ctx.lineTo(a[i].x,a[i].y);ctx.closePath();ctx.clip();
  // A synthetic animated screen keeps the effect stable instead of recursively capturing itself.
  const t=performance.now()/1000, w=maxX-minX,h=maxY-minY;
  const g=ctx.createLinearGradient(minX,minY,maxX,maxY);g.addColorStop(0,`hsl(${(t*55)%360} 90% 62%)`);g.addColorStop(.45,'#f4f7ff');g.addColorStop(1,`hsl(${(t*55+160)%360} 90% 58%)`);
  ctx.fillStyle=g;ctx.fillRect(minX-pad,minY-pad,w+pad*2,h+pad*2);
  const power=Number(intensity.value)/100;
  const mode=effect.value;
  if(mode==='glitch')glitch(minX,minY,w,h,power,t);
  if(mode==='scan')scanlines(minX,minY,w,h,power);
  if(mode==='prism')prism(minX,minY,w,h,power,t);
  if(mode==='clean')clean(minX,minY,w,h);
  ctx.restore();
  ctx.save();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.shadowBlur=16;ctx.shadowColor='#00eaff';ctx.beginPath();ctx.moveTo(a[0].x,a[0].y);for(let i=1;i<4;i++)ctx.lineTo(a[i].x,a[i].y);ctx.closePath();ctx.stroke();ctx.restore();
}

function glitch(x,y,w,h,p,t){
  const n=Math.max(7,Math.floor(14*p));
  for(let i=0;i<n;i++){
    const yy=y+Math.random()*h, hh=1+Math.random()*Math.max(2,h*.055), shift=(Math.random()-.5)*w*.28*p;
    ctx.globalAlpha=.25+.55*Math.random();ctx.fillStyle=i%3===0?'#00ffff':i%3===1?'#ff2bd6':'#111';ctx.fillRect(x+shift,yy,w*(.15+.85*Math.random()),hh);
  }
  ctx.globalAlpha=.7;ctx.fillStyle='#fff';ctx.font=`bold ${Math.max(12,h*.12)}px system-ui`;ctx.fillText('HAND FX',x+w*.06,y+h*.55);
  ctx.globalAlpha=1;
}
function scanlines(x,y,w,h,p){ctx.globalAlpha=.22+.3*p;ctx.fillStyle='#050509';for(let yy=y;yy<y+h;yy+=Math.max(3,7-4*p))ctx.fillRect(x,yy,w,1);ctx.globalAlpha=.9;ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);ctx.globalAlpha=1}
function prism(x,y,w,h,p,t){ctx.globalAlpha=.25+.45*p;for(let i=0;i<6;i++){ctx.fillStyle=`hsl(${(t*90+i*55)%360} 100% 65%)`;ctx.fillRect(x+w*(i/6),y,w/3,h)}ctx.globalAlpha=.9;ctx.fillStyle='#fff';ctx.font=`bold ${Math.max(14,h*.16)}px system-ui`;ctx.fillText('✦',x+w*.44,y+h*.58);ctx.globalAlpha=1}
function clean(x,y,w,h){ctx.fillStyle='#ffffffcc';ctx.fillRect(x+w*.08,y+h*.42,w*.84,2);ctx.fillStyle='#fff';ctx.font=`bold ${Math.max(12,h*.12)}px system-ui`;ctx.fillText('FRAME',x+w*.07,y+h*.35)}
function drawPoints(q){for(const p of q){ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.fillStyle='#00eaff';ctx.shadowBlur=18;ctx.shadowColor='#00eaff';ctx.fill();ctx.restore()}}
