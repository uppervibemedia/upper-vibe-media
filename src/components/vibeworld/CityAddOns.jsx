import createUpperVibeShop from "./UpperVibeShop";
import createLaunchPad, { animateLaunchPad } from "./LaunchPad";
import { animateShop } from "./UpperVibeShop";
import { LAUNCH_PADS, SHOP } from "./city-engine/cityConfig";
import { setupLaunchRide, tickLaunchRide, animateLaunchCoins, MOVEMENT_BRIDGE } from "./city-engine/LaunchRide";

// ─────────────────────────────────────────────────────────────
// CityAddOns — gateways new objects into the live Three.js
// scene. Now also runs the LaunchRide auto-launch + coin
// system (pad cooldown, step-on detection, mid-air collection).
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

  // ── LaunchRide: floating coins in city sky ───────────────
  setupLaunchRide(scene);
}

/**
 * Per-frame tick — call inside CityCanvas's animation loop.
 * Handles shop/pad visuals + LaunchRide step-on auto-launch + coin collection.
 */
export function tickAddOns(scene, t) {
  const beat = scene.userData._audioBeatRef?.current ?? 0;

  const shop = scene.userData._upperVibeShop;
  if (shop) animateShop(shop, t, beat);

  for (const id of Object.keys(LAUNCH_PADS)) {
    const pad = scene.userData[`_launchPad_${id}`];
    if (pad) animateLaunchPad(pad, t, beat);
  }

  // LaunchRide — auto-launch detection, flight, mid-air coin collect
  tickLaunchRide(scene, t);
  animateLaunchCoins(scene, t);
}