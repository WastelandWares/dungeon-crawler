// ============================================================
//  VERSION — increment on every deploy
// ============================================================
export const VERSION = '0.9.0';
export const BUILD_DATE = '2026-03-11';
export const RECENT_CHANGES = [
  'D&D 3.5e leveling — feats, class progression, Fighter BAB/saves, ability scores every 4 levels',
  'Combat visual feedback — floating damage numbers, hit/miss flash, screen shake on crits, d20 roll display',
  'Textured floors & ceilings (stone, cobblestone, wood beams)',
  'Trigger system — keys, locked doors, buttons & gates',
  'Death respawn fix, mobile turn speed, touch door/stair interact',
  'Bounty board quest system — kill, explore & survive quests',
];

// ============================================================
//  CONFIG — tweak these to change game feel
// ============================================================
export const CFG = {
  renderWidth: 480,
  renderHeight: 300,
  fov: Math.PI / 3,
  mapSize: 21,         // must be odd for maze gen
  tileSize: 1,
  moveSpeed: 2.8,
  rotSpeed: 2.0,
  mouseScale: 0.0012,
  torchRadius: 8,
  torchFlicker: 0.15,
  maxMessages: 5,
  messageDuration: 4000,
  texSize: 64,           // wall texture resolution (pixels)
  mossyFloorThreshold: 5, // floor depth where mossy textures appear
  interactRange: 2.0,    // max distance for NPC interaction
};
