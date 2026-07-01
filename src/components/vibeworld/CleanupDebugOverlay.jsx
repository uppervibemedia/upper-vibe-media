import React, { useEffect, useState } from "react";

function isCleanupDebugEnabled() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("cleanup") === "1" || params.get("debug") === "cleanup";
  } catch {
    return false;
  }
}

const LEGACY_TERMS = ["launch", "orb", "coinroute", "coin_route", "hoverboardrun", "hoverboard_run", "cooldown"];
const TRIGGER_TERMS = ["trigger", "collider", "collision", "interact", "proximity", "pad", "zone"];

function lowerName(obj) {
  const dataKeys = obj?.userData ? Object.keys(obj.userData).join(" ") : "";
  return `${obj?.name || ""} ${obj?.type || ""} ${dataKeys}`.toLowerCase();
}

function scanScene() {
  const scene = window.__hbScene;
  const result = {
    triggers: [],
    invisibleColliders: [],
    interactionAreas: [],
    groundBlockers: [],
    hiddenUpdating: [],
    legacyObjects: [],
    flags: {},
  };
  if (!scene) return result;

  result.flags = {
    launchPadsRemoved: !!scene.userData._cleanupLegacyPadsRemoved,
    orbCoinsRemoved: !!scene.userData._cleanupLegacyCollectiblesRemoved,
    launchLoopsStopped: !!scene.userData._cleanupLegacyLoopsStopped,
  };

  scene.traverse((obj) => {
    const name = lowerName(obj);
    const isLegacy = LEGACY_TERMS.some((term) => name.includes(term));
    const isTrigger = TRIGGER_TERMS.some((term) => name.includes(term));
    const isHidden = obj.visible === false || (obj.material && obj.material.opacity === 0);
    const nearGround = Math.abs(obj.position?.y || 0) < 0.25;

    const entry = {
      name: obj.name || obj.type || "unnamed",
      type: obj.type || "object",
      x: Number(obj.position?.x || 0).toFixed(1),
      y: Number(obj.position?.y || 0).toFixed(1),
      z: Number(obj.position?.z || 0).toFixed(1),
      visible: obj.visible !== false,
    };

    if (isLegacy) result.legacyObjects.push(entry);
    if (isTrigger) result.triggers.push(entry);
    if (isHidden && (isTrigger || isLegacy)) result.invisibleColliders.push(entry);
    if (isTrigger && !isLegacy) result.interactionAreas.push(entry);
    if (nearGround && isHidden && (isTrigger || isLegacy)) result.groundBlockers.push(entry);
    if (isHidden && (obj.userData?._updates || obj.userData?._animated || obj.userData?.isWisp || obj.userData?.isOrb)) {
      result.hiddenUpdating.push(entry);
    }
  });

  window.__uvcCleanupSnapshot = result;
  return result;
}

function MiniList({ title, items, empty = "none" }) {
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ color: "#7DEBFF", fontWeight: 800 }}>{title}: {items.length}</div>
      {items.length === 0 ? (
        <div style={{ color: "rgba(255,255,255,0.35)" }}>{empty}</div>
      ) : items.slice(0, 8).map((item, idx) => (
        <div key={`${title}-${idx}`} style={{ color: "rgba(255,255,255,0.65)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.name} · {item.x},{item.y},{item.z} · {item.visible ? "visible" : "hidden"}
        </div>
      ))}
    </div>
  );
}

export default function CleanupDebugOverlay() {
  const [enabled] = useState(isCleanupDebugEnabled);
  const [scan, setScan] = useState(() => ({ triggers: [], invisibleColliders: [], interactionAreas: [], groundBlockers: [], hiddenUpdating: [], legacyObjects: [], flags: {} }));

  useEffect(() => {
    if (!enabled) return;
    const update = () => setScan(scanScene());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [enabled]);

  if (!enabled) return null;

  const safe = scan.legacyObjects.length === 0 && scan.invisibleColliders.length === 0 && scan.groundBlockers.length === 0 && scan.hiddenUpdating.length === 0;

  return (
    <div style={{ position: "fixed", left: 8, top: 108, zIndex: 9999, width: 240, maxHeight: "74vh", overflowY: "auto", pointerEvents: "none", padding: 10, borderRadius: 10, background: "rgba(0,0,0,0.9)", border: `1px solid ${safe ? "rgba(68,255,136,0.45)" : "rgba(255,170,0,0.55)"}`, fontFamily: "monospace", fontSize: 9, lineHeight: 1.45 }}>
      <div style={{ color: safe ? "#44FF88" : "#FFAA44", fontWeight: 900, fontSize: 11 }}>CLEANUP AUDIT</div>
      <div style={{ color: "rgba(255,255,255,0.55)", marginTop: 3 }}>Developer-only: ?cleanup=1</div>
      <div style={{ marginTop: 6, color: "rgba(255,255,255,0.75)" }}>
        pads removed: {scan.flags.launchPadsRemoved ? "yes" : "no"}<br />
        orbs removed: {scan.flags.orbCoinsRemoved ? "yes" : "no"}<br />
        old loops stopped: {scan.flags.launchLoopsStopped ? "yes" : "no"}
      </div>
      <MiniList title="legacy launch/orb objects" items={scan.legacyObjects} />
      <MiniList title="invisible colliders" items={scan.invisibleColliders} />
      <MiniList title="ground blockers" items={scan.groundBlockers} />
      <MiniList title="hidden updating" items={scan.hiddenUpdating} />
      <MiniList title="active interaction areas" items={scan.interactionAreas} />
      <div style={{ marginTop: 7, color: safe ? "#44FF88" : "#FFAA44", fontWeight: 800 }}>
        {safe ? "No legacy launch/orb leftovers detected." : "Review listed leftovers."}
      </div>
    </div>
  );
}