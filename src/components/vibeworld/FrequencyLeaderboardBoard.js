import * as THREE from "three";
import { base44 } from "@/api/base44Client";

const BOARD_W = 768;
const BOARD_H = 1536;

function fitText(ctx, text, maxWidth, startSize, weight = 900, family = "Inter, sans-serif") {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 4;
  } while (size >= 34);
  return size;
}

function drawBoard(ctx, rows = [], loading = false) {
  ctx.clearRect(0, 0, BOARD_W, BOARD_H);
  const bg = ctx.createLinearGradient(0, 0, BOARD_W, BOARD_H);
  bg.addColorStop(0, "#06182f"); bg.addColorStop(0.5, "#100828"); bg.addColorStop(1, "#03101d");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, BOARD_W, BOARD_H);

  ctx.strokeStyle = "rgba(0,229,255,0.78)"; ctx.lineWidth = 10; ctx.strokeRect(28, 28, BOARD_W - 56, BOARD_H - 56);
  ctx.strokeStyle = "rgba(181,140,255,0.55)"; ctx.lineWidth = 4; ctx.strokeRect(54, 54, BOARD_W - 108, BOARD_H - 108);

  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,229,255,0.9)"; ctx.shadowBlur = 24;
  ctx.fillStyle = "#DFFBFF"; ctx.font = "900 58px Syne, Inter, sans-serif"; ctx.fillText("FREQUENCY", BOARD_W / 2, 120);
  ctx.fillStyle = "#00E5FF"; ctx.font = "900 62px Syne, Inter, sans-serif"; ctx.fillText("LEADERBOARD", BOARD_W / 2, 188);
  ctx.shadowBlur = 8;
  ctx.fillStyle = "rgba(255,211,110,0.92)"; ctx.font = "800 28px Inter, sans-serif"; ctx.fillText("LIVE TOP 5", BOARD_W / 2, 250);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.52)"; ctx.font = "800 22px Inter, sans-serif";
  ctx.textAlign = "left"; ctx.fillText("RANK", 88, 330);
  ctx.fillText("VIBE NAME", 188, 330);
  ctx.textAlign = "right"; ctx.fillText("SCORE", 682, 330);

  if (loading) {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.font = "800 34px Inter, sans-serif";
    ctx.fillText("Loading live leaders...", BOARD_W / 2, 760);
    return;
  }

  if (!rows.length) {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.font = "800 34px Inter, sans-serif";
    ctx.fillText("No Frequency leaders yet", BOARD_W / 2, 760);
    ctx.fillStyle = "rgba(0,229,255,0.7)";
    ctx.font = "700 24px Inter, sans-serif";
    ctx.fillText("Earn score around Upper Vibe City", BOARD_W / 2, 812);
    return;
  }

  rows.slice(0, 5).forEach((row, i) => {
    const y = 425 + i * 188;
    const isTop = i === 0;
    const grad = ctx.createLinearGradient(76, y - 58, 692, y + 58);
    grad.addColorStop(0, isTop ? "rgba(255,211,110,0.18)" : "rgba(0,229,255,0.09)");
    grad.addColorStop(1, "rgba(124,58,237,0.10)");
    ctx.fillStyle = grad;
    roundRect(ctx, 74, y - 66, 620, 128, 28);
    ctx.fill();
    ctx.strokeStyle = isTop ? "rgba(255,211,110,0.42)" : "rgba(0,229,255,0.22)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = isTop ? "#FFD36E" : "#DFFBFF";
    ctx.font = "900 46px Syne, Inter, sans-serif";
    ctx.fillText(`#${i + 1}`, 124, y);

    const username = (row.username || "Vibe User").slice(0, 18);
    ctx.textAlign = "left";
    ctx.fillStyle = "#FFFFFF";
    fitText(ctx, username, 305, 42, 900, "Syne, Inter, sans-serif");
    ctx.fillText(username, 188, y - 22);
    ctx.fillStyle = "rgba(0,229,255,0.75)";
    ctx.font = "800 20px Inter, sans-serif";
    ctx.fillText("Frequency Score", 190, y + 30);

    ctx.textAlign = "right";
    ctx.fillStyle = isTop ? "#FFD36E" : "#FFFFFF";
    const score = Math.round(row.all_time_score || 0).toLocaleString();
    fitText(ctx, score, 185, 44, 900, "Syne, Inter, sans-serif");
    ctx.fillText(score, 668, y);
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(0,229,255,0.34)";
  for (let x = 92; x < 688; x += 74) ctx.fillRect(x, 1412, 38, 5);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function makeBoardTexture(rows = [], loading = true) {
  const canvas = document.createElement("canvas");
  canvas.width = BOARD_W; canvas.height = BOARD_H;
  drawBoard(canvas.getContext("2d"), rows, loading);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

function updateBoardTexture(texture, rows, loading = false) {
  drawBoard(texture.image.getContext("2d"), rows, loading);
  texture.needsUpdate = true;
}

async function refreshLeaderboard(group) {
  if (!group || group.userData.loadingLeaderboard) return;
  group.userData.loadingLeaderboard = true;
  try {
    const rows = await base44.entities.FrequencyScore.list("-all_time_score", 5);
    group.userData.leaderboardRows = rows || [];
    updateBoardTexture(group.userData.boardTexture, rows || [], false);
  } catch {
    updateBoardTexture(group.userData.boardTexture, group.userData.leaderboardRows || [], false);
  } finally {
    group.userData.loadingLeaderboard = false;
  }
}

export function createFrequencyLeaderboardBoard(scene) {
  const group = new THREE.Group();
  group.name = "frequencyLeaderboardBoard";
  group.position.set(0, 0, 12.25);
  group.rotation.y = Math.PI;

  const texture = makeBoardTexture([], true);
  group.userData.boardTexture = texture;
  group.userData.nextLeaderboardRefresh = 0;
  group.userData.leaderboardRows = [];

  const panelMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.96, depthWrite: true });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.45, 3.2), panelMat);
  panel.position.set(0, 1.82, 0);
  group.add(panel);

  const frameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#00E5FF"), transparent: true, opacity: 0.66 });
  [[0,3.48,0,2.75,0.07,0.07],[0,0.18,0,2.75,0.07,0.07],[-1.38,1.82,0,0.07,3.3,0.07],[1.38,1.82,0,0.07,3.3,0.07]].forEach(([x,y,z,w,h,d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), frameMat.clone()); m.position.set(x,y,z); group.add(m); });

  const postMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#7C3AED"), transparent: true, opacity: 0.76 });
  [-1.08, 1.08].forEach((x) => { const post = new THREE.Mesh(new THREE.BoxGeometry(0.13, 3.55, 0.13), postMat.clone()); post.position.set(x, 1.75, -0.08); group.add(post); });

  const baseMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#07162D"), transparent: true, opacity: 0.94 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.18, 0.55), baseMat);
  base.position.set(0, 0.08, -0.04);
  group.add(base);

  const lineMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFD36E"), transparent: true, opacity: 0.0 });
  const line = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.035), lineMat);
  line.position.set(-1.7, 0.35, 0.045);
  group.add(line);
  group.userData.energyLine = line;

  scene.add(group);
  scene.userData.frequencyLeaderboardBoard = group;
  refreshLeaderboard(group);
}

export function animateFrequencyLeaderboardBoard(scene, t) {
  const group = scene.userData.frequencyLeaderboardBoard;
  if (!group) return;
  if (!group.userData.nextLeaderboardRefresh || t > group.userData.nextLeaderboardRefresh) {
    group.userData.nextLeaderboardRefresh = t + 10;
    refreshLeaderboard(group);
  }
  const pulse = 0.54 + Math.sin(t * 1.15) * 0.14;
  group.children.forEach((child) => { if (child.material?.opacity && child.geometry?.type === "BoxGeometry") child.material.opacity = pulse; });
  const line = group.userData.energyLine;
  if (line) { line.position.x = -1.05 + ((t * 0.9) % 2.1); line.material.opacity = 0.25 + Math.sin(t * 3.0) * 0.12; }
}