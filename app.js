const video=document.querySelector('#video'),canvas=document.querySelector('#canvas'),ctx=canvas.getContext('2d',{alpha:true});
const start=document.querySelector('#start'),filter=document.querySelector('#filter'),status=document.querySelector('#status');
let camera=null,running=false,lastGood=0;
const pts={leftThumb:null,leftIndex:null,rightThumb:null,rightIndex:null};
const smooth={leftThumb:null,leftIndex:null,rightThumb:null,rightIndex:null};
const SMOOTH=.78,HOLD=1200;
const hands=new Hands({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`});
hands.setOptions({selfieMode:true,maxNumHands:2,modelComplexity:1,minDetectionConfidence:.35,minTrackingConfidence:.35});
hands.onResults(onResults);
function resize(){if(video.videoWidth){canvas.width=video.videoWidth;canvas.height=video.videoHeight}}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function valid(lm){if(!lm)return false;const palm=Math.max(dist(lm[0],lm[9]),.001);return dist(lm[4],lm[0])/palm>.45&&dist(lm[8],lm[0])/palm>.75}
function xy(lm,i){return{x:lm[i].x*canvas.width,y:lm[i].y*canvas.height}}
function smoothPt(k,p){if(!p)return smooth[k];if(!smooth[k])return smooth[k]=p;smooth[k].x+= (p.x-smooth[k].x)*(1-SMOOTH);smooth[k].y+=(p.y-smooth[k].y)*(1-SMOOTH);return smooth[k]}
function onResults(r){resize();const found=[];(r.multiHandLandmarks||[]).forEach((lm,i)=>{if(valid(lm))found.push({lm,x:lm[9].x});});found.sort((a,b)=>a.x-b.x);if(found.length>=2){const a=found[0].lm,b=found[found.length-1].lm;pts.leftThumb=smoothPt('leftThumb',xy(a,4));pts.leftIndex=smoothPt('leftIndex',xy(a,8));pts.rightThumb=smoothPt('rightThumb',xy(b,4));pts.rightIndex=smoothPt('rightIndex',xy(b,8));lastGood=performance.now();status.textContent='Tracking 4 fingertips';}else if(performance.now()-lastGood>HOLD){Object.keys(pts).forEach(k=>pts[k]=null);status.textContent=running?'Show both thumbs + index fingers':'Camera ready'}draw()}
function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);const q=[pts.leftThumb,pts.leftIndex,pts.rightIndex,pts.rightThumb];if(q.some(p=>!p))return;const minX=Math.min(...q.map(p=>p.x)),maxX=Math.max(...q.map(p=>p.x)),minY=Math.min(...q.map(p=>p.y)),maxY=Math.max(...q.map(p=>p.y));ctx.save();ctx.strokeStyle='rgba(0,234,255,.95)';ctx.shadowColor='#00eaff';ctx.shadowBlur=18;ctx.lineWidth=7;ctx.strokeRect(minX,minY,maxX-minX,maxY-minY);ctx.restore();q.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,10,0,Math.PI*2);ctx.fillStyle='#fff';ctx.shadowColor='#00eaff';ctx.shadowBlur=14;ctx.fill();ctx.shadowBlur=0})}
async function startCamera(){if(running)return;try{status.textContent='Requesting camera…';if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera API unavailable. Use HTTPS or localhost.');const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:false});video.srcObject=stream;video.muted=true;video.playsInline=true;await video.play();resize();running=true;start.textContent='Camera Running';status.textContent='Camera ready — show both thumbs + index fingers';if(camera)camera.stop();camera=new Camera(video,{onFrame:async()=>{if(video.readyState>=2)await hands.send({image:video})},width:1280,height:720});camera.start()}catch(e){running=false;status.textContent=e.name==='NotAllowedError'?'Camera permission blocked — allow this site in browser settings.':e.name==='NotFoundError'?'No camera found.':`Camera error: ${e.message}`;console.error(e)}}
start?.addEventListener('click',startCamera);
if(navigator.permissions?.query)navigator.permissions.query({name:'camera'}).then(p=>{p.onchange=()=>{if(p.state==='granted'&&!running)startCamera()}}).catch(()=>{});
if(video)video.addEventListener('loadedmetadata',resize);