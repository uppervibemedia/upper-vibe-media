import createUpperVibeShop from "./UpperVibeShop";
import createLaunchPad, { animateLaunchPad } from "./LaunchPad";
import { animateShop } from "./UpperVibeShop";
import { LAUNCH_PADS, SHOP } from "./city-engine/cityConfig";
import { setupLaunchRide, tickLaunchRide, animateLaunchCoins, MOVEMENT_BRIDGE } from "./city-engine/LaunchRide";
import { resetSessionCoins, getVibeCoinBank } from "@/lib/vibeCoinBank";

export const enableCityLaunchPads = false;
export const enableCityOrbCoins = false;

// ─────────────────────────────────────────────────────────────
// CityAddOns — gateways new objects into the live Three.js
// scene. Now also runs the LaunchRide auto-launch + coin
// system (pad cooldown, step-on detection, mid-air collection).
// ─────────────────────────────────────────────────────────────

const KEYS_CREATED = [
  "_upperVibeShop",
];

export { KEYS_CREATED };

/**
 * Run once in a layout-effect or component-mount: creates all
 * visual add-on objects inside `scene`.
 */
export function runConnections(scene, audioBeatRef) {
  if (scene.userData._cityAddOnsInitialized) return;
  scene.userData._cityAddOnsInitialized = true;

  // ── Upper Vibe Shop (replaces former Launch Zone area) ──
  const shopPos = SHOP.pos || { x: 0, z: 0 };
  const shop = createUpperVibeShop(scene, shopPos);
  scene.userData._upperVibeShop = shop;
  scene.userData._audioBeatRef = audioBeatRef || null;

  // ── Temporary performance flag: city launch pads + sky orb coins disabled ──
  if (enableCityLaunchPads && enableCityOrbCoins) {
    Object.entries(LAUNCH_PADS).forEach(([id, cfg]) => {
      const pad = createLaunchPad(scene, cfg);
      scene.userData[`_launchPad_${id}`] = pad;
    });
    setupLaunchRide(scene);
    resetSessionCoins();
    window.__lrTotalCoins = getVibeCoinBank();
  }
  window.__lr_flying = false;
  window.__lrCoinsCollected = 0;
  window.__lrJustLanded = false;
}

/**
 * Per-frame tick — call inside CityCanvas's animation loop.
 * Handles shop/pad visuals + LaunchRide step-on auto-launch + coin collection.
 */
export function tickAddOns(scene, t) {
  scene.userData._addonsFrame = (scene.userData._addonsFrame || 0) + 1;
  const addOnFrame = scene.userData._addonsFrame;
  const beat = scene.userData._audioBeatRef?.current ?? 0;

  const px = MOVEMENT_BRIDGE.px || 0;
  const pz = MOVEMENT_BRIDGE.pz || 0;
  const shop = scene.userData._upperVibeShop;
  if (shop) {
    const sx = shop.position?.x || 0;
    const sz = shop.position?.z || 0;
    const nearShop = (px - sx) * (px - sx) + (pz - sz) * (pz - sz) < 900;
    if (nearShop || addOnFrame % 16 === 0) animateShop(shop, t, beat);
  }

  if (enableCityLaunchPads && enableCityOrbCoins && addOnFrame % 2 === 0) {
    for (const [id, cfg] of Object.entries(LAUNCH_PADS)) {
      const pad = scene.userData[`_launchPad_${id}`];
      if (!pad) continue;
      const dx = px - (cfg.x || 0);
      const dz = pz - (cfg.z || 0);
      const nearPad = dx * dx + dz * dz < 900;
      if (nearPad || addOnFrame % 20 === 0) animateLaunchPad(pad, t, beat);
    }
  }

  if (enableCityLaunchPads && enableCityOrbCoins) {
    tickLaunchRide(scene, t);
    animateLaunchCoins(scene, t);
    if (addOnFrame % 30 === 0) window.__lrTotalCoins = getVibeCoinBank();
  } else {
    window.__lr_flying = false;
  }
}