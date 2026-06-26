import createUpperVibeShop from "./UpperVibeShop";
import createLaunchPad, { animateLaunchPad } from "./LaunchPad";
import { animateShop } from "./UpperVibeShop";
import { LAUNCH_PADS, SHOP } from "./city-engine/cityConfig";

// ─────────────────────────────────────────────────────────────
// CityAddOns — gateways new visual objects into the live
// Three.js scene, keeping all wiring outside CityCanvas.
// Creates the objects once (scene.userData._cityAddOnsReady)
// and exposes a single per-frame routing function so
// CityCanvas calls it with the scene + audio intensity ref.
// ⚠ No launch physics. No collection logic. No purchases.
// ─────────────────────────────────────────────────────────────

const INITIALIZED = { value: false };

const KEYS_CREATED = [
  "_upperVibeShop",
  "_launchPad_lounge",
  "_launchPad_library",
  "_launchPad_academy",
  "_launchPad_crystal",
];

export { KEYS_CREATED };

/**
 * Run once in a layout-effect or component-mount: creates all
 * visual add-on objects inside `scene`.
 */
export function runConnections(scene, audioBeatRef) {
  if (INITIALIZED.value) return;
  INITIALIZED.value = true;

  // ── Upper Vibe Shop (replaces former Launch Zone area) ──
  const shopPos = SHOP.pos || { x: 0, z: 0 };
  const shop = createUpperVibeShop(scene, shopPos);
  scene.userData._upperVibeShop = shop;
  scene.userData._audioBeatRef = audioBeatRef || null;

  // ── 4 Launch Pads ────────────────────────────────────────
  Object.entries(LAUNCH_PADS).forEach(([id, cfg]) => {
    const pad = createLaunchPad(scene, cfg);
    scene.userData[`_launchPad_${id}`] = pad;
  });
}

/**
 * Per-frame tick — call inside CityCanvas's animation loop.
 * Animates the shop lights and pad pulses, driven by in-scene data.
 */
export function tickAddOns(scene, t) {
  const beat = scene.userData._audioBeatRef?.current ?? 0;

  const shop = scene.userData._upperVibeShop;
  if (shop) animateShop(shop, t, beat);

  for (const id of Object.keys(LAUNCH_PADS)) {
    const pad = scene.userData[`_launchPad_${id}`];
    if (pad) animateLaunchPad(pad, t, beat);
  }
}