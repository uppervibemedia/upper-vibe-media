import * as THREE from "three";

function makeBoardTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 1024, 512);
  g.addColorStop(0, "#07162d"); g.addColorStop(0.55, "#100826"); g.addColorStop(1, "#04101d");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = "rgba(0,229,255,0.7)"; ctx.lineWidth = 8; ctx.strokeRect(22, 22, 980, 468);
  ctx.strokeStyle = "rgba(181,140,255,0.55)"; ctx.lineWidth = 3; ctx.strokeRect(46, 46, 932, 420);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,229,255,0.9)"; ctx.shadowBlur = 24;
  ctx.fillStyle = "#DFFBFF"; ctx.font = "900 72px Syne, Inter, sans-serif"; ctx.fillText("FREQUENCY", 512, 145);
  ctx.fillStyle = "#00E5FF"; ctx.font = "900 68px Syne, Inter, sans-serif"; ctx.fillText("LEADERBOARD", 512, 220);
  ctx.shadowBlur = 12; ctx.fillStyle = "rgba(255,255,255,0.72)"; ctx.font = "700 30px Inter, sans-serif"; ctx.fillText("ALL-TIME UPPER VIBE CITY LEADERS", 512, 285);
  ctx.fillStyle = "rgba(255,211,110,0.9)"; ctx.font = "800 28px Inter, sans-serif"; ctx.fillText("TOP 10  •  FREQUENCY SCORE  •  CITY LEGENDS", 512, 366);
  ctx.fillStyle = "rgba(0,229,255,0.38)";
  for (let x = 80; x < 960; x += 80) ctx.fillRect(x, 430, 42, 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

export function createFrequencyLeaderboardBoard(scene) {
  const group = new THREE.Group();
  group.name = "frequencyLeaderboardBoard";
  group.position.set(0, 0, 12.25);
  group.rotation.y = Math.PI;
  const panelMat = new THREE.MeshBasicMaterial({ map: makeBoardTexture(), transparent: true, opacity: 0.94, depthWrite: true });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 3.15), panelMat);
  panel.position.set(0, 3.1, 0);
  group.add(panel);
  const frameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#00E5FF"), transparent: true, opacity: 0.62 });
  [[0,4.78,0,6.5,0.08,0.08],[0,1.42,0,6.5,0.08,0.08],[-3.28,3.1,0,0.08,3.35,0.08],[3.28,3.1,0,0.08,3.35,0.08]].forEach(([x,y,z,w,h,d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), frameMat.clone()); m.position.set(x,y,z); group.add(m); });
  const postMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#7C3AED"), transparent: true, opacity: 0.72 });
  [-2.8, 2.8].forEach((x) => { const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.12), postMat); post.position.set(x, 1.1, -0.06); group.add(post); });
  const lineMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFD36E"), transparent: true, opacity: 0.0 });
  const line = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.035), lineMat);
  line.position.set(-2.6, 1.62, 0.035);
  group.add(line);
  group.userData.energyLine = line;
  scene.add(group);
  scene.userData.frequencyLeaderboardBoard = group;
}

export function animateFrequencyLeaderboardBoard(scene, t) {
  const group = scene.userData.frequencyLeaderboardBoard;
  if (!group) return;
  const pulse = 0.54 + Math.sin(t * 1.15) * 0.14;
  group.children.forEach((child) => { if (child.material?.opacity && child.geometry?.type === "BoxGeometry") child.material.opacity = pulse; });
  const line = group.userData.energyLine;
  if (line) { line.position.x = -2.7 + ((t * 1.25) % 5.4); line.material.opacity = 0.25 + Math.sin(t * 3.0) * 0.12; }
}