// ============================================================
//  PROCEDURAL TEXTURE GENERATOR — wall textures for raycaster
// ============================================================

const TEX_SIZE = 64;

/** Pseudo-random seeded noise for deterministic textures */
function hashNoise(x, y, seed) {
  let n = (x * 374761393 + y * 668265263 + seed * 1274126177) | 0;
  n = (n ^ (n >> 13)) * 1103515245;
  n = n ^ (n >> 16);
  return (n & 0x7fffffff) / 0x7fffffff;
}

/** Create an offscreen canvas and return its 2D context */
function makeCanvas() {
  const c = document.createElement('canvas');
  c.width = TEX_SIZE;
  c.height = TEX_SIZE;
  return c.getContext('2d');
}

/** Apply per-pixel noise to an ImageData buffer */
function addNoise(data, amount, seed) {
  for (let i = 0; i < data.length; i += 4) {
    const px = (i / 4) | 0;
    const x = px % TEX_SIZE;
    const y = (px / TEX_SIZE) | 0;
    const n = (hashNoise(x, y, seed) - 0.5) * amount;
    data[i]     = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
}

/** Set pixel in RGBA array */
function setPixel(data, x, y, r, g, b, a) {
  if (x < 0 || x >= TEX_SIZE || y < 0 || y >= TEX_SIZE) return;
  const i = (y * TEX_SIZE + x) * 4;
  data[i] = r;
  data[i + 1] = g;
  data[i + 2] = b;
  data[i + 3] = a;
}

function getPixel(data, x, y) {
  const i = (y * TEX_SIZE + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}

// ---- Stone Texture ----
function generateStone() {
  const ctx = makeCanvas();
  const imgData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
  const d = imgData.data;

  // Fill with base stone color
  const baseR = 72, baseG = 62, baseB = 52;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = baseR; d[i + 1] = baseG; d[i + 2] = baseB; d[i + 3] = 255;
  }

  // Draw stone blocks with mortar lines
  const mortarR = 40, mortarG = 35, mortarB = 30;
  const rows = [0, 10, 22, 34, 48, 64]; // irregular row heights

  for (let row = 0; row < rows.length - 1; row++) {
    const y0 = rows[row];
    const y1 = rows[row + 1];

    // Mortar horizontal line
    for (let x = 0; x < TEX_SIZE; x++) {
      setPixel(d, x, y0, mortarR, mortarG, mortarB, 255);
      if (y0 + 1 < TEX_SIZE) setPixel(d, x, y0 + 1, mortarR + 5, mortarG + 5, mortarB + 5, 255);
    }

    // Vertical mortar — offset every other row
    const offset = (row % 2) ? 8 : 0;
    const blockWidths = [16, 20, 14, 18];
    let bx = offset;
    let bi = 0;
    while (bx < TEX_SIZE) {
      const w = blockWidths[bi % blockWidths.length];
      // Draw vertical mortar line
      for (let y = y0; y < y1 && y < TEX_SIZE; y++) {
        setPixel(d, bx % TEX_SIZE, y, mortarR, mortarG, mortarB, 255);
        if ((bx + 1) % TEX_SIZE !== bx % TEX_SIZE) {
          setPixel(d, (bx + 1) % TEX_SIZE, y, mortarR + 5, mortarG + 5, mortarB + 5, 255);
        }
      }

      // Tint each block slightly differently
      const tint = (hashNoise(bi, row, 42) - 0.5) * 16;
      for (let y = y0 + 2; y < y1 && y < TEX_SIZE; y++) {
        for (let x = bx + 2; x < bx + w && x < bx + w; x++) {
          const px = x % TEX_SIZE;
          const i = (y * TEX_SIZE + px) * 4;
          d[i] = Math.max(0, Math.min(255, baseR + tint));
          d[i + 1] = Math.max(0, Math.min(255, baseG + tint));
          d[i + 2] = Math.max(0, Math.min(255, baseB + tint * 0.7));
        }
      }

      bx += w;
      bi++;
    }
  }

  addNoise(d, 20, 101);
  return d;
}

// ---- Wood Texture ----
function generateWood() {
  const ctx = makeCanvas();
  const imgData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
  const d = imgData.data;

  // Vertical planks
  const plankEdges = [0, 12, 26, 40, 54, 64];

  for (let p = 0; p < plankEdges.length - 1; p++) {
    const x0 = plankEdges[p];
    const x1 = plankEdges[p + 1];
    const baseTint = (hashNoise(p, 0, 77) - 0.5) * 20;
    const baseR = 110 + baseTint;
    const baseG = 72 + baseTint * 0.6;
    const baseB = 38 + baseTint * 0.3;

    for (let y = 0; y < TEX_SIZE; y++) {
      for (let x = x0; x < x1; x++) {
        // Grain lines — subtle horizontal variation
        const grain = Math.sin(y * 0.8 + hashNoise(x, 0, p) * 6) * 8;
        const r = Math.max(0, Math.min(255, baseR + grain));
        const g = Math.max(0, Math.min(255, baseG + grain * 0.6));
        const b = Math.max(0, Math.min(255, baseB + grain * 0.3));
        setPixel(d, x, y, r, g, b, 255);
      }

      // Plank edge — dark line
      setPixel(d, x0, y, 55, 38, 20, 255);
    }
  }

  // Iron banding — two horizontal bands
  const bandColor = { r: 60, g: 62, b: 68 };
  for (const bandY of [14, 48]) {
    for (let y = bandY; y < bandY + 3 && y < TEX_SIZE; y++) {
      for (let x = 0; x < TEX_SIZE; x++) {
        const highlight = y === bandY ? 12 : 0;
        setPixel(d, x, y, bandColor.r + highlight, bandColor.g + highlight, bandColor.b + highlight, 255);
      }
    }
    // Rivet dots
    for (const rx of [6, 32, 58]) {
      if (rx < TEX_SIZE) {
        setPixel(d, rx, bandY + 1, 85, 88, 95, 255);
      }
    }
  }

  // Knot
  const knotX = 20, knotY = 36;
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      if (dx * dx + dy * dy <= 9) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        const shade = 60 + dist * 8;
        setPixel(d, knotX + dx, knotY + dy, shade, shade * 0.6, shade * 0.3, 255);
      }
    }
  }

  addNoise(d, 12, 202);
  return d;
}

// ---- Mossy Texture (stone + green moss) ----
function generateMossy() {
  // Start from stone
  const d = generateStone();

  // Add moss in mortar areas and lower portions
  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      const [r, g, b] = getPixel(d, x, y);
      // More moss toward the bottom and in dark (mortar) areas
      const bottomBias = y / TEX_SIZE;
      const isDark = (r + g + b) / 3 < 55; // mortar lines
      const mossChance = bottomBias * 0.5 + (isDark ? 0.4 : 0);

      if (hashNoise(x, y, 333) < mossChance) {
        const mossIntensity = 0.3 + hashNoise(x, y, 444) * 0.5;
        const newR = Math.floor(r * (1 - mossIntensity) + 35 * mossIntensity);
        const newG = Math.floor(g * (1 - mossIntensity) + 80 * mossIntensity);
        const newB = Math.floor(b * (1 - mossIntensity) + 30 * mossIntensity);
        setPixel(d, x, y, newR, newG, newB, 255);
      }
    }
  }

  return d;
}

// ---- Brick Texture ----
function generateBrick() {
  const ctx = makeCanvas();
  const imgData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
  const d = imgData.data;

  const mortarR = 55, mortarG = 50, mortarB = 45;
  const brickH = 8;
  const brickW = 16;

  // Fill with mortar
  for (let i = 0; i < d.length; i += 4) {
    d[i] = mortarR; d[i + 1] = mortarG; d[i + 2] = mortarB; d[i + 3] = 255;
  }

  // Draw bricks
  for (let row = 0; row < Math.ceil(TEX_SIZE / brickH); row++) {
    const yStart = row * brickH;
    const offset = (row % 2) ? brickW / 2 : 0;

    for (let col = -1; col < Math.ceil(TEX_SIZE / brickW) + 1; col++) {
      const xStart = col * brickW + offset;

      // Each brick has a slightly different tint
      const tint = (hashNoise(col, row, 55) - 0.5) * 25;
      const baseR = 130 + tint;
      const baseG = 65 + tint * 0.5;
      const baseB = 45 + tint * 0.3;

      for (let by = 1; by < brickH - 1; by++) {
        for (let bx = 1; bx < brickW - 1; bx++) {
          const px = (xStart + bx) % TEX_SIZE;
          const py = yStart + by;
          if (px < 0 || py >= TEX_SIZE) continue;
          const realPx = ((px % TEX_SIZE) + TEX_SIZE) % TEX_SIZE;
          setPixel(d, realPx, py, baseR, baseG, baseB, 255);
        }
      }
    }
  }

  addNoise(d, 15, 303);
  return d;
}

// ---- Town Stone Texture (lighter, cleaner) ----
function generateTownStone() {
  const ctx = makeCanvas();
  const imgData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
  const d = imgData.data;

  // Lighter base color — warm sandstone
  const baseR = 140, baseG = 128, baseB = 105;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = baseR; d[i + 1] = baseG; d[i + 2] = baseB; d[i + 3] = 255;
  }

  // Draw clean stone blocks with lighter mortar
  const mortarR = 110, mortarG = 100, mortarB = 82;
  const rows = [0, 12, 24, 36, 50, 64];

  for (let row = 0; row < rows.length - 1; row++) {
    const y0 = rows[row];
    const y1 = rows[row + 1];

    // Mortar horizontal line
    for (let x = 0; x < TEX_SIZE; x++) {
      setPixel(d, x, y0, mortarR, mortarG, mortarB, 255);
    }

    // Vertical mortar
    const offset = (row % 2) ? 10 : 0;
    const blockWidths = [18, 22, 14, 20];
    let bx = offset;
    let bi = 0;
    while (bx < TEX_SIZE) {
      const w = blockWidths[bi % blockWidths.length];
      for (let y = y0; y < y1 && y < TEX_SIZE; y++) {
        setPixel(d, bx % TEX_SIZE, y, mortarR, mortarG, mortarB, 255);
      }

      // Tint each block
      const tint = (hashNoise(bi, row, 88) - 0.5) * 12;
      for (let y = y0 + 1; y < y1 && y < TEX_SIZE; y++) {
        for (let x = bx + 1; x < bx + w && x < bx + w; x++) {
          const px = x % TEX_SIZE;
          const i = (y * TEX_SIZE + px) * 4;
          d[i] = Math.max(0, Math.min(255, baseR + tint));
          d[i + 1] = Math.max(0, Math.min(255, baseG + tint));
          d[i + 2] = Math.max(0, Math.min(255, baseB + tint * 0.8));
        }
      }

      bx += w;
      bi++;
    }
  }

  addNoise(d, 12, 501);
  return d;
}

// ---- Dungeon Entrance Texture (dark archway) ----
function generateDungeonEntrance() {
  const ctx = makeCanvas();
  const imgData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
  const d = imgData.data;

  // Very dark base — the void beyond
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 8; d[i + 1] = 5; d[i + 2] = 12; d[i + 3] = 255;
  }

  // Stone archway frame on left and right edges
  const frameW = 10;
  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < frameW; x++) {
      const shade = 70 + (hashNoise(x, y, 600) - 0.5) * 20;
      setPixel(d, x, y, shade, shade * 0.85, shade * 0.7, 255);
      setPixel(d, TEX_SIZE - 1 - x, y, shade, shade * 0.85, shade * 0.7, 255);
    }
  }

  // Arch top
  for (let x = 0; x < TEX_SIZE; x++) {
    for (let y = 0; y < 8; y++) {
      const shade = 65 + (hashNoise(x, y, 601) - 0.5) * 18;
      setPixel(d, x, y, shade, shade * 0.85, shade * 0.7, 255);
    }
  }

  // Subtle glowing runes inside the dark area
  const runePositions = [[28, 20], [36, 20], [32, 35], [28, 50], [36, 50]];
  for (const [rx, ry] of runePositions) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const intensity = 1 - Math.sqrt(dx * dx + dy * dy) * 0.5;
        if (intensity > 0) {
          setPixel(d, rx + dx, ry + dy,
            Math.floor(30 * intensity), Math.floor(15 * intensity), Math.floor(50 * intensity), 255);
        }
      }
    }
  }

  addNoise(d, 8, 602);
  return d;
}

// ---- Floor: Dark Stone ----
function generateFloorStone() {
  const ctx = makeCanvas();
  const imgData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
  const d = imgData.data;

  // Dark stone base
  const baseR = 38, baseG = 34, baseB = 30;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = baseR; d[i + 1] = baseG; d[i + 2] = baseB; d[i + 3] = 255;
  }

  // Irregular flagstone grid with mortar
  const mortarR = 24, mortarG = 20, mortarB = 18;
  const rows = [0, 14, 28, 44, 64];
  for (let row = 0; row < rows.length - 1; row++) {
    const y0 = rows[row];
    const y1 = rows[row + 1];
    // Horizontal mortar
    for (let x = 0; x < TEX_SIZE; x++) {
      setPixel(d, x, y0, mortarR, mortarG, mortarB, 255);
    }
    // Vertical mortar
    const offset = (row % 2) ? 10 : 0;
    const blockWidths = [20, 16, 18, 22];
    let bx = offset;
    let bi = 0;
    while (bx < TEX_SIZE) {
      const w = blockWidths[bi % blockWidths.length];
      for (let y = y0; y < y1 && y < TEX_SIZE; y++) {
        setPixel(d, bx % TEX_SIZE, y, mortarR, mortarG, mortarB, 255);
      }
      // Tint each flagstone
      const tint = (hashNoise(bi, row, 710) - 0.5) * 14;
      for (let y = y0 + 1; y < y1 && y < TEX_SIZE; y++) {
        for (let x = bx + 1; x < bx + w; x++) {
          const px = x % TEX_SIZE;
          const i = (y * TEX_SIZE + px) * 4;
          d[i]     = Math.max(0, Math.min(255, baseR + tint));
          d[i + 1] = Math.max(0, Math.min(255, baseG + tint * 0.8));
          d[i + 2] = Math.max(0, Math.min(255, baseB + tint * 0.6));
        }
      }
      bx += w;
      bi++;
    }
  }

  // Subtle crack patterns
  const cracks = [
    { sx: 8, sy: 5, ex: 22, ey: 12 },
    { sx: 40, sy: 30, ex: 55, ey: 42 },
    { sx: 15, sy: 48, ex: 30, ey: 58 },
  ];
  for (const crack of cracks) {
    const steps = Math.max(Math.abs(crack.ex - crack.sx), Math.abs(crack.ey - crack.sy));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = Math.floor(crack.sx + (crack.ex - crack.sx) * t);
      const cy = Math.floor(crack.sy + (crack.ey - crack.sy) * t);
      // Wobble
      const wx = cx + Math.floor((hashNoise(cx, cy, 720) - 0.5) * 2);
      const wy = cy;
      setPixel(d, wx & (TEX_SIZE - 1), wy & (TEX_SIZE - 1), 18, 15, 12, 255);
    }
  }

  addNoise(d, 14, 711);
  return d;
}

// ---- Ceiling: Dark Rough ----
function generateCeilingDark() {
  const ctx = makeCanvas();
  const imgData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
  const d = imgData.data;

  // Very dark base — rough rock ceiling
  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      const roughness = (hashNoise(x, y, 800) - 0.5) * 10;
      const r = Math.max(0, Math.min(255, Math.floor(18 + roughness)));
      const g = Math.max(0, Math.min(255, Math.floor(14 + roughness * 0.8)));
      const b = Math.max(0, Math.min(255, Math.floor(10 + roughness * 0.6)));
      setPixel(d, x, y, r, g, b, 255);
    }
  }

  // Occasional drip stains — darker wet patches
  const stains = [[12, 20], [35, 8], [50, 45], [22, 55], [45, 28]];
  for (const [sx, sy] of stains) {
    const radius = 3 + Math.floor(hashNoise(sx, sy, 810) * 4);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist2 = dx * dx + dy * dy;
        if (dist2 <= radius * radius) {
          const px = (sx + dx) & (TEX_SIZE - 1);
          const py = (sy + dy) & (TEX_SIZE - 1);
          const fade = 1 - Math.sqrt(dist2) / radius;
          const [or, og, ob] = getPixel(d, px, py);
          const darken = fade * 0.4;
          setPixel(d, px, py,
            Math.floor(or * (1 - darken)),
            Math.floor(og * (1 - darken)),
            Math.floor(ob * (1 - darken) + 2 * fade),
            255);
        }
      }
    }
  }

  addNoise(d, 8, 801);
  return d;
}

// ---- Floor: Town Cobblestone ----
function generateFloorTown() {
  const ctx = makeCanvas();
  const imgData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
  const d = imgData.data;

  // Warm sandstone base
  const baseR = 120, baseG = 108, baseB = 85;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = baseR; d[i + 1] = baseG; d[i + 2] = baseB; d[i + 3] = 255;
  }

  // Cobblestone pattern — rounded rectangles with mortar
  const mortarR = 88, mortarG = 78, mortarB = 60;
  const rows = [0, 12, 24, 38, 52, 64];
  for (let row = 0; row < rows.length - 1; row++) {
    const y0 = rows[row];
    const y1 = rows[row + 1];
    for (let x = 0; x < TEX_SIZE; x++) {
      setPixel(d, x, y0, mortarR, mortarG, mortarB, 255);
    }
    const offset = (row % 2) ? 8 : 0;
    const blockWidths = [14, 18, 12, 16, 20];
    let bx = offset;
    let bi = 0;
    while (bx < TEX_SIZE) {
      const w = blockWidths[bi % blockWidths.length];
      for (let y = y0; y < y1 && y < TEX_SIZE; y++) {
        setPixel(d, bx % TEX_SIZE, y, mortarR, mortarG, mortarB, 255);
      }
      const tint = (hashNoise(bi, row, 900) - 0.5) * 16;
      for (let y = y0 + 1; y < y1 && y < TEX_SIZE; y++) {
        for (let x = bx + 1; x < bx + w; x++) {
          const px = x % TEX_SIZE;
          const i = (y * TEX_SIZE + px) * 4;
          d[i]     = Math.max(0, Math.min(255, baseR + tint));
          d[i + 1] = Math.max(0, Math.min(255, baseG + tint * 0.9));
          d[i + 2] = Math.max(0, Math.min(255, baseB + tint * 0.7));
        }
      }
      bx += w;
      bi++;
    }
  }

  addNoise(d, 10, 901);
  return d;
}

// ---- Ceiling: Town Wooden Beams ----
function generateCeilingTown() {
  const ctx = makeCanvas();
  const imgData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
  const d = imgData.data;

  // Wooden plank base — warm brown
  const baseR = 85, baseG = 58, baseB = 32;
  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      // Horizontal grain
      const grain = Math.sin(x * 0.6 + hashNoise(y, 0, 950) * 4) * 6;
      const r = Math.max(0, Math.min(255, Math.floor(baseR + grain)));
      const g = Math.max(0, Math.min(255, Math.floor(baseG + grain * 0.6)));
      const b = Math.max(0, Math.min(255, Math.floor(baseB + grain * 0.3)));
      setPixel(d, x, y, r, g, b, 255);
    }
  }

  // Cross beams — darker support beams running across
  const beamColor = { r: 55, g: 38, b: 22 };
  const beamPositions = [0, 20, 42];
  for (const by of beamPositions) {
    for (let y = by; y < by + 5 && y < TEX_SIZE; y++) {
      for (let x = 0; x < TEX_SIZE; x++) {
        const highlight = (y === by) ? 10 : (y === by + 4) ? -5 : 0;
        setPixel(d, x, y,
          beamColor.r + highlight,
          beamColor.g + highlight,
          beamColor.b + highlight, 255);
      }
    }
  }

  // Plank gaps — thin dark lines between planks
  const plankEdges = [0, 16, 30, 46, 58, 64];
  for (const edge of plankEdges) {
    for (let y = 0; y < TEX_SIZE; y++) {
      if (edge < TEX_SIZE) {
        setPixel(d, edge, y, 40, 28, 16, 255);
      }
    }
  }

  addNoise(d, 10, 951);
  return d;
}

// ---- Locked Door Texture (wood + iron lock plate) ----
function generateLockedDoor() {
  // Start from wood texture
  const d = generateWood();

  // Iron lock plate in center
  const plateX = 24, plateY = 24, plateW = 16, plateH = 18;
  for (let y = plateY; y < plateY + plateH; y++) {
    for (let x = plateX; x < plateX + plateW; x++) {
      const edge = (x === plateX || x === plateX + plateW - 1 || y === plateY || y === plateY + plateH - 1);
      if (edge) {
        setPixel(d, x, y, 45, 48, 55, 255);
      } else {
        const noise = (hashNoise(x, y, 1100) - 0.5) * 8;
        setPixel(d, x, y, Math.floor(58 + noise), Math.floor(60 + noise), Math.floor(66 + noise), 255);
      }
    }
  }

  // Keyhole — dark circle with slot below
  const kx = 32, ky = 32;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx * dx + dy * dy <= 4) {
        setPixel(d, kx + dx, ky + dy, 12, 10, 8, 255);
      }
    }
  }
  // Slot below keyhole
  for (let y = ky + 2; y < ky + 7; y++) {
    setPixel(d, kx, y, 12, 10, 8, 255);
  }

  return d;
}

// ---- Gate / Portcullis Texture ----
function generateGate() {
  const ctx = makeCanvas();
  const imgData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
  const d = imgData.data;

  // Dark background (visible through bars)
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 6; d[i + 1] = 4; d[i + 2] = 8; d[i + 3] = 255;
  }

  // Vertical bars
  const barPositions = [4, 14, 24, 34, 44, 54];
  const barWidth = 4;
  for (const bx of barPositions) {
    for (let y = 0; y < TEX_SIZE; y++) {
      for (let dx = 0; dx < barWidth; dx++) {
        const x = bx + dx;
        if (x >= TEX_SIZE) continue;
        const highlight = dx === 0 ? 15 : dx === barWidth - 1 ? -10 : 0;
        const noise = (hashNoise(x, y, 1200) - 0.5) * 6;
        const r = Math.max(0, Math.min(255, Math.floor(52 + highlight + noise)));
        const g = Math.max(0, Math.min(255, Math.floor(50 + highlight + noise)));
        const b = Math.max(0, Math.min(255, Math.floor(56 + highlight + noise)));
        setPixel(d, x, y, r, g, b, 255);
      }
    }
  }

  // Horizontal crossbars
  const crossbars = [8, 30, 52];
  for (const cy of crossbars) {
    for (let y = cy; y < cy + 3 && y < TEX_SIZE; y++) {
      for (let x = 0; x < TEX_SIZE; x++) {
        const highlight = y === cy ? 10 : -5;
        const noise = (hashNoise(x, y, 1210) - 0.5) * 4;
        const r = Math.max(0, Math.min(255, Math.floor(58 + highlight + noise)));
        const g = Math.max(0, Math.min(255, Math.floor(56 + highlight + noise)));
        const b = Math.max(0, Math.min(255, Math.floor(62 + highlight + noise)));
        setPixel(d, x, y, r, g, b, 255);
      }
    }
  }

  // Rivets at intersections
  for (const bx of barPositions) {
    for (const cy of crossbars) {
      const rx = bx + 2, ry = cy + 1;
      setPixel(d, rx, ry, 75, 72, 80, 255);
      setPixel(d, rx - 1, ry, 65, 62, 70, 255);
      setPixel(d, rx + 1, ry, 65, 62, 70, 255);
    }
  }

  addNoise(d, 6, 1201);
  return d;
}

// ---- Button Texture (floor plate) ----
function generateButtonTex() {
  // Start from floor stone, add a raised plate
  const d = generateFloorStone();

  // Metal pressure plate in center
  const cx = 32, cy = 32, radius = 12;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) {
        const px = cx + dx, py = cy + dy;
        if (px < 0 || px >= TEX_SIZE || py < 0 || py >= TEX_SIZE) continue;
        const edgeDist = radius - Math.sqrt(dx * dx + dy * dy);
        const highlight = edgeDist < 2 ? 15 : 0;
        const noise = (hashNoise(px, py, 1300) - 0.5) * 6;
        setPixel(d, px, py,
          Math.floor(65 + highlight + noise),
          Math.floor(62 + highlight + noise),
          Math.floor(70 + highlight + noise), 255);
      }
    }
  }

  return d;
}

// ---- Painting Textures (wall decorations with gold frames) ----
function generatePainting(seed) {
  // Start from stone wall background
  const d = generateStone();

  // Gold frame
  const fx = 10, fy = 8, fw = 44, fh = 48;
  const frameR = 160, frameG = 130, frameB = 50;
  for (let x = fx; x < fx + fw; x++) {
    for (const y of [fy, fy + 1, fy + fh - 2, fy + fh - 1]) {
      const n = (hashNoise(x, y, seed + 10) - 0.5) * 15;
      setPixel(d, x, y, Math.floor(frameR + n), Math.floor(frameG + n), Math.floor(frameB + n * 0.5), 255);
    }
  }
  for (let y = fy; y < fy + fh; y++) {
    for (const x of [fx, fx + 1, fx + fw - 2, fx + fw - 1]) {
      const n = (hashNoise(x, y, seed + 11) - 0.5) * 15;
      setPixel(d, x, y, Math.floor(frameR + n), Math.floor(frameG + n), Math.floor(frameB + n * 0.5), 255);
    }
  }

  // Canvas area inside frame
  const cx = fx + 3, cy = fy + 3, cw = fw - 6, ch = fh - 6;

  // Different painting styles based on seed
  const style = seed % 4;

  if (style === 0) {
    // Landscape — sky gradient + green hills + brown ground
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const t = y / ch;
        let r, g, b;
        if (t < 0.4) {
          // Sky
          r = 40 + (1 - t / 0.4) * 30;
          g = 50 + (1 - t / 0.4) * 25;
          b = 80 + (1 - t / 0.4) * 30;
        } else if (t < 0.6) {
          // Hills
          const hill = Math.sin(x * 0.3 + seed) * 4;
          r = 30 + hill; g = 55 + hill; b = 25;
        } else {
          // Ground
          r = 60; g = 45; b = 25;
        }
        const n = (hashNoise(x, y, seed + 100) - 0.5) * 12;
        setPixel(d, cx + x, cy + y, Math.floor(r + n), Math.floor(g + n), Math.floor(b + n), 255);
      }
    }
  } else if (style === 1) {
    // Portrait — dark background with face oval
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        setPixel(d, cx + x, cy + y, 25, 18, 12, 255);
      }
    }
    // Face oval
    const ocx = cw / 2, ocy = ch * 0.4, rx = 10, ry = 13;
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const dx = (x - ocx) / rx, dy = (y - ocy) / ry;
        if (dx * dx + dy * dy < 1) {
          const n = (hashNoise(x, y, seed + 200) - 0.5) * 10;
          setPixel(d, cx + x, cy + y, Math.floor(170 + n), Math.floor(135 + n), Math.floor(100 + n), 255);
        }
      }
    }
    // Eyes
    setPixel(d, cx + Math.floor(ocx - 4), cy + Math.floor(ocy - 1), 20, 15, 10, 255);
    setPixel(d, cx + Math.floor(ocx + 4), cy + Math.floor(ocy - 1), 20, 15, 10, 255);
  } else if (style === 2) {
    // Abstract — colored rectangles
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        setPixel(d, cx + x, cy + y, 30, 25, 20, 255);
      }
    }
    const colors = [[140,40,30],[35,80,50],[50,45,110],[160,120,30]];
    for (let i = 0; i < 5; i++) {
      const bx = Math.floor(hashNoise(i, 0, seed + 300) * (cw - 10));
      const by = Math.floor(hashNoise(i, 1, seed + 300) * (ch - 8));
      const bw = 6 + Math.floor(hashNoise(i, 2, seed + 300) * 12);
      const bh = 5 + Math.floor(hashNoise(i, 3, seed + 300) * 10);
      const c = colors[i % colors.length];
      for (let y = by; y < by + bh && y < ch; y++) {
        for (let x = bx; x < bx + bw && x < cw; x++) {
          setPixel(d, cx + x, cy + y, c[0], c[1], c[2], 255);
        }
      }
    }
  } else {
    // Dragon / creature — red/orange on dark
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        setPixel(d, cx + x, cy + y, 15, 10, 18, 255);
      }
    }
    // Simple dragon shape — curved body
    for (let i = 0; i < 30; i++) {
      const t = i / 30;
      const sx = Math.floor(cw * 0.2 + t * cw * 0.6 + Math.sin(t * 4) * 5);
      const sy = Math.floor(ch * 0.5 + Math.sin(t * 3 + seed) * 10);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx * dx + dy * dy <= 5) {
            const px = sx + dx, py = sy + dy;
            if (px >= 0 && px < cw && py >= 0 && py < ch) {
              setPixel(d, cx + px, cy + py, 170, 50 + Math.floor(t * 50), 20, 255);
            }
          }
        }
      }
    }
    // Eye
    setPixel(d, cx + Math.floor(cw * 0.75), cy + Math.floor(ch * 0.35), 220, 180, 30, 255);
  }

  return d;
}

// ---- Public API ----
let textureCache = null;

/**
 * Generate all procedural wall textures.
 * Returns an object of Uint8ClampedArray (64*64*4 RGBA each).
 */
export function generateTextures() {
  if (textureCache) return textureCache;

  textureCache = {
    stone: generateStone(),
    wood:  generateWood(),
    mossy: generateMossy(),
    brick: generateBrick(),
    town_stone: generateTownStone(),
    dungeon_entrance: generateDungeonEntrance(),
    floor_stone: generateFloorStone(),
    ceiling_dark: generateCeilingDark(),
    floor_town: generateFloorTown(),
    ceiling_town: generateCeilingTown(),
    locked_door: generateLockedDoor(),
    gate: generateGate(),
    button: generateButtonTex(),
    painting0: generatePainting(2000),
    painting1: generatePainting(2001),
    painting2: generatePainting(2002),
    painting3: generatePainting(2003),
  };

  return textureCache;
}
