// ============================================================
//  INPUT — keyboard, mouse, pointer lock, touch integration
// ============================================================
import { getTouchMove, getTouchLook, getTouchAttack, getTouchInteract } from '../ui/touch.js';

const PREVENTED_KEYS = new Set([
  'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'e', 'tab'
]);

export const Input = {
  keys: {},
  mouseX: 0,
  pointerLocked: false,

  // Combined values (keyboard/mouse + touch)
  moveX: 0,   // strafe: -1 left, +1 right
  moveY: 0,   // forward/back: +1 forward, -1 back
  lookX: 0,   // rotation delta (pixels for mouse, scaled for touch)
  attackRequested: false,
  interactRequested: false,

  init() {
    document.addEventListener('keydown', e => {
      const key = e.key.toLowerCase();
      if (PREVENTED_KEYS.has(key)) e.preventDefault();
      Input.keys[key] = true;
    });

    document.addEventListener('keyup', e => {
      Input.keys[e.key.toLowerCase()] = false;
    });

    document.addEventListener('mousemove', e => {
      if (Input.pointerLocked) Input.mouseX += e.movementX;
    });

    document.addEventListener('pointerlockchange', () => {
      Input.pointerLocked = !!document.pointerLockElement;
    });
  },

  /**
   * Call once per frame to merge all input sources.
   */
  update() {
    // Keyboard movement
    let kx = 0, ky = 0;
    if (Input.keys['w']) ky += 1;
    if (Input.keys['s']) ky -= 1;
    if (Input.keys['a']) kx -= 1;
    if (Input.keys['d']) kx += 1;

    // Touch movement
    const tm = getTouchMove();
    // Touch dx = right(+)/left(-), dy = down(+)/up(-) in screen space
    // Map: dx -> strafe (positive = right), -dy -> forward (up = forward)
    Input.moveX = kx + tm.dx;
    Input.moveY = ky + (-tm.dy);

    // Clamp combined values
    Input.moveX = Math.max(-1, Math.min(1, Input.moveX));
    Input.moveY = Math.max(-1, Math.min(1, Input.moveY));

    // Look: mouse + touch
    const tl = getTouchLook();
    // Touch look dx maps to rotation; scale for responsive mobile turning
    Input.lookX = Input.mouseX + tl.dx * 20;
    Input.mouseX = 0;

    // Attack: click (set externally) or touch tap
    if (getTouchAttack()) {
      Input.attackRequested = true;
    }

    // Interact: touch center tap also triggers interact (doors, NPCs, stairs)
    if (getTouchInteract()) {
      Input.interactRequested = true;
    }
  },

  consumeMouseX() {
    const val = Input.lookX;
    Input.lookX = 0;
    return val;
  },

  consumeAttack() {
    if (Input.attackRequested) {
      Input.attackRequested = false;
      return true;
    }
    return false;
  },

  consumeInteract() {
    if (Input.interactRequested) {
      Input.interactRequested = false;
      return true;
    }
    return false;
  },

  consume(key) {
    if (Input.keys[key]) {
      Input.keys[key] = false;
      return true;
    }
    return false;
  },
};
