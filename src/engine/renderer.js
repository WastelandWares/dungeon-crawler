// ============================================================
//  RENDERING — Raycaster with procedural wall textures
// ============================================================
import { CFG } from '../config.js';
import { dist } from '../utils.js';
import { game, getMapSize } from '../game/state.js';
import { TILE } from '../game/entities.js';
import { generateTextures } from './textures.js';

let canvas, ctx;
let textures = null;
let frameBuffer = null;
let frameImageData = null;

const TEX_SIZE = 64;

// Pre-computed starfield for the void background
const VOID_W = 960, VOID_H = 300;
let voidPixels = null;

function generateVoidBackground() {
  voidPixels = new Uint8ClampedArray(VOID_W * VOID_H * 4);

  // Horizon line sits at 60% down — sky above, ground below
  const horizonY = Math.floor(VOID_H * 0.6);

  // Simple pseudo-random from seed
  function hash(n) { return ((n * 374761393 + 668265263) >>> 0) / 4294967296; }

  // --- Pass 1: Sky gradient (deep blue to warm sunset at horizon) ---
  for (let y = 0; y < horizonY; y++) {
    const t = y / horizonY; // 0 at top, 1 at horizon
    for (let x = 0; x < VOID_W; x++) {
      const i = (y * VOID_W + x) * 4;
      // Top: deep twilight blue, bottom: warm amber glow at horizon
      voidPixels[i]     = Math.floor(15 + t * 120);       // R
      voidPixels[i + 1] = Math.floor(18 + t * 60);        // G
      voidPixels[i + 2] = Math.floor(50 + (1 - t) * 80);  // B
      voidPixels[i + 3] = 255;
    }
  }

  // --- Pass 2: Stars in the upper sky ---
  for (let s = 0; s < 200; s++) {
    const sx = Math.floor(hash(s) * VOID_W);
    const sy = Math.floor(hash(s + 1000) * horizonY * 0.7);
    const brightness = 80 + Math.floor(hash(s + 2000) * 175);
    const i = (sy * VOID_W + sx) * 4;
    voidPixels[i]     = Math.min(255, voidPixels[i] + brightness);
    voidPixels[i + 1] = Math.min(255, voidPixels[i + 1] + Math.floor(brightness * 0.9));
    voidPixels[i + 2] = Math.min(255, voidPixels[i + 2] + Math.floor(brightness * 0.95));
  }

  // --- Pass 3: Distant mountains (3 layered ranges) ---
  const ranges = [
    { baseY: horizonY - 15, amplitude: 35, freq: 0.008, color: [35, 30, 50] },  // far: purple-grey
    { baseY: horizonY - 5,  amplitude: 28, freq: 0.015, color: [28, 35, 28] },   // mid: dark green
    { baseY: horizonY + 5,  amplitude: 20, freq: 0.025, color: [20, 28, 18] },   // near: deep forest
  ];

  for (const range of ranges) {
    for (let x = 0; x < VOID_W; x++) {
      // Multi-octave terrain height
      let h = 0;
      h += Math.sin(x * range.freq) * range.amplitude;
      h += Math.sin(x * range.freq * 2.3 + 1.7) * range.amplitude * 0.4;
      h += Math.sin(x * range.freq * 5.1 + 3.2) * range.amplitude * 0.15;
      const peakY = Math.floor(range.baseY - h);

      for (let y = Math.max(0, peakY); y < VOID_H; y++) {
        const i = (y * VOID_W + x) * 4;
        // Only paint if darker than what's there (layered)
        const existing = voidPixels[i] + voidPixels[i + 1] + voidPixels[i + 2];
        const proposed = range.color[0] + range.color[1] + range.color[2];
        if (y <= peakY + 2 || proposed < existing) {
          // Slight shading variation on slopes
          const slope = Math.sin(x * range.freq) * 0.5 + 0.5;
          const shade = 0.8 + slope * 0.4;
          voidPixels[i]     = Math.floor(range.color[0] * shade);
          voidPixels[i + 1] = Math.floor(range.color[1] * shade);
          voidPixels[i + 2] = Math.floor(range.color[2] * shade);
        }
      }
    }
  }

  // --- Pass 4: Treeline silhouettes on the nearest range ---
  for (let t = 0; t < 120; t++) {
    const tx = Math.floor(hash(t + 5000) * VOID_W);
    const treeH = 8 + Math.floor(hash(t + 5500) * 18);
    const treeW = 3 + Math.floor(hash(t + 6000) * 5);

    // Find the ground level at this x (nearest mountain range)
    const nearRange = ranges[2];
    let groundH = 0;
    groundH += Math.sin(tx * nearRange.freq) * nearRange.amplitude;
    groundH += Math.sin(tx * nearRange.freq * 2.3 + 1.7) * nearRange.amplitude * 0.4;
    groundH += Math.sin(tx * nearRange.freq * 5.1 + 3.2) * nearRange.amplitude * 0.15;
    const groundY = Math.floor(nearRange.baseY - groundH);

    // Draw a triangular tree (conifer silhouette)
    for (let dy = 0; dy < treeH; dy++) {
      const width = Math.floor(treeW * (dy / treeH));
      const py = groundY - treeH + dy;
      if (py < 0 || py >= VOID_H) continue;
      for (let dx = -width; dx <= width; dx++) {
        const px = ((tx + dx) % VOID_W + VOID_W) % VOID_W;
        const i = (py * VOID_W + px) * 4;
        // Dark green-black silhouette
        const shade = 0.6 + hash(t * 100 + dy) * 0.3;
        voidPixels[i]     = Math.floor(8 * shade);
        voidPixels[i + 1] = Math.floor(15 * shade);
        voidPixels[i + 2] = Math.floor(8 * shade);
      }
    }
    // Trunk
    const trunkY1 = groundY - 2;
    const trunkY2 = groundY + 3;
    for (let dy = trunkY1; dy <= trunkY2 && dy < VOID_H; dy++) {
      if (dy < 0) continue;
      const px = tx % VOID_W;
      const i = (dy * VOID_W + px) * 4;
      voidPixels[i] = 20; voidPixels[i + 1] = 12; voidPixels[i + 2] = 8;
    }
  }

  // --- Pass 5: Ground/meadow below tree line ---
  for (let y = horizonY + 15; y < VOID_H; y++) {
    const groundT = (y - horizonY - 15) / (VOID_H - horizonY - 15);
    for (let x = 0; x < VOID_W; x++) {
      const i = (y * VOID_W + x) * 4;
      // Only paint ground if pixel is still sky-colored (not mountain)
      const existingBrightness = voidPixels[i] + voidPixels[i + 1] + voidPixels[i + 2];
      if (existingBrightness > 100) {
        // Dark ground with grass variation
        const grass = Math.sin(x * 0.3 + y * 0.2) * 0.5 + 0.5;
        voidPixels[i]     = Math.floor(18 + grass * 8 + groundT * 5);
        voidPixels[i + 1] = Math.floor(30 + grass * 12 - groundT * 10);
        voidPixels[i + 2] = Math.floor(12 + grass * 4);
      }
    }
  }

  // --- Pass 6: Moon ---
  const moonX = Math.floor(VOID_W * 0.75);
  const moonY = Math.floor(VOID_H * 0.18);
  const moonR = 18;
  for (let dy = -moonR - 1; dy <= moonR + 1; dy++) {
    for (let dx = -moonR - 1; dx <= moonR + 1; dx++) {
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r > moonR + 1) continue;
      const px = ((moonX + dx) % VOID_W + VOID_W) % VOID_W;
      const py = moonY + dy;
      if (py < 0 || py >= VOID_H) continue;
      const i = (py * VOID_W + px) * 4;
      if (r <= moonR) {
        // Moon surface with craters
        const crater1 = Math.sqrt((dx + 4) ** 2 + (dy - 3) ** 2) < 4 ? 0.85 : 1;
        const crater2 = Math.sqrt((dx - 6) ** 2 + (dy + 2) ** 2) < 3 ? 0.88 : 1;
        const shading = Math.max(0.6, 1 - dx / moonR * 0.3); // slight terminator
        const b = 200 * shading * crater1 * crater2;
        voidPixels[i]     = Math.floor(b * 0.95);
        voidPixels[i + 1] = Math.floor(b * 0.92);
        voidPixels[i + 2] = Math.floor(b * 0.85);
      } else {
        // Glow
        const glow = Math.max(0, 1 - (r - moonR));
        voidPixels[i]     = Math.min(255, voidPixels[i] + Math.floor(glow * 60));
        voidPixels[i + 1] = Math.min(255, voidPixels[i + 1] + Math.floor(glow * 55));
        voidPixels[i + 2] = Math.min(255, voidPixels[i + 2] + Math.floor(glow * 45));
      }
    }
  }

  // --- Pass 7: Atmospheric haze at horizon ---
  for (let y = horizonY - 20; y < horizonY + 10; y++) {
    if (y < 0 || y >= VOID_H) continue;
    const hazeDist = Math.abs(y - horizonY);
    const hazeAlpha = Math.max(0, 1 - hazeDist / 20) * 0.3;
    for (let x = 0; x < VOID_W; x++) {
      const i = (y * VOID_W + x) * 4;
      // Warm amber haze
      voidPixels[i]     = Math.min(255, Math.floor(voidPixels[i] * (1 - hazeAlpha) + 140 * hazeAlpha));
      voidPixels[i + 1] = Math.min(255, Math.floor(voidPixels[i + 1] * (1 - hazeAlpha) + 90 * hazeAlpha));
      voidPixels[i + 2] = Math.min(255, Math.floor(voidPixels[i + 2] * (1 - hazeAlpha) + 50 * hazeAlpha));
    }
  }
}

export function initRenderer(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  textures = generateTextures();
  generateVoidBackground();
}

function resizeCanvas() {
  canvas.width = CFG.renderWidth;
  canvas.height = CFG.renderHeight;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  frameImageData = null; // force re-creation
}

/** Simple hash to pick stone vs brick for a given map cell */
function tileHash(mx, my) {
  return ((mx * 374761393 + my * 668265263) >>> 0) % 100;
}

/** Choose texture data for a given tile hit */
function pickTexture(tile, mapX, mapY) {
  if (tile === TILE.DOOR) return textures.wood;
  if (tile === TILE.LOCKED_DOOR) return textures.locked_door;
  if (tile === TILE.GATE) return textures.gate;
  if (tile === TILE.PAINTING) return textures['painting' + (tileHash(mapX, mapY) % 4)];
  if (tile === TILE.DUNGEON_ENTRANCE) return textures.dungeon_entrance;

  // Town mode uses lighter stone
  if (game.mode === 'town') {
    return textures.town_stone;
  }

  const floor = game.floor || 1;
  if (floor >= 5) return textures.mossy;
  // Mix stone and brick for variety — ~25% brick
  if (tileHash(mapX, mapY) < 25) return textures.brick;
  return textures.stone;
}

export function castRay(ox, oy, angle) {
  const sin = Math.sin(angle), cos = Math.cos(angle);
  const stepX = cos >= 0 ? 1 : -1;
  const stepY = sin >= 0 ? 1 : -1;

  let mapX = Math.floor(ox), mapY = Math.floor(oy);
  let sideDistX, sideDistY;
  const deltaDistX = Math.abs(1 / cos) || 1e10;
  const deltaDistY = Math.abs(1 / sin) || 1e10;

  if (cos >= 0) sideDistX = (mapX + 1 - ox) * deltaDistX;
  else sideDistX = (ox - mapX) * deltaDistX;
  if (sin >= 0) sideDistY = (mapY + 1 - oy) * deltaDistY;
  else sideDistY = (oy - mapY) * deltaDistY;

  const currentMapSize = getMapSize();
  let side = 0;
  for (let i = 0; i < 40; i++) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }
    if (mapX < 0 || mapX >= currentMapSize || mapY < 0 || mapY >= currentMapSize) break;
    const tile = game.map[mapY][mapX];
    if (tile === TILE.WALL || tile === TILE.DOOR || tile === TILE.DUNGEON_ENTRANCE || tile === TILE.LOCKED_DOOR || tile === TILE.GATE || tile === TILE.PAINTING) {
      let perpDist;
      if (side === 0) perpDist = sideDistX - deltaDistX;
      else perpDist = sideDistY - deltaDistY;
      return { dist: perpDist, side, tile, mapX, mapY };
    }
  }
  return { dist: 40, side: 0, tile: TILE.WALL, mapX: 0, mapY: 0 };
}

export function renderScene(now) {
  const p = game.player;
  const w = CFG.renderWidth, h = CFG.renderHeight;

  const isTown = game.mode === 'town';

  // Torch flicker — town is steady and bright, dungeon flickers
  const torchIntensity = isTown ? 1.0 : (1.0 + Math.sin(now * 0.006) * CFG.torchFlicker * 0.5
    + Math.sin(now * 0.013) * CFG.torchFlicker * 0.3
    + Math.sin(now * 0.027) * CFG.torchFlicker * 0.2);

  // Town has much brighter/farther effective torch radius
  const effectiveTorchRadius = isTown ? 30 : CFG.torchRadius;

  // Allocate frame buffer once (reuse across frames)
  if (!frameImageData || frameImageData.width !== w || frameImageData.height !== h) {
    frameImageData = ctx.createImageData(w, h);
  }
  const fb = frameImageData.data;

  // Fill frame buffer with black — void panorama is painted per-column only where rays escape
  for (let i = 0; i < fb.length; i += 4) {
    fb[i] = 0; fb[i + 1] = 0; fb[i + 2] = 0; fb[i + 3] = 255;
  }
  const angleOffset = Math.floor(((p.angle / (Math.PI * 2)) % 1 + 1) % 1 * VOID_W);

  // Select floor/ceiling textures based on mode
  const floorTex = isTown ? textures.floor_town : textures.floor_stone;
  const ceilTex = isTown ? textures.ceiling_town : textures.ceiling_dark;

  // Raycast walls — write textured columns directly to frame buffer
  const zBuffer = new Float32Array(w);
  const sinA = Math.sin(p.angle), cosA = Math.cos(p.angle);

  for (let x = 0; x < w; x++) {
    const rayAngle = p.angle - CFG.fov / 2 + (x / w) * CFG.fov;
    const hit = castRay(p.x, p.y, rayAngle);
    zBuffer[x] = hit.dist;

    const escaped = hit.dist >= 39; // ray escaped the map

    const clampedDist = Math.max(0.3, hit.dist);
    const lineH = Math.min(h * 1.5, h / clampedDist);
    const drawStart = Math.max(0, Math.floor((h - lineH) / 2));
    const drawEnd = Math.min(h - 1, Math.floor((h + lineH) / 2));

    // For escaped rays in town: draw void panorama only in the wall strip
    if (escaped && isTown) {
      const vx = (Math.floor(x / w * VOID_W * (CFG.fov / (Math.PI * 2))) + angleOffset) % VOID_W;
      for (let y = drawStart; y <= drawEnd; y++) {
        const vy = Math.floor(y / h * VOID_H);
        const vi = (vy * VOID_W + vx) * 4;
        const fi = (y * w + x) * 4;
        fb[fi]     = voidPixels[vi];
        fb[fi + 1] = voidPixels[vi + 1];
        fb[fi + 2] = voidPixels[vi + 2];
      }
    }

    // Distance-based torch brightness
    const brightness = Math.max(0, 1 - hit.dist / effectiveTorchRadius) * torchIntensity;
    const sideShade = hit.side ? 0.7 : 1.0;
    const light = brightness * sideShade;

    if (escaped || light < 0.005) {
      // Still render floor/ceiling for escaped rays so the roof/ground looks solid
      if (escaped && isTown) {
        const rayCos = Math.cos(rayAngle);
        const raySin = Math.sin(rayAngle);
        const FLOOR_TILE = TEX_SIZE * 2;
        // Floor
        for (let y = drawEnd + 1; y < h; y++) {
          const rowDist = h / (2.0 * y - h);
          const floorBrightness = Math.max(0, 1 - rowDist / effectiveTorchRadius) * torchIntensity;
          if (floorBrightness < 0.005) continue;
          const floorX = p.x + rowDist * rayCos;
          const floorY = p.y + rowDist * raySin;
          const tx = (Math.floor(floorX * FLOOR_TILE) & (TEX_SIZE - 1));
          const ty = (Math.floor(floorY * FLOOR_TILE) & (TEX_SIZE - 1));
          const texIdx = (ty * TEX_SIZE + tx) * 4;
          const fbIdx = (y * w + x) * 4;
          fb[fbIdx]     = Math.floor(floorTex[texIdx] * floorBrightness);
          fb[fbIdx + 1] = Math.floor(floorTex[texIdx + 1] * floorBrightness);
          fb[fbIdx + 2] = Math.floor(floorTex[texIdx + 2] * floorBrightness);
        }
        // Ceiling
        for (let y = drawStart - 1; y >= 0; y--) {
          const rowDist = h / (h - 2.0 * y);
          const ceilBrightness = Math.max(0, 1 - rowDist / effectiveTorchRadius) * torchIntensity;
          if (ceilBrightness < 0.005) break;
          const ceilX = p.x + rowDist * rayCos;
          const ceilY = p.y + rowDist * raySin;
          const tx = (Math.floor(ceilX * FLOOR_TILE) & (TEX_SIZE - 1));
          const ty = (Math.floor(ceilY * FLOOR_TILE) & (TEX_SIZE - 1));
          const texIdx = (ty * TEX_SIZE + tx) * 4;
          const fbIdx = (y * w + x) * 4;
          fb[fbIdx]     = Math.floor(ceilTex[texIdx] * ceilBrightness);
          fb[fbIdx + 1] = Math.floor(ceilTex[texIdx + 1] * ceilBrightness);
          fb[fbIdx + 2] = Math.floor(ceilTex[texIdx + 2] * ceilBrightness);
        }
      }
      if (!escaped) continue; // too dark to see
      continue; // escaped ray — already handled above
    }

    // Texture X coordinate — where on the wall surface the ray hit
    let wallX;
    if (hit.side === 0) {
      // Hit vertical (N/S) wall face
      wallX = p.y + hit.dist * Math.sin(rayAngle);
    } else {
      // Hit horizontal (E/W) wall face
      wallX = p.x + hit.dist * Math.cos(rayAngle);
    }
    wallX -= Math.floor(wallX); // fractional part [0, 1)

    const texCol = Math.floor(wallX * TEX_SIZE) & (TEX_SIZE - 1);
    const tex = pickTexture(hit.tile, hit.mapX, hit.mapY);

    // Draw textured wall column
    const texStep = TEX_SIZE / lineH;
    let texPos = (drawStart - (h - lineH) / 2) * texStep;

    for (let y = drawStart; y <= drawEnd; y++) {
      const texY = Math.floor(texPos) & (TEX_SIZE - 1);
      texPos += texStep;

      const texIdx = (texY * TEX_SIZE + texCol) * 4;
      const fbIdx = (y * w + x) * 4;

      fb[fbIdx]     = Math.floor(tex[texIdx] * light);
      fb[fbIdx + 1] = Math.floor(tex[texIdx + 1] * light);
      fb[fbIdx + 2] = Math.floor(tex[texIdx + 2] * light);
      // fb[fbIdx + 3] already 255
    }

    const rayCos = Math.cos(rayAngle);
    const raySin = Math.sin(rayAngle);

    // Textured floor (tile 2x per world unit for detail)
    const FLOOR_TILE = TEX_SIZE * 2;
    for (let y = drawEnd + 1; y < h; y++) {
      const rowDist = h / (2.0 * y - h);
      const floorBrightness = Math.max(0, 1 - rowDist / effectiveTorchRadius) * torchIntensity;
      if (floorBrightness < 0.005) continue;

      const floorX = p.x + rowDist * rayCos;
      const floorY = p.y + rowDist * raySin;

      const tx = (Math.floor(floorX * FLOOR_TILE) & (TEX_SIZE - 1));
      const ty = (Math.floor(floorY * FLOOR_TILE) & (TEX_SIZE - 1));
      const texIdx = (ty * TEX_SIZE + tx) * 4;
      const fbIdx = (y * w + x) * 4;

      fb[fbIdx]     = Math.floor(floorTex[texIdx] * floorBrightness);
      fb[fbIdx + 1] = Math.floor(floorTex[texIdx + 1] * floorBrightness);
      fb[fbIdx + 2] = Math.floor(floorTex[texIdx + 2] * floorBrightness);
    }

    // Textured ceiling (mirror of floor, 2x tiling)
    for (let y = drawStart - 1; y >= 0; y--) {
      const rowDist = h / (h - 2.0 * y);
      const ceilBrightness = Math.max(0, 1 - rowDist / effectiveTorchRadius) * torchIntensity;
      if (ceilBrightness < 0.005) break;

      const ceilX = p.x + rowDist * rayCos;
      const ceilY = p.y + rowDist * raySin;

      const tx = (Math.floor(ceilX * FLOOR_TILE) & (TEX_SIZE - 1));
      const ty = (Math.floor(ceilY * FLOOR_TILE) & (TEX_SIZE - 1));
      const texIdx = (ty * TEX_SIZE + tx) * 4;
      const fbIdx = (y * w + x) * 4;

      fb[fbIdx]     = Math.floor(ceilTex[texIdx] * ceilBrightness);
      fb[fbIdx + 1] = Math.floor(ceilTex[texIdx + 1] * ceilBrightness);
      fb[fbIdx + 2] = Math.floor(ceilTex[texIdx + 2] * ceilBrightness);
    }
  }

  // Blit the pixel buffer to canvas
  ctx.putImageData(frameImageData, 0, 0);

  // Render sprites (monsters + items + NPCs) — drawn on top via canvas API
  const sprites = [];
  for (const m of game.monsters) {
    if (!m.alive) continue;
    sprites.push({ x: m.x, y: m.y, icon: m.icon, color: m.color, scale: 1.0, isMonster: true, entity: m });
  }
  for (const item of game.items) {
    if (item.picked) continue;
    sprites.push({ x: item.x, y: item.y, icon: item.icon, color: item.color, scale: 0.6 });
  }
  // Town NPCs as billboard sprites (non-hostile)
  if (game.town && game.town.npcs) {
    for (const npc of game.town.npcs) {
      sprites.push({ x: npc.x, y: npc.y, icon: npc.icon, color: npc.minimapColor || '#c9a84c', scale: 1.0, isNPC: true, entity: npc });
    }
  }
  // Stairs marker (dungeon only)
  if (game.stairPos) {
    sprites.push({ x: game.stairPos[0] + 0.5, y: game.stairPos[1] + 0.5, icon: '\u{1FA9C}', color: '#7cafc2', scale: 0.7 });
  }

  // Sort back to front
  sprites.sort((a, b) => dist(p.x, p.y, b.x, b.y) - dist(p.x, p.y, a.x, a.y));

  for (const spr of sprites) {
    const dx = spr.x - p.x, dy = spr.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.2 || d > effectiveTorchRadius) continue;

    const sprAngle = Math.atan2(dy, dx) - p.angle;
    let normAngle = ((sprAngle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

    // Check if on screen
    const screenX = w / 2 + (normAngle / (CFG.fov / 2)) * (w / 2);
    if (screenX < -100 || screenX > w + 100) continue;

    const sprH = (h / d) * spr.scale;
    const sprW = sprH;
    const drawY = (h - sprH) / 2;

    const spriteBrightness = Math.max(0, 1 - d / effectiveTorchRadius) * torchIntensity;

    // Depth test
    const startX = Math.max(0, Math.floor(screenX - sprW / 2));
    const endX = Math.min(w, Math.ceil(screenX + sprW / 2));
    let visible = false;
    for (let sx = startX; sx < endX; sx++) {
      if (zBuffer[sx] > d) { visible = true; break; }
    }
    if (!visible) continue;

    // Draw sprite as emoji text
    ctx.save();
    ctx.globalAlpha = spriteBrightness;
    ctx.font = `${Math.floor(sprH)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = spr.color || '#ffffff';
    ctx.fillText(spr.icon, screenX, h / 2);

    // HP bar for monsters
    if (spr.isMonster && spr.entity.hp < spr.entity.maxHp) {
      const barW = sprW * 0.8;
      const barH = 3;
      const barX = screenX - barW / 2;
      const barY = drawY - 6;
      const hpPct = spr.entity.hp / spr.entity.maxHp;
      ctx.globalAlpha = spriteBrightness * 0.8;
      ctx.fillStyle = '#300';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = hpPct > 0.5 ? '#4a4' : hpPct > 0.25 ? '#ca4' : '#c44';
      ctx.fillRect(barX, barY, barW * hpPct, barH);
    }

    // NPC name label above sprite
    if (spr.isNPC && d < 4) {
      ctx.globalAlpha = spriteBrightness * 0.9;
      ctx.fillStyle = '#c9a84c';
      ctx.font = `${Math.max(8, Math.floor(sprH * 0.2))}px Cinzel, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(spr.entity.name, screenX, drawY - 2);
    }
    ctx.restore();
  }

  // Vignette overlay — lighter in town
  const vignetteAlpha = isTown ? 0.25 : 0.6;
  const vgrd = ctx.createRadialGradient(w/2, h/2, h * 0.3, w/2, h/2, h * 0.9);
  vgrd.addColorStop(0, 'rgba(0,0,0,0)');
  vgrd.addColorStop(1, `rgba(0,0,0,${vignetteAlpha})`);
  ctx.fillStyle = vgrd;
  ctx.fillRect(0, 0, w, h);

  // Crosshair
  ctx.strokeStyle = 'rgba(200,170,80,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w/2 - 8, h/2); ctx.lineTo(w/2 + 8, h/2);
  ctx.moveTo(w/2, h/2 - 8); ctx.lineTo(w/2, h/2 + 8);
  ctx.stroke();
}
