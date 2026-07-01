/**
 * cityConfig.js — Phase 1A: Static config data only.
 *
 * SAFETY RULES:
 *   • Contains ONLY read-only, non-moving data.
 *   • NO movement, camera, joystick, collision, or animation loop constants.
 *   • NO code that affects live avatar walking, camera orbit, or zone behavior.
 *
 * These values are for reference when building NEW features (shop, tokens, pads).
 * The LIVE scene is still fully controlled by CityCanvas.jsx and its existing
 * zone modules. This file is imported by NEW feature modules only.
 */

// ═══════════════════════════════════════════════════════════════════
// ZONE REGISTRY — Upper Vibe City zones (read-only reference)
// ═══════════════════════════════════════════════════════════════════
// Source: CityCanvas + zone module positions. Updated when zones move.
export const ZONES = {
  centralPlaza:    { label: "Central Plaza",      x: 0,   z: -6,  tag: "plaza" },
  musicStage:      { label: "Music Stage",        x: 0,   z: -32, tag: "stage" },
  vibeLounge:      { label: "Vibe Lounge",        x: -22, z: -26, tag: "lounge" },
  musicLibrary:    { label: "Music Library",       x: 22,  z: -20, tag: "library" },
  visualizerDome:  { label: "Visualizer Dome",    x: -13, z: 10,  tag: "dome" },
  dailyVibeCheck:  { label: "Daily Vibe Check",   x: -16, z: -13, tag: "vibeCheck" },
  vibeAcademy:     { label: "Vibe Academy",        x: -28, z: 10,  tag: "academy" },
  crystalZone:     { label: "Crystal Zone",        x: -28, z: 9,   tag: "crystal" },
  zenBeach:        { label: "Zen Beach",           x: -11, z: 22,  tag: "beach" },
  ferrisWheel:     { label: "Ferris Wheel",        x: 0,   z: 24,  tag: "ferris" },
  upperVibeShop:   { label: "Upper Vibe Shop",     x: 22,  z: 12.25, tag: "shop" },
};

// ═══════════════════════════════════════════════════════════════════
// ZONE COLORS — neon theme palette per zone
// ═══════════════════════════════════════════════════════════════════
export const ZONE_COLORS = {
  plaza:       "#00D4F0",
  stage:       "#A078FF",
  lounge:      "#C43BFF",
  library:     "#00D4F0",
  dome:        "#C43BFF",
  vibeCheck:   "#00E5FF",
  academy:     "#7C3AED",
  crystal:     "#AA66FF",
  beach:       "#00E5FF",
  ferris:      "#FFD700",
  shop:        "#FFC060",
};

// ═══════════════════════════════════════════════════════════════════
// SHOP — upper Vibe Shop placeholder config
// ═══════════════════════════════════════════════════════════════════
// This config defines the shop's layout. The actual shop visual
// (UpperVibeShop.jsx) will be built as a separate component.
export const SHOP = {
  pos: { x: 22, z: 12.25 },
  isActive: true,
  items: [
    { id: "cosmic_jacket",     label: "Cosmic Jacket",     price: 800,   category: "wearable" },
    { id: "neon_glasses",      label: "Neon Glasses",      price: 300,   category: "wearable" },
    { id: "hoverboard_skin_1", label: "Electric Blue Skin", price: 500,  category: "hoverboard" },
    { id: "aura_ring",         label: "Aura Ring",         price: 200,   category: "accessory" },
  ],
  currencyLabel: "Vibe Coins",
  panelWidth: 400,
};

// ═══════════════════════════════════════════════════════════════════
// CITY PERIMETER (read-only reference for new features)
// ═══════════════════════════════════════════════════════════════════
export const CITY_EDGES = {
  north: -36,
  east:   36,
  west:  -36,
  beachStart: 15,
  oceanZ:    34,
};