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
  centralPlaza:    { label: "Central Plaza",      x: 0,   z: -13, tag: "plaza" },
  musicStage:      { label: "Music Stage",        x: 0,   z: -32, tag: "stage" },
  vibeLounge:      { label: "Vibe Lounge",        x: -22, z: -26, tag: "lounge" },
  musicLibrary:    { label: "Music Library",       x: 22,  z: -20, tag: "library" },
  visualizerDome:  { label: "Visualizer Dome",    x: -13, z: 10,  tag: "dome" },
  dailyVibeCheck:  { label: "Daily Vibe Check",   x: -16, z: -13, tag: "vibeCheck" },
  vibeAcademy:     { label: "Vibe Academy",        x: -28, z: 10,  tag: "academy" },
  crystalZone:     { label: "Crystal Zone",        x: -26, z: -14, tag: "crystal" },
  zenBeach:        { label: "Zen Beach",           x: -11, z: 22,  tag: "beach" },
  hoverboardRun:   { label: "Hoverboard Run",      x: 18,  z: 28,  tag: "hoverboard" },
  vibeLaunchZone:  { label: "Vibe Launch Zone",    x: 0,   z: 4,   tag: "launch" },
  ferrisWheel:     { label: "Ferris Wheel",        x: 22,  z: 5,   tag: "ferris" },
  upperVibeShop:   { label: "Upper Vibe Shop",     x: 0,   z: 10,   tag: "shop" },
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
  hoverboard:  "#00E5FF",
  launch:      "#00E5FF",
  ferris:      "#FFD700",
  shop:        "#FFC060",
};

// ═══════════════════════════════════════════════════════════════════
// SHOP — upper Vibe Shop placeholder config
// ═══════════════════════════════════════════════════════════════════
// This config defines the shop's layout. The actual shop visual
// (UpperVibeShop.jsx) will be built as a separate component.
export const SHOP = {
  pos: { x: 0, z: 10 },
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
// LAUNCH PADS — future placement config (not yet connected)
// ═══════════════════════════════════════════════════════════════════
// When the Launch Pad feature is built, these positions will be
// passed directly to the new LaunchPad component(s).
// For now they are 100% inert — defined here so they're ready to use.
export const LAUNCH_PADS = {
  "pad-lounge":   { x: -10, z: -24, hint: "Plaza–Lounge corridor" },
  "pad-library":  { x: 14,  z: -24, hint: "Library corridor" },
  "pad-academy":  { x: -26, z: -4,  hint: "Academy approach" },
  "pad-crystal":  { x: -14, z: -8,  hint: "Dome–Crystal corridor" },
};

// ═══════════════════════════════════════════════════════════════════
// VIBE COINS — sky/fetch coin placement config (not yet connected)
// ═══════════════════════════════════════════════════════════════════
// Coins float in the sky above the city. Defined as inert config
// for the future VibeCoin component.
export const VIBE_COINS = [
  { id: "token-music",  x: 0,   y: 10, z: -26, label: "Music" },
  { id: "token-beach",  x: 0,   y: 10, z: 26,  label: "Beach" },
  { id: "token-lounge", x: -22, y: 10, z: -26, label: "Lounge" },
  { id: "token-dome",   x: -13, y: 10, z: 3,   label: "Visualizer" },
  { id: "token-ferris",  x: 22, y: 12, z: 5,   label: "Ferris" },
];

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