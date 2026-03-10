// ============================================================
//  GAME STATE
// ============================================================
import { CFG } from '../config.js';
import { dist, d20, roll } from '../utils.js';
import { TILE } from './entities.js';
import { generateMap, spawnEntities, placeTriggersAndKeys } from './mapgen.js';
import { generateTownMap, TOWN_SIZE } from './town.js';
import { GameAudio } from '../engine/audio.js';
import { addMessage } from '../ui/messages.js';
import { Input } from '../engine/input.js';
import { rollAbilityScores, computeDerivedStats, abilityMod } from '../systems/progression.js';
import { createInventory, autoPlace, createItemFromContent } from '../systems/inventory.js';
import { createEquipment, computeEquipmentStats } from '../systems/equipment.js';
import { isAnyPanelOpen } from '../ui/panels.js';
import { refreshStock } from '../systems/shop.js';
import { generateBounties, checkQuestProgress } from '../systems/quests.js';

export let game = null;

export function newGame() {
  const abilities = rollAbilityScores();

  const player = {
    x: 1.5, y: 1.5, angle: 0,
    level: 1,
    abilities,
    hp: 0,
    maxHp: 0,
    ac: 0,
    gold: 0,
    xp: 0,
    attackBonus: 0,
    armorBonus: 0,
    damageBonus: 0,
    pendingAbilityPoints: 0,
    baseAttack: 0,
    saves: { fort: 0, reflex: 0, will: 0 },
    inventory: createInventory(),
    equipment: createEquipment(),
  };

  // Compute derived stats from abilities
  computeDerivedStats(player);

  // Starting HP: 1d10 + conMod (min 1)
  const conMod = abilityMod(player.abilities.con);
  player.maxHp = Math.max(1, roll(1, 10) + conMod);
  player.hp = player.maxHp;

  game = {
    player,
    mode: 'town',  // 'town' | 'dungeon'
    town: null,     // town map/NPC data when in town
    level: 1,
    map: null,
    monsters: [],
    items: [],
    stairPos: null,
    explored: null,
    stepTimer: 0,
    shopStock: [],
    keys: 0,
    triggers: [],
    meta: { maxFloor: 1, totalKills: 0, playTime: 0 },
    quests: { active: [], available: [] },
  };
  enterTown();
}

/** Restore game state from a save-data object */
export function restoreGame(saveData) {
  const p = saveData.player;
  game = {
    player: {
      x: 1.5, y: 1.5, angle: 0,
      level: p.level,
      abilities: { ...p.abilities },
      hp: p.hp,
      maxHp: p.maxHp,
      ac: p.ac,
      gold: p.gold,
      xp: p.xp,
      attackBonus: p.attackBonus,
      armorBonus: p.armorBonus,
      damageBonus: p.damageBonus,
      pendingAbilityPoints: p.pendingAbilityPoints,
      baseAttack: p.baseAttack,
      saves: { ...p.saves },
      inventory: p.inventory || createInventory(),
      equipment: p.equipment || createEquipment(),
    },
    mode: 'town',
    town: null,
    level: saveData.floor || 1,
    map: null,
    monsters: [],
    items: [],
    stairPos: null,
    explored: null,
    stepTimer: 0,
    shopStock: [],
    keys: saveData.keys || 0,
    triggers: [],
    meta: { ...saveData.meta },
    quests: saveData.quests
      ? { active: [...saveData.quests.active], available: [...saveData.quests.available] }
      : { active: [], available: [] },
  };
  // Restore into town (safe hub)
  enterTown();
}

export function enterTown() {
  game.mode = 'town';
  const townData = generateTownMap();
  game.map = townData.map;
  game.town = townData;
  game.monsters = [];  // no monsters in town
  game.items = [];
  game.stairPos = null;
  // Position player at town entrance, facing north
  game.player.x = 7.5;
  game.player.y = 13.5;
  game.player.angle = -Math.PI / 2;
  // Reset explored for town
  game.explored = Array.from({ length: TOWN_SIZE }, () => Array(TOWN_SIZE).fill(false));
  // Refresh shop stock each time player returns to town
  game.shopStock = refreshStock(game.meta.maxFloor);

  // Reset survive quest progress (player returned to town early)
  if (game.quests) {
    for (const q of game.quests.active) {
      if (q.type === 'survive' && q.status === 'active') {
        q.progress = 0;
      }
    }
  }

  // Refresh available bounties on town entry
  if (game.quests) {
    game.quests.available = generateBounties(game.player.level);
  }

  // Auto-save on returning to town
  import('../game/save.js').then(({ saveGame }) => saveGame(game));
}

export function enterDungeon() {
  game.mode = 'dungeon';
  game.town = null;
  generateLevel();
  addMessage(`Descended to dungeon level ${game.level}...`, 'info');
  GameAudio.descend();

  // Emit quest events for entering dungeon floor 1
  emitQuestFloorEvents(game.level);
}

export function generateLevel() {
  const { map, stairPos } = generateMap(CFG.mapSize);
  game.map = map;
  game.stairPos = stairPos;
  game.explored = Array.from({ length: CFG.mapSize }, () => Array(CFG.mapSize).fill(false));
  const { monsters, items } = spawnEntities(map, CFG.mapSize, game.level);
  game.monsters = monsters;
  game.items = items;

  // Place triggers, locked doors, keys
  const { keys, triggers } = placeTriggersAndKeys(map, CFG.mapSize, game.level);
  game.triggers = triggers;

  // Spawn key pickup items
  for (const k of keys) {
    game.items.push({
      x: k.x + 0.5, y: k.y + 0.5,
      type: 'key', name: 'Dungeon Key',
      color: '#c9a84c', icon: '\u{1F5DD}',
      effect: null, picked: false, isKey: true,
    });
  }

  game.player.x = 1.5;
  game.player.y = 1.5;

  // Face an open direction at spawn
  const dirs = [[1,0,0],[-1,0,Math.PI],[0,1,Math.PI/2],[0,-1,-Math.PI/2]];
  for (const [dx,dy,angle] of dirs) {
    const tx = 1 + dx, ty = 1 + dy;
    if (tx >= 0 && ty >= 0 && tx < CFG.mapSize && ty < CFG.mapSize && map[ty][tx] === TILE.FLOOR) {
      game.player.angle = angle;
      break;
    }
  }
}

/** Emit floor-related quest events and show progress messages */
function emitQuestFloorEvents(floor) {
  if (!game.quests) return;
  for (const q of game.quests.active) {
    if (checkQuestProgress(q, { type: 'floor_reached', floor })) {
      addMessage(`Quest progress: ${q.title} [${q.progress}/${q.targetFloor}]`, 'info');
    }
    if (checkQuestProgress(q, { type: 'floor_descended' })) {
      addMessage(`Quest progress: ${q.title} [${q.progress}/${q.targetFloors}]`, 'info');
    }
  }
}

export function getMapSize() {
  return game.mode === 'town' ? TOWN_SIZE : CFG.mapSize;
}

export function isWalkable(x, y) {
  const tx = Math.floor(x), ty = Math.floor(y);
  const size = getMapSize();
  if (tx < 0 || tx >= size || ty < 0 || ty >= size) return false;
  const tile = game.map[ty][tx];
  return tile === TILE.FLOOR || tile === TILE.STAIRS || tile === TILE.TOWN_FLOOR || tile === TILE.DUNGEON_ENTRANCE || tile === TILE.BUTTON;
}

export function tryMove(entity, nx, ny, radius = 0.2) {
  // X-axis: check center edges + all four corners at current Y
  if (isWalkable(nx + radius, entity.y) && isWalkable(nx - radius, entity.y) &&
      isWalkable(nx + radius, entity.y + radius) && isWalkable(nx + radius, entity.y - radius) &&
      isWalkable(nx - radius, entity.y + radius) && isWalkable(nx - radius, entity.y - radius)) {
    entity.x = nx;
  }
  // Y-axis: check center edges + all four corners at (possibly updated) X
  if (isWalkable(entity.x, ny + radius) && isWalkable(entity.x, ny - radius) &&
      isWalkable(entity.x + radius, ny + radius) && isWalkable(entity.x + radius, ny - radius) &&
      isWalkable(entity.x - radius, ny + radius) && isWalkable(entity.x - radius, ny - radius)) {
    entity.y = ny;
  }
}

export function updatePlayer(dt) {
  const p = game.player;

  // Merge all input sources for this frame
  Input.update();

  // Skip movement/interaction when a panel (inventory, etc.) is open
  if (isAnyPanelOpen()) return;

  // Mouse + touch look
  p.angle += Input.consumeMouseX() * CFG.mouseScale;

  // Keyboard look (arrow keys)
  if (Input.keys['arrowleft']) p.angle -= CFG.rotSpeed * dt;
  if (Input.keys['arrowright']) p.angle += CFG.rotSpeed * dt;

  // Movement — combined keyboard + touch via Input.moveX/moveY
  let dx = 0, dy = 0;
  const cos = Math.cos(p.angle), sin = Math.sin(p.angle);
  const fwd = Input.moveY;   // +1 forward, -1 back
  const strafe = Input.moveX; // +1 right, -1 left
  dx += cos * fwd - sin * strafe;
  dy += sin * fwd + cos * strafe;

  if (dx || dy) {
    const len = Math.hypot(dx, dy);
    dx = dx / len * CFG.moveSpeed * dt;
    dy = dy / len * CFG.moveSpeed * dt;
    tryMove(p, p.x + dx, p.y + dy, 0.2);

    // Footstep sounds
    game.stepTimer -= dt;
    if (game.stepTimer <= 0) {
      GameAudio.step();
      game.stepTimer = 0.35;
    }
  }

  // Reveal explored area
  const mapSize = getMapSize();
  const px = Math.floor(p.x), py = Math.floor(p.y);
  const revealRadius = game.mode === 'town' ? 5 : 3;
  for (let oy = -revealRadius; oy <= revealRadius; oy++) {
    for (let ox = -revealRadius; ox <= revealRadius; ox++) {
      const mx = px + ox, my = py + oy;
      if (mx >= 0 && mx < mapSize && my >= 0 && my < mapSize) {
        game.explored[my][mx] = true;
      }
    }
  }

  // Touch interact fires both space and e actions in one tap
  const touchInteract = Input.consumeInteract();

  // Open doors (space or touch interact)
  if (Input.consume(' ') || touchInteract) {
    const lookX = Math.floor(p.x + cos * 1.2);
    const lookY = Math.floor(p.y + sin * 1.2);
    if (lookX >= 0 && lookX < mapSize && lookY >= 0 && lookY < mapSize) {
      const tile = game.map[lookY][lookX];
      if (tile === TILE.DOOR) {
        game.map[lookY][lookX] = TILE.FLOOR;
        addMessage('You open the door.', 'info');
        GameAudio.door();
      } else if (tile === TILE.LOCKED_DOOR) {
        if (game.keys > 0) {
          game.keys--;
          game.map[lookY][lookX] = TILE.FLOOR;
          addMessage('You unlock the door with a key.', 'info');
          GameAudio.door();
        } else {
          addMessage('The door is locked. You need a key.', 'info');
        }
      }
    }
  }

  // Button activation — check if player is standing on a button tile
  if (game.triggers && game.triggers.length > 0) {
    const ptx = Math.floor(p.x), pty = Math.floor(p.y);
    if (game.map[pty] && game.map[pty][ptx] === TILE.BUTTON) {
      for (const trigger of game.triggers) {
        if (!trigger.activated && trigger.x === ptx && trigger.y === pty) {
          trigger.activated = true;
          // Open the linked gate
          if (game.map[trigger.targetY] && game.map[trigger.targetY][trigger.targetX] === TILE.GATE) {
            game.map[trigger.targetY][trigger.targetX] = TILE.FLOOR;
          }
          game.map[pty][ptx] = TILE.FLOOR; // button depresses into floor
          addMessage('You hear a gate grinding open somewhere...', 'info');
          GameAudio.door();
        }
      }
    }
  }

  // Descend stairs (e or touch interact) — only in dungeon mode; town interactions handled in main.js
  if (game.mode === 'dungeon' && (Input.consume('e') || touchInteract)) {
    const tx = Math.floor(p.x), ty = Math.floor(p.y);
    if (game.map[ty][tx] === TILE.STAIRS) {
      game.level++;
      if (game.level > game.meta.maxFloor) game.meta.maxFloor = game.level;
      generateLevel();
      addMessage(`Descended to level ${game.level}...`, 'info');
      GameAudio.descend();

      // Emit quest events for descending stairs
      emitQuestFloorEvents(game.level);

      // Auto-save on level transition
      import('../game/save.js').then(({ saveGame }) => saveGame(game));
    }
  }

  // Pick up items
  for (const item of game.items) {
    if (item.picked) continue;
    if (dist(p.x, p.y, item.x, item.y) < 0.5) {
      // Gold auto-collects (not an inventory item)
      if (item.type === 'gold' || item.name === 'Gold') {
        item.picked = true;
        if (item.effect) item.effect(p);
        addMessage(`Picked up ${item.name}`, 'loot');
        GameAudio.pickup();
        continue;
      }
      // Keys auto-collect
      if (item.isKey || item.type === 'key') {
        item.picked = true;
        game.keys++;
        addMessage(`Picked up ${item.name} (${game.keys} total)`, 'loot');
        GameAudio.pickup();
        continue;
      }
      // Create an inventory item from the content data and try to auto-place
      const invItem = createItemFromContent(item);
      if (autoPlace(p.inventory, invItem)) {
        item.picked = true;
        addMessage(`Picked up ${item.name}`, 'loot');
        GameAudio.pickup();
      } else {
        addMessage('Inventory full!', 'info');
      }
    }
  }
}

/** Check line-of-sight between two points using DDA (no wall tiles in the way) */
function hasLineOfSight(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 4; // oversample
  if (steps === 0) return true;
  const sx = dx / steps, sy = dy / steps;
  let cx = x0, cy = y0;
  const mapSize = getMapSize();
  for (let i = 0; i < steps; i++) {
    cx += sx; cy += sy;
    const tx = Math.floor(cx), ty = Math.floor(cy);
    if (tx < 0 || tx >= mapSize || ty < 0 || ty >= mapSize) return false;
    const tile = game.map[ty][tx];
    if (tile === TILE.WALL || tile === TILE.DOOR || tile === TILE.LOCKED_DOOR || tile === TILE.GATE || tile === TILE.PAINTING) {
      return false;
    }
  }
  return true;
}

export function updateMonsters(dt, now) {
  const p = game.player;
  for (const m of game.monsters) {
    if (!m.alive) continue;
    const d = dist(p.x, p.y, m.x, m.y);

    if (d > m.aggroRange) continue;

    // Check line-of-sight — monsters can't see through walls
    if (!hasLineOfSight(m.x, m.y, p.x, p.y)) continue;

    if (d > 0.8) {
      // Simple wall-aware steering: try direct path, then try perpendicular
      const ang = Math.atan2(p.y - m.y, p.x - m.x);
      let nx = m.x + Math.cos(ang) * m.speed * dt;
      let ny = m.y + Math.sin(ang) * m.speed * dt;
      const oldX = m.x, oldY = m.y;
      tryMove(m, nx, ny, 0.15);

      // If stuck (didn't move), try wall-sliding: move along the axis that's clear
      if (Math.abs(m.x - oldX) < 0.001 && Math.abs(m.y - oldY) < 0.001) {
        // Try X-only
        tryMove(m, nx, m.y, 0.15);
        if (Math.abs(m.x - oldX) < 0.001) {
          // Try Y-only
          m.x = oldX;
          tryMove(m, m.x, ny, 0.15);
        }
      }
    }

    if (d < 1.0 && now - m.lastAttack > 1500) {
      m.lastAttack = now;
      const attackRoll = d20();
      if (attackRoll === 20 || attackRoll + m.attack >= p.ac) {
        let dmg = roll(m.damage[0], m.damage[1]);
        if (attackRoll === 20) dmg *= 2;
        p.hp -= dmg;
        addMessage(`${m.name} hits you for ${dmg}! (rolled ${attackRoll})`, 'combat');
        GameAudio.hurt();
      } else {
        addMessage(`${m.name} misses you. (rolled ${attackRoll})`, 'combat');
        GameAudio.miss();
      }
    }
  }
}
