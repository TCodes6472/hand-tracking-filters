const video=document.querySelector('#video'),canvas=document.querySelector('#canvas'),ctx=canvas.getContext('2d',{alpha:true});
const start=document.querySelector('#start'),status=document.querySelector('#status'),hint=document.querySelector('#hint');
let stream=null,running=false,sending=false,raf=0,lastGood=0,lastFrame=0;
const pts={leftThumb:null,leftIndex:null,rightThumb:null,rightIndex:null};
const smooth={leftThumb:null,leftIndex:null,rightThumb:null,rightIndex:null};
const SMOOTH=.82,HOLD=900;
const hands=new Hands({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`});
hands.setOptions({selfieMode:true,maxNumHands:2,modelComplexity:1,minDetectionConfidence:.25,minTrackingConfidence:.25});
hands.onResults(onResults);
function resize(){if(video.videoWidth&&video.videoHeight){canvas.width=video.videoWidth;canvas.height=video.videoHeight}}
function d(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function xy(lm,i){return{x:lm[i].x*canvas.width,y:lm[i].y*canvas.height}}
function smoothPt(k,p){if(!p)return smooth[k];if(!smooth[k])smooth[k]={x:p.x,y:p.y};smooth[k].x+=(p.x-smooth[k].x)*(1-SMOOTH);smooth[k].y+=(p.y-smooth[k].y)*(1-SMOOTH);return smooth[k]}
function setHint(text,visible=true){if(!hint)return;hint.textContent='';hint.classList.add('hidden')}
function onResults(r){lastFrame=performance.now();resize();const handsFound=r.multiHandLandmarks||[];const usable=handsFound.filter(lm=>lm&&lm[4]&&lm[8]);usable.sort((a,b)=>a[9].x-b[9].x);if(usable.length>=2){const a=usable[0],b=usable[usable.length-1];pts.leftThumb=smoothPt('leftThumb',xy(a,4));pts.leftIndex=smoothPt('leftIndex',xy(a,8));pts.rightThumb=smoothPt('rightThumb',xy(b,4));pts.rightIndex=smoothPt('rightIndex',xy(b,8));lastGood=performance.now();status.textContent='Tracking • 4 fingertips detected';setHint('Move your thumbs + index fingers to control the frame.',true)}else if(performance.now()-lastGood>HOLD){Object.keys(pts).forEach(k=>pts[k]=null);status.textContent=running?'Camera connected • show both hands':'Camera off';setHint('Show both hands with your thumbs + index fingers visible.',true)}draw()}
function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);const q=[pts.leftThumb,pts.leftIndex,pts.rightIndex,pts.rightThumb];if(q.some(p=>!p))return;const minX=Math.min(...q.map(p=>p.x)),maxX=Math.max(...q.map(p=>p.x)),minY=Math.min(...q.map(p=>p.y)),maxY=Math.max(...q.map(p=>p.y));ctx.save();ctx.strokeStyle='rgba(0,234,255,.95)';ctx.shadowColor='#00eaff';ctx.shadowBlur=18;ctx.lineWidth=7;ctx.strokeRect(minX,minY,maxX-minX,maxY-minY);ctx.restore();const show=document.querySelector('#points');if(!show||show.checked){q.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,9,0,Math.PI*2);ctx.fillStyle='#fff';ctx.shadowColor='#00eaff';ctx.shadowBlur=14;ctx.fill();ctx.shadowBlur=0})}}
async function loop(){if(!running||sending){if(running)raf=requestAnimationFrame(loop);return}if(video.readyState>=2&&video.videoWidth){sending=true;try{await hands.send({image:video})}catch(e){console.error('MediaPipe frame error',e)}finally{sending=false}}raf=requestAnimationFrame(loop)}
async function startCamera(){if(running)return;try{status.textContent='Requesting camera permission…';if(!window.isSecureContext&&!['localhost','127.0.0.1'].includes(location.hostname))throw new Error('Camera requires HTTPS or localhost.');if(!navigator.mediaDevices?.getUserMedia)throw new Error('This browser does not expose getUserMedia.');stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720},facingMode:'user'},audio:false});video.srcObject=stream;video.muted=true;video.autoplay=true;video.playsInline=true;video.style.display='block';setHint('',false);await new Promise(resolve=>{if(video.readyState>=1)resolve();else video.addEventListener('loadedmetadata',resolve,{once:true})});await video.play();resize();running=true;lastGood=0;status.textContent='Camera connected • starting hand tracking…';setHint('Show both hands with thumbs + index fingers visible.',true);start.textContent='Camera Running';cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)}catch(e){running=false;console.error(e);status.textContent=e.name==='NotAllowedError'?'Camera permission was denied. Allow camera access for this site.':e.name==='NotFoundError'?'No camera was found on this computer.':e.name==='NotReadableError'?'The camera is already being used by another app.':`Camera error: ${e.message}`}}
start?.addEventListener('click',startCamera);
video?.addEventListener('loadeddata',resize);
video?.addEventListener('playing',()=>{if(running){status.textContent='Camera connected • tracking hands…';setHint('Show both hands with thumbs + index fingers visible.',true)}});
window.addEventListener('beforeunload',()=>stream?.getTracks().forEach(t=>t.stop()));
if(navigator.permissions?.query)navigator.permissions.query({name:'camera'}).then(p=>{
  const sync=()=>{
    if(p.state==='granted'&&!running){
      status.textContent='📷 Camera permission granted';
      setHint('Camera access is already allowed. Click Start Camera to begin tracking.',true);
    }else if(p.state==='denied'&&!running){
      status.textContent='📷 Camera access blocked';
      setHint('Camera access is blocked for this site. Check browser permissions.',true);
    }else if(p.state==='prompt'&&!running){
      setHint('Click Start Camera to allow camera access, then show both hands.',true);
    }
  };
  sync();
  p.onchange=sync;
}).catch(()=>{if(!running)setHint('Click Start Camera to begin, then show both hands.',true)});
else setHint('Click Start Camera to begin, then show both hands.',true);