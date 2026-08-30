const video=document.querySelector('#video');const canvas=document.querySelector('#canvas');const ctx=canvas.getContext('2d');const start=document.querySelector('#start');const filter=document.querySelector('#filter');const status=document.querySelector('#status');let camera;
const hands=new Hands({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`});hands.setOptions({maxNumHands:2,modelComplexity:1,minDetectionConfidence:.6,minTrackingConfidence:.6});hands.onResults(draw);
function resize(){canvas.width=video.videoWidth||1280;canvas.height=video.videoHeight||720}window.addEventListener('resize',resize);
start.onclick=async()=>{try{if(!camera){camera=new Camera(video,{onFrame:async()=>hands.send({image:video}),width:1280,height:720});camera.start();start.textContent='Camera Running';status.textContent='Tracking hands…'}}catch(e){status.textContent='Camera permission needed'}};
function point(p){return{x:p.x*canvas.width,y:p.y*canvas.height}}
function draw(r){resize();ctx.clearRect(0,0,canvas.width,canvas.height);const mode=filter.value;for(const hand of r.multiHandLandmarks||[]){const pts=hand.map(point);drawEffect(pts,mode)} }
function drawEffect(p,mode){const wrist=p[0],tips=[p[4],p[8],p[12],p[16],p[20]];ctx.lineWidth=mode==='neon'?7:4;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='rgba(255,255,255,.9)';ctx.shadowBlur=mode==='neon'?25:8;ctx.shadowColor='#00eaff';ctx.beginPath();[[0,1,2,3,4],[0,5,6,7,8],[0,9,10,11,12],[0,13,14,15,16],[0,17,18,19,20]].forEach(a=>{ctx.moveTo(p[a[0]].x,p[a[0]].y);for(let i=1;i<a.length;i++)ctx.lineTo(p[a[i]].x,p[a[i]].y)});ctx.stroke();ctx.shadowBlur=0;
for(const t of tips){if(mode==='spark')spark(t.x,t.y);if(mode==='hearts')heart(t.x,t.y);if(mode==='rings')ring(t.x,t.y)} }
function spark(x,y){for(let i=0;i<5;i++){const a=Math.random()*Math.PI*2,s=3+Math.random()*8;ctx.fillRect(x+Math.cos(a)*s,y+Math.sin(a)*s,3,3)}}
function heart(x,y){ctx.font='22px serif';ctx.fillText('♥',x-10,y-10)}
function ring(x,y){ctx.beginPath();ctx.arc(x,y,12+Math.random()*5,0,Math.PI*2);ctx.stroke()}
