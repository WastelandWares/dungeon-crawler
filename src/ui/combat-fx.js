// ============================================================
//  COMBAT FX — floating damage numbers, hit/miss flash,
//  screen shake, d20 roll display (all canvas-based)
// ============================================================

// Active effects lists
const floatingNumbers = [];   // { text, x, y, color, age, maxAge, size, crit }
let borderFlash = null;       // { color, age, maxAge }
let screenShake = null;       // { intensity, age, maxAge, offsetX, offsetY }
let rollDisplay = null;       // { value, age, maxAge, crit, fumble }

// ---- Public API: trigger effects ----

/**
 * Show a floating damage number rising from screen center.
 * @param {number} damage - damage dealt
 * @param {boolean} crit - was it a critical hit?
 */
export function showDamageNumber(damage, crit = false) {
  floatingNumbers.push({
    text: crit ? `${damage}!` : `${damage}`,
    // Start near center with slight random horizontal offset
    x: 0.5 + (Math.random() - 0.5) * 0.12,
    y: 0.45,
    color: crit ? '#ffdd33' : '#ffffff',
    outlineColor: crit ? '#cc4400' : '#880000',
    age: 0,
    maxAge: crit ? 1200 : 900, // ms
    size: crit ? 1.6 : 1.0,
    crit,
  });
}

/**
 * Flash the screen border green (hit) or red (miss).
 * @param {'hit'|'miss'|'crit'|'fumble'} type
 */
export function showBorderFlash(type) {
  const colors = {
    hit:    'rgba(50, 220, 80, 0.35)',
    miss:   'rgba(220, 50, 50, 0.3)',
    crit:   'rgba(255, 210, 40, 0.5)',
    fumble: 'rgba(130, 30, 30, 0.45)',
  };
  borderFlash = {
    color: colors[type] || colors.miss,
    age: 0,
    maxAge: type === 'crit' ? 350 : 220,
  };
}

/**
 * Shake the screen (critical hit).
 * @param {number} intensity - shake amplitude in pixels (at render resolution)
 */
export function triggerScreenShake(intensity = 4) {
  screenShake = {
    intensity,
    age: 0,
    maxAge: 300, // ms
    offsetX: 0,
    offsetY: 0,
  };
}

/**
 * Show the d20 roll value briefly in HUD area.
 * @param {number} value - the d20 result (1-20)
 */
export function showRollValue(value) {
  rollDisplay = {
    value,
    age: 0,
    maxAge: 1400, // ms
    crit: value === 20,
    fumble: value === 1,
  };
}

// ---- Update + Render (called each frame) ----

/**
 * Advance all effect timers. Call once per frame.
 * @param {number} dt - delta time in ms
 */
export function updateCombatFX(dt) {
  // Floating numbers
  for (let i = floatingNumbers.length - 1; i >= 0; i--) {
    const fn = floatingNumbers[i];
    fn.age += dt;
    fn.y -= dt * 0.00025; // drift upward
    if (fn.age >= fn.maxAge) floatingNumbers.splice(i, 1);
  }

  // Border flash
  if (borderFlash) {
    borderFlash.age += dt;
    if (borderFlash.age >= borderFlash.maxAge) borderFlash = null;
  }

  // Screen shake
  if (screenShake) {
    screenShake.age += dt;
    if (screenShake.age >= screenShake.maxAge) {
      screenShake = null;
    } else {
      const decay = 1 - screenShake.age / screenShake.maxAge;
      screenShake.offsetX = (Math.random() - 0.5) * 2 * screenShake.intensity * decay;
      screenShake.offsetY = (Math.random() - 0.5) * 2 * screenShake.intensity * decay;
    }
  }

  // Roll display
  if (rollDisplay) {
    rollDisplay.age += dt;
    if (rollDisplay.age >= rollDisplay.maxAge) rollDisplay = null;
  }
}

/**
 * Get current screen shake offset (applied before scene render).
 * @returns {{ x: number, y: number }}
 */
export function getShakeOffset() {
  if (!screenShake) return { x: 0, y: 0 };
  return { x: screenShake.offsetX, y: screenShake.offsetY };
}

/**
 * Render all combat effects as canvas overlay.
 * Call AFTER renderScene so effects draw on top.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w - canvas width
 * @param {number} h - canvas height
 */
export function renderCombatFX(ctx, w, h) {
  ctx.save();

  // --- Floating damage numbers ---
  for (const fn of floatingNumbers) {
    const t = fn.age / fn.maxAge; // 0→1
    // Fade in quickly, fade out in last 40%
    const alpha = t < 0.1 ? t / 0.1 : t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1.0;
    // Scale: pop in then shrink slightly
    const scale = t < 0.1 ? 0.6 + t / 0.1 * 0.4 : 1.0 - (t - 0.1) * 0.15;

    const fontSize = Math.floor(18 * fn.size * scale);
    const px = fn.x * w;
    const py = fn.y * h;

    ctx.globalAlpha = alpha;
    ctx.font = `bold ${fontSize}px 'Cinzel', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Outline
    ctx.strokeStyle = fn.outlineColor;
    ctx.lineWidth = fn.crit ? 3 : 2;
    ctx.strokeText(fn.text, px, py);

    // Fill
    ctx.fillStyle = fn.color;
    ctx.fillText(fn.text, px, py);
  }

  // --- Border flash (vignette-style) ---
  if (borderFlash) {
    const t = borderFlash.age / borderFlash.maxAge;
    const alpha = 1 - t; // fade out linearly
    ctx.globalAlpha = alpha;

    // Draw as an inset border gradient
    const borderW = Math.floor(w * 0.06);
    const grd = ctx.createLinearGradient(0, 0, borderW, 0);
    grd.addColorStop(0, borderFlash.color);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, borderW, h); // left

    const grd2 = ctx.createLinearGradient(w, 0, w - borderW, 0);
    grd2.addColorStop(0, borderFlash.color);
    grd2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd2;
    ctx.fillRect(w - borderW, 0, borderW, h); // right

    const grd3 = ctx.createLinearGradient(0, 0, 0, borderW);
    grd3.addColorStop(0, borderFlash.color);
    grd3.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd3;
    ctx.fillRect(0, 0, w, borderW); // top

    const grd4 = ctx.createLinearGradient(0, h, 0, h - borderW);
    grd4.addColorStop(0, borderFlash.color);
    grd4.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd4;
    ctx.fillRect(0, h - borderW, w, borderW); // bottom
  }

  // --- D20 roll display (top-center HUD area) ---
  if (rollDisplay) {
    const t = rollDisplay.age / rollDisplay.maxAge;
    // Quick fade in, hold, fade out in last 50%
    const alpha = t < 0.08 ? t / 0.08 : t > 0.5 ? 1 - (t - 0.5) / 0.5 : 1.0;
    // Slight upward drift
    const yOffset = t * -8;

    const baseSize = rollDisplay.crit ? 16 : rollDisplay.fumble ? 14 : 12;
    const fontSize = Math.floor(baseSize);

    ctx.globalAlpha = alpha * 0.95;
    ctx.font = `bold ${fontSize}px 'Cinzel', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const px = w / 2;
    const py = 6 + yOffset;

    const label = `d20: ${rollDisplay.value}`;
    const color = rollDisplay.crit ? '#ffdd33' :
                  rollDisplay.fumble ? '#ff4444' : '#ccbbaa';
    const outline = rollDisplay.crit ? '#cc6600' :
                    rollDisplay.fumble ? '#660000' : '#443322';

    // Background pill
    const metrics = ctx.measureText(label);
    const pillW = metrics.width + 12;
    const pillH = fontSize + 6;
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = '#111';
    const pillX = px - pillW / 2;
    const pillY = py - 2;
    // Rounded rect
    const r = 4;
    ctx.beginPath();
    ctx.moveTo(pillX + r, pillY);
    ctx.lineTo(pillX + pillW - r, pillY);
    ctx.quadraticCurveTo(pillX + pillW, pillY, pillX + pillW, pillY + r);
    ctx.lineTo(pillX + pillW, pillY + pillH - r);
    ctx.quadraticCurveTo(pillX + pillW, pillY + pillH, pillX + pillW - r, pillY + pillH);
    ctx.lineTo(pillX + r, pillY + pillH);
    ctx.quadraticCurveTo(pillX, pillY + pillH, pillX, pillY + pillH - r);
    ctx.lineTo(pillX, pillY + r);
    ctx.quadraticCurveTo(pillX, pillY, pillX + r, pillY);
    ctx.closePath();
    ctx.fill();

    // Text
    ctx.globalAlpha = alpha * 0.95;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.strokeText(label, px, py);
    ctx.fillStyle = color;
    ctx.fillText(label, px, py);
  }

  ctx.restore();
}
