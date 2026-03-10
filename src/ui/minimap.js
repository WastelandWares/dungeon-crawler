// ============================================================
//  MINIMAP
// ============================================================
import { CFG } from '../config.js';
import { dist } from '../utils.js';
import { game, getMapSize } from '../game/state.js';
import { TILE } from '../game/entities.js';

let mmCanvas, mmCtx;

export function initMinimap(canvasEl) {
  mmCanvas = canvasEl;
  mmCtx = mmCanvas.getContext('2d');
}

export function renderMinimap() {
  const mm = mmCanvas;
  const mc = mmCtx;
  const size = 7; // tiles visible per side
  const tileW = mm.width / (size * 2 + 1);
  const p = game.player;
  const cx = Math.floor(p.x), cy = Math.floor(p.y);

  mc.fillStyle = '#0a0806';
  mc.fillRect(0, 0, mm.width, mm.height);

  const mapSize = getMapSize();
  const isTown = game.mode === 'town';

  for (let dy = -size; dy <= size; dy++) {
    for (let dx = -size; dx <= size; dx++) {
      const mx = cx + dx, my = cy + dy;
      if (mx < 0 || mx >= mapSize || my < 0 || my >= mapSize) continue;
      if (!game.explored[my][mx]) continue;

      const sx = (dx + size) * tileW;
      const sy = (dy + size) * tileW;
      const tile = game.map[my][mx];

      if (tile === TILE.WALL) mc.fillStyle = isTown ? '#5a4a32' : '#3a2a1a';
      else if (tile === TILE.DOOR) mc.fillStyle = '#6b4c30';
      else if (tile === TILE.LOCKED_DOOR) mc.fillStyle = '#8b5c20';
      else if (tile === TILE.GATE) mc.fillStyle = '#4a4a5a';
      else if (tile === TILE.PAINTING) mc.fillStyle = isTown ? '#6a5a3a' : '#4a3a2a';
      else if (tile === TILE.BUTTON) mc.fillStyle = '#5a5a6a';
      else if (tile === TILE.STAIRS) mc.fillStyle = '#7cafc2';
      else if (tile === TILE.DUNGEON_ENTRANCE) mc.fillStyle = '#2a1040';
      else if (tile === TILE.TOWN_FLOOR) mc.fillStyle = '#2a2518';
      else mc.fillStyle = '#1a150f';

      mc.fillRect(sx, sy, tileW, tileW);
    }
  }

  // Monsters on minimap
  for (const m of game.monsters) {
    if (!m.alive) continue;
    const dx = m.x - cx, dy = m.y - cy;
    if (Math.abs(dx) > size || Math.abs(dy) > size) continue;
    const md = dist(p.x, p.y, m.x, m.y);
    if (md > CFG.torchRadius) continue;
    mc.fillStyle = '#c44';
    mc.fillRect((dx + size) * tileW + tileW * 0.25, (dy + size) * tileW + tileW * 0.25, tileW * 0.5, tileW * 0.5);
  }

  // Items on minimap
  for (const item of game.items) {
    if (item.picked) continue;
    const dx = item.x - cx, dy = item.y - cy;
    if (Math.abs(dx) > size || Math.abs(dy) > size) continue;
    mc.fillStyle = '#c9a84c';
    mc.fillRect((dx + size) * tileW + tileW * 0.3, (dy + size) * tileW + tileW * 0.3, tileW * 0.4, tileW * 0.4);
  }

  // Town NPCs on minimap
  if (game.town && game.town.npcs) {
    for (const npc of game.town.npcs) {
      const dx = npc.x - cx, dy = npc.y - cy;
      if (Math.abs(dx) > size || Math.abs(dy) > size) continue;
      mc.fillStyle = npc.minimapColor || '#c9a84c';
      const dotX = (dx + size) * tileW + tileW * 0.15;
      const dotY = (dy + size) * tileW + tileW * 0.15;
      mc.fillRect(dotX, dotY, tileW * 0.7, tileW * 0.7);
    }
  }

  // Player arrow
  const pcx = size * tileW + tileW / 2;
  const pcy = size * tileW + tileW / 2;
  mc.save();
  mc.translate(pcx, pcy);
  mc.rotate(p.angle);
  mc.fillStyle = '#c9a84c';
  mc.beginPath();
  mc.moveTo(5, 0);
  mc.lineTo(-3, -3);
  mc.lineTo(-3, 3);
  mc.closePath();
  mc.fill();
  mc.restore();
}
