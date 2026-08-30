import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm";

const video = document.querySelector("#video");
const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d", { alpha: true });
const start = document.querySelector("#start");
const startBtn = document.querySelector("#startBtn");
const filterEl = document.querySelector("#filter");
const lengthEl = document.querySelector("#length");

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";

let landmarker;
let running = false;
let lastVideoTime = -1;
const trails = new Map();
const maxTrail = () => Number(lengthEl.value);

function resize() {
  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 720;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}
addEventListener("resize", resize);

function pointFromLandmark(lm) {
  return { x: lm.x * canvas.width, y: lm.y * canvas.height };
}

function keyFor(hand, finger) { return `${hand}-${finger}`; }

function smoothPoint(key, p) {
  const old = trails.get(key)?.at(-1)?.p;
  if (!old) return p;
  return { x: old.x * .45 + p.x * .55, y: old.y * .45 + p.y * .55 };
}

function updateTrails(result) {
  const seen = new Set();

  for (let i = 0; i < result.landmarks.length; i++) {
    const hand = result.handednesses?.[i]?.[0]?.categoryName || `hand${i}`;
    const landmarks = result.landmarks[i];

    // Only thumb tip (4) and index tip (8) are used for effects.
    for (const [finger, index] of [["thumb", 4], ["index", 8]]) {
      const key = keyFor(hand, finger);
      const p = smoothPoint(key, pointFromLandmark(landmarks[index]));
      const trail = trails.get(key) || [];
      trail.push({ p, t: performance.now() });
      while (trail.length > maxTrail()) trail.shift();
      trails.set(key, trail);
      seen.add(key);
    }
  }

  for (const key of trails.keys()) {
    if (!seen.has(key)) {
      const trail = trails.get(key);
      if (trail?.length) trail.shift();
      if (!trail?.length) trails.delete(key);
    }
  }
}

function drawBaseTrail(points, alpha = 1, width = 7) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    ctx.lineTo((a.x + b.x) / 2, (a.y + b.y) / 2);
  }
  ctx.lineTo(points.at(-1).x, points.at(-1).y);
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = alpha;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawFilter(trail, key, now) {
  const pts = trail.map(x => x.p);
  if (!pts.length) return;
  const head = pts.at(-1);
  const age = (now - trail.at(-1).t) / 1000;
  const hue = (now * .08 + (key.includes("index") ? 80 : 0)) % 360;

  if (filterEl.value === "neon") {
    ctx.shadowBlur = 18; ctx.shadowColor = `hsl(${hue} 100% 65%)`;
    ctx.strokeStyle = `hsl(${hue} 100% 65%)`;
    drawBaseTrail(pts, .9, 8);
    ctx.shadowBlur = 0;
  } else if (filterEl.value === "rainbow") {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i-1], b = pts[i];
      ctx.strokeStyle = `hsl(${(i * 14 + now * .05) % 360} 100% 65%)`;
      ctx.lineWidth = 8 * (i / pts.length);
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    }
  } else if (filterEl.value === "electric") {
    ctx.strokeStyle = "#b9f6ff"; ctx.shadowBlur = 14; ctx.shadowColor = "#50dfff";
    drawBaseTrail(pts, .9, 5);
    ctx.shadowBlur = 0;
    for (let j=0;j<3;j++) {
      ctx.strokeStyle = `rgba(100,220,255,${.25-j*.06})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      pts.forEach((p,i)=>{ const y=p.y+Math.sin(i*3+now*.02+j)*3; i?ctx.lineTo(p.x,y):ctx.moveTo(p.x,y); });
      ctx.stroke();
    }
  } else if (filterEl.value === "fire") {
    ctx.strokeStyle = "#ff8a00"; ctx.shadowBlur = 20; ctx.shadowColor = "#ff3d00";
    drawBaseTrail(pts, .8, 10);
    ctx.strokeStyle = "#ffe082"; ctx.shadowBlur = 8; ctx.shadowColor = "#ffb300";
    drawBaseTrail(pts, .8, 4);
    ctx.shadowBlur = 0;
  } else if (filterEl.value === "sparkle") {
    ctx.strokeStyle = "#fff"; ctx.shadowBlur = 12; ctx.shadowColor = "#fff";
    drawBaseTrail(pts, .65, 4); ctx.shadowBlur = 0;
    for (let i=0;i<Math.min(10,pts.length);i+=2) {
      const p=pts[pts.length-1-i], s=2+Math.sin(now*.01+i)*1.5;
      ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(p.x,p.y,s,0,Math.PI*2); ctx.fill();
    }
  } else if (filterEl.value === "galaxy") {
    ctx.strokeStyle = "#c8a2ff"; ctx.shadowBlur = 20; ctx.shadowColor = "#8f5cff";
    drawBaseTrail(pts, .65, 9);
    ctx.strokeStyle = "#fff"; drawBaseTrail(pts, .55, 2);
    ctx.shadowBlur = 0;
  } else if (filterEl.value === "hearts") {
    ctx.strokeStyle = "#ff6fb5"; ctx.shadowBlur = 12; ctx.shadowColor = "#ff4f9a";
    drawBaseTrail(pts, .55, 5); ctx.shadowBlur=0;
    const p=head, size=8+Math.sin(now*.01)*2;
    ctx.font=`${size*2}px sans-serif`; ctx.fillStyle="#ff78b8"; ctx.fillText("♥",p.x-size,p.y+size);
  } else if (filterEl.value === "frost") {
    ctx.strokeStyle = "#bdefff"; ctx.shadowBlur=14; ctx.shadowColor="#80deff";
    drawBaseTrail(pts,.7,6); ctx.shadowBlur=0;
    ctx.fillStyle="#e8fbff"; ctx.beginPath(); ctx.arc(head.x,head.y,5,0,Math.PI*2); ctx.fill();
  } else if (filterEl.value === "ink") {
    ctx.strokeStyle = "rgba(20,20,20,.9)"; drawBaseTrail(pts,.75,11);
    ctx.strokeStyle = "rgba(255,255,255,.25)"; drawBaseTrail(pts,.35,2);
  } else {
    ctx.strokeStyle = `hsl(${hue} 100% 65%)`; ctx.shadowBlur=15; ctx.shadowColor=ctx.strokeStyle;
    drawBaseTrail(pts,.85,7); ctx.shadowBlur=0;
    ctx.fillStyle=ctx.strokeStyle; ctx.beginPath(); ctx.arc(head.x,head.y,5+Math.sin(now*.015)*2,0,Math.PI*2); ctx.fill();
  }
}

function render() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const now = performance.now();
  for (const [key, trail] of trails) drawFilter(trail, key, now);
  requestAnimationFrame(render);
}

async function init() {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  landmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
    runningMode: "VIDEO",
    numHands: 2,
    minHandDetectionConfidence: .5,
    minHandPresenceConfidence: .5,
    minTrackingConfidence: .5
  });
}

async function startCamera() {
  startBtn.disabled = true;
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
    audio: false
  });
  video.srcObject = stream;
  await video.play();
  resize();
  start.hidden = true;
  running = true;
  loop();
}

function loop() {
  if (!running) return;
  if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    const result = landmarker.detectForVideo(video, performance.now());
    updateTrails(result);
    lastVideoTime = video.currentTime;
  }
  requestAnimationFrame(loop);
}

startBtn.addEventListener("click", async () => {
  try {
    await init();
    await startCamera();
  } catch (err) {
    console.error(err);
    startBtn.disabled = false;
    startBtn.textContent = "Retry camera";
  }
});

render();
