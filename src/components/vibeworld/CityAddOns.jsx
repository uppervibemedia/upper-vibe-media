import createUpperVibeShop from "./UpperVibeShop";
import { animateShop } from "./UpperVibeShop";
import { SHOP } from "./city-engine/cityConfig";

// ─────────────────────────────────────────────────────────────
// CityAddOns — live city add-ons only.
// Launch pad / orb / route gameplay has been fully detached from
// the city scene so no hidden triggers or background updates remain.
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

  // Explicit legacy cleanup flags for developer audits.
  scene.userData._cleanupLegacyPadsRemoved = true;
  scene.userData._cleanupLegacyCollectiblesRemoved = true;
  scene.userData._cleanupLegacyLoopsStopped = true;
}

/**
 * Per-frame tick — call inside CityCanvas's animation loop.
 * Handles only live shop visuals. Old launch/orb updates are not called.
 */
export function tickAddOns(scene, t) {
  scene.userData._addonsFrame = (scene.userData._addonsFrame || 0) + 1;
  const addOnFrame = scene.userData._addonsFrame;
  const beat = scene.userData._audioBeatRef?.current ?? 0;

  const px = scene.userData._playerX || 0;
  const pz = scene.userData._playerZ || 0;
  const shop = scene.userData._upperVibeShop;
  if (shop) {
    const sx = shop.position?.x || 0;
    const sz = shop.position?.z || 0;
    const nearShop = (px - sx) * (px - sx) + (pz - sz) * (pz - sz) < 900;
    if (nearShop || addOnFrame % 16 === 0) animateShop(shop, t, beat);
  }

}