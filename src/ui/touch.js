// ============================================================
//  TOUCH — Virtual dual joystick for mobile devices
// ============================================================

const IS_TOUCH = ('ontouchstart' in window || navigator.maxTouchPoints > 0);

let enabled = true;
let container = null;

// Zone boundaries (fractions of screen width)
const LEFT_ZONE = 0.40;
const RIGHT_ZONE = 0.60;

// Joystick config
const JOYSTICK_RADIUS = 60;   // px — visual base radius
const DEAD_ZONE = 0.10;       // fraction of radius

// State for each joystick
const moveStick = { id: null, baseX: 0, baseY: 0, dx: 0, dy: 0, el: null, thumbEl: null };
const lookStick = { id: null, baseX: 0, baseY: 0, dx: 0, dy: 0, el: null, thumbEl: null };

let attackRequested = false;
let interactRequested = false;

// ---- DOM helpers ----

function createJoystickDOM(stick, side) {
  const base = document.createElement('div');
  base.className = 'touch-joystick-base';
  base.dataset.side = side;
  base.style.display = 'none';

  const thumb = document.createElement('div');
  thumb.className = 'touch-joystick-thumb';
  base.appendChild(thumb);

  container.appendChild(base);
  stick.el = base;
  stick.thumbEl = thumb;
}

function showStick(stick, cx, cy) {
  stick.el.style.display = 'block';
  stick.el.style.left = (cx - JOYSTICK_RADIUS) + 'px';
  stick.el.style.top = (cy - JOYSTICK_RADIUS) + 'px';
  stick.thumbEl.style.transform = 'translate(0px, 0px)';
}

function hideStick(stick) {
  stick.el.style.display = 'none';
  stick.id = null;
  stick.dx = 0;
  stick.dy = 0;
}

function updateThumb(stick, tx, ty) {
  let dx = tx - stick.baseX;
  let dy = ty - stick.baseY;
  const dist = Math.hypot(dx, dy);

  // Clamp to radius
  if (dist > JOYSTICK_RADIUS) {
    dx = dx / dist * JOYSTICK_RADIUS;
    dy = dy / dist * JOYSTICK_RADIUS;
  }

  stick.thumbEl.style.transform = `translate(${dx}px, ${dy}px)`;

  // Normalize to -1..1 with dead zone
  const norm = Math.min(dist, JOYSTICK_RADIUS) / JOYSTICK_RADIUS;
  if (norm < DEAD_ZONE) {
    stick.dx = 0;
    stick.dy = 0;
  } else {
    const adjusted = (norm - DEAD_ZONE) / (1 - DEAD_ZONE);
    const angle = Math.atan2(dy, dx);
    stick.dx = Math.cos(angle) * adjusted;
    stick.dy = Math.sin(angle) * adjusted;
  }
}

// ---- Zone detection ----

function getZone(x) {
  const frac = x / window.innerWidth;
  if (frac < LEFT_ZONE) return 'move';
  if (frac > RIGHT_ZONE) return 'look';
  return 'center';
}

// ---- Touch handlers ----

function onTouchStart(e) {
  if (!enabled) return;
  for (const t of e.changedTouches) {
    const zone = getZone(t.clientX);

    if (zone === 'move' && moveStick.id === null) {
      moveStick.id = t.identifier;
      moveStick.baseX = t.clientX;
      moveStick.baseY = t.clientY;
      moveStick.dx = 0;
      moveStick.dy = 0;
      showStick(moveStick, t.clientX, t.clientY);
    } else if (zone === 'look' && lookStick.id === null) {
      lookStick.id = t.identifier;
      lookStick.baseX = t.clientX;
      lookStick.baseY = t.clientY;
      lookStick.dx = 0;
      lookStick.dy = 0;
      showStick(lookStick, t.clientX, t.clientY);
    } else if (zone === 'center') {
      attackRequested = true;
      interactRequested = true;
    }
  }
}

function onTouchMove(e) {
  if (!enabled) return;
  for (const t of e.changedTouches) {
    if (t.identifier === moveStick.id) {
      updateThumb(moveStick, t.clientX, t.clientY);
    } else if (t.identifier === lookStick.id) {
      updateThumb(lookStick, t.clientX, t.clientY);
    }
  }
}

function onTouchEnd(e) {
  for (const t of e.changedTouches) {
    if (t.identifier === moveStick.id) hideStick(moveStick);
    if (t.identifier === lookStick.id) hideStick(lookStick);
  }
}

// ---- Public API ----

export function initTouchControls() {
  if (!IS_TOUCH) return;

  container = document.createElement('div');
  container.id = 'touch-controls';
  document.body.appendChild(container);

  createJoystickDOM(moveStick, 'left');
  createJoystickDOM(lookStick, 'right');

  // Touch zones cover the full screen — zone logic is in getZone()
  container.addEventListener('touchstart', onTouchStart, { passive: false });
  container.addEventListener('touchmove', onTouchMove, { passive: false });
  container.addEventListener('touchend', onTouchEnd);
  container.addEventListener('touchcancel', onTouchEnd);

  // Prevent default to stop scrolling/zooming
  container.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
}

export function getTouchMove() {
  return { dx: moveStick.dx, dy: moveStick.dy };
}

export function getTouchLook() {
  return { dx: lookStick.dx, dy: lookStick.dy };
}

export function getTouchAttack() {
  if (attackRequested) {
    attackRequested = false;
    return true;
  }
  return false;
}

export function setTouchEnabled(val) {
  enabled = val;
  if (!enabled && container) {
    hideStick(moveStick);
    hideStick(lookStick);
  }
}

export function getTouchInteract() {
  if (interactRequested) {
    interactRequested = false;
    return true;
  }
  return false;
}

export function isTouchDevice() {
  return IS_TOUCH;
}
