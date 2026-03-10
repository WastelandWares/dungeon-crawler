// ============================================================
//  MAP GENERATION
// ============================================================
import { CFG } from '../config.js';
import { dist } from '../utils.js';
import { TILE, getMonsterTypes, getItemTypes } from './entities.js';

export function generateMap(size) {
  // Initialize all walls
  const map = Array.from({ length: size }, () => Array(size).fill(TILE.WALL));

  // Recursive backtracker maze (operates on odd coords)
  const visited = new Set();
  const stack = [];
  const start = [1, 1];
  visited.add(start.join());
  stack.push(start);
  map[1][1] = TILE.FLOOR;

  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const neighbors = [];
    for (const [dx, dy] of [[0,-2],[0,2],[-2,0],[2,0]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && !visited.has(`${nx},${ny}`)) {
        neighbors.push([nx, ny, cx + dx/2, cy + dy/2]);
      }
    }
    if (neighbors.length) {
      const [nx, ny, wx, wy] = neighbors[Math.floor(Math.random() * neighbors.length)];
      visited.add(`${nx},${ny}`);
      map[wy][wx] = TILE.FLOOR;
      map[ny][nx] = TILE.FLOOR;
      stack.push([nx, ny]);
    } else {
      stack.pop();
    }
  }

  // Widen some corridors for playability (random room-like openings)
  for (let i = 0; i < size * 2; i++) {
    const x = Math.floor(Math.random() * (size - 4)) + 2;
    const y = Math.floor(Math.random() * (size - 4)) + 2;
    if (map[y][x] === TILE.FLOOR) {
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        if (Math.random() > 0.5 && map[y+dy] && map[y+dy][x+dx] === TILE.WALL) {
          if (x+dx > 0 && x+dx < size-1 && y+dy > 0 && y+dy < size-1) {
            map[y+dy][x+dx] = TILE.FLOOR;
          }
        }
      }
    }
  }

  // Place some doors
  for (let y = 2; y < size - 2; y++) {
    for (let x = 2; x < size - 2; x++) {
      if (map[y][x] !== TILE.FLOOR) continue;
      if (Math.random() > 0.92) {
        if ((map[y-1][x] === TILE.WALL && map[y+1][x] === TILE.WALL) ||
            (map[y][x-1] === TILE.WALL && map[y][x+1] === TILE.WALL)) {
          map[y][x] = TILE.DOOR;
        }
      }
    }
  }

  // Place paintings on visible walls (~5% of eligible walls)
  for (let y = 2; y < size - 2; y++) {
    for (let x = 2; x < size - 2; x++) {
      if (map[y][x] !== TILE.WALL) continue;
      if (Math.random() > 0.05) continue;
      // Must be adjacent to exactly one floor tile (facing a corridor)
      let floorNeighbors = 0;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const t = map[y + dy][x + dx];
        if (t === TILE.FLOOR || t === TILE.DOOR) floorNeighbors++;
      }
      if (floorNeighbors >= 1 && floorNeighbors <= 2) {
        map[y][x] = TILE.PAINTING;
      }
    }
  }

  // Place stairs far from start
  let stairPos = null;
  let maxDist = 0;
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      if (map[y][x] === TILE.FLOOR) {
        const d = dist(1, 1, x, y);
        if (d > maxDist) { maxDist = d; stairPos = [x, y]; }
      }
    }
  }
  if (stairPos) map[stairPos[1]][stairPos[0]] = TILE.STAIRS;

  return { map, stairPos };
}

export function spawnEntities(map, size, level) {
  const monsters = [];
  const items = [];
  const floors = [];

  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      if (map[y][x] === TILE.FLOOR && !(x <= 2 && y <= 2)) {
        floors.push([x, y]);
      }
    }
  }

  // Shuffle floors
  for (let i = floors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [floors[i], floors[j]] = [floors[j], floors[i]];
  }

  // Spawn monsters (more on deeper levels), filtered by floor
  const monsterCount = 3 + level * 2;
  const availableMonsters = getMonsterTypes().filter(m =>
    level >= (m.minFloor || 1) && level <= (m.maxFloor || 99)
  );
  const monsterPool = availableMonsters.length > 0 ? availableMonsters : getMonsterTypes();
  for (let i = 0; i < monsterCount && i < floors.length; i++) {
    const [x, y] = floors[i];
    const base = monsterPool[Math.floor(Math.random() * monsterPool.length)];
    const typeKey = base.id || base.name.toLowerCase().replace(/\s+/g, '_');
    monsters.push({
      x: x + 0.5, y: y + 0.5,
      type: typeKey,
      name: base.name,
      hp: base.hp + Math.floor(level * 1.5),
      maxHp: base.hp + Math.floor(level * 1.5),
      ac: base.ac + Math.floor(level * 0.5),
      attack: base.attack + level,
      damage: [...base.damage],
      xp: base.xp,
      color: base.color,
      icon: base.icon,
      speed: base.speed,
      aggroRange: base.aggroRange,
      alive: true,
      lastAttack: 0,
    });
  }

  // Spawn items — mix of consumables and equipment scaled to floor
  const itemCount = 4 + level;
  const availableItems = getItemTypes();
  // Filter equipment by tier based on floor depth
  const tier = level <= 3 ? 1 : level <= 6 ? 2 : 3;
  for (let i = monsterCount; i < monsterCount + itemCount && i < floors.length; i++) {
    const [x, y] = floors[i];
    // Filter pool: include items up to current tier
    const pool = availableItems.filter(it => (it.tier || 1) <= tier);
    const base = pool.length > 0
      ? pool[Math.floor(Math.random() * pool.length)]
      : availableItems[Math.floor(Math.random() * availableItems.length)];
    const typeKey = base.id || base.name.toLowerCase().replace(/\s+/g, '_');
    items.push({
      x: x + 0.5, y: y + 0.5,
      type: typeKey,
      name: base.name,
      color: base.color || '#c9a84c',
      icon: base.icon || '?',
      effect: base.effect,
      picked: false,
      // Copy full content metadata so createItemFromContent works
      category: base.category,
      healAmount: base.healAmount,
      shape: base.shape,
      slot: base.slot,
      stackable: base.stackable,
      maxStack: base.maxStack,
      acBonus: base.acBonus,
      attackBonus: base.attackBonus,
      damageBonus: base.damageBonus,
      speedBonus: base.speedBonus,
      damage: base.damage,
      description: base.description,
      basePrice: base.basePrice,
      tier: base.tier,
    });
  }

  return { monsters, items };
}

/**
 * Place triggers, locked doors, keys, and button+gate combos on a generated map.
 * Call after generateMap and spawnEntities.
 */
export function placeTriggersAndKeys(map, size, level) {
  const keys = [];
  const triggers = [];

  // --- Locked Doors: convert ~30% of doors to locked doors on floors 2+ ---
  if (level >= 2) {
    for (let y = 2; y < size - 2; y++) {
      for (let x = 2; x < size - 2; x++) {
        if (map[y][x] === TILE.DOOR && Math.random() < 0.3) {
          map[y][x] = TILE.LOCKED_DOOR;
        }
      }
    }
  }

  // Count locked doors to ensure we place enough keys
  let lockedDoorCount = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (map[y][x] === TILE.LOCKED_DOOR) lockedDoorCount++;
    }
  }

  // --- Keys: place more keys than locked doors (generous, like Doom) ---
  const keyCount = Math.max(1, lockedDoorCount + 1 + Math.floor(Math.random() * 2));
  const floors = [];
  for (let y = 2; y < size - 2; y++) {
    for (let x = 2; x < size - 2; x++) {
      if (map[y][x] === TILE.FLOOR && !(x <= 2 && y <= 2)) {
        floors.push([x, y]);
      }
    }
  }
  // Shuffle
  for (let i = floors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [floors[i], floors[j]] = [floors[j], floors[i]];
  }
  for (let i = 0; i < keyCount && i < floors.length; i++) {
    keys.push({ x: floors[i][0], y: floors[i][1] });
  }

  // --- Button+Gate combos on floors 3+ ---
  if (level >= 3) {
    // Find dead-end tiles (floor tiles with exactly one walkable neighbor)
    const deadEnds = [];
    for (let y = 2; y < size - 2; y++) {
      for (let x = 2; x < size - 2; x++) {
        if (map[y][x] !== TILE.FLOOR) continue;
        if (x <= 2 && y <= 2) continue; // skip spawn
        let openNeighbors = 0;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const t = map[y + dy][x + dx];
          if (t === TILE.FLOOR || t === TILE.DOOR || t === TILE.LOCKED_DOOR || t === TILE.STAIRS) {
            openNeighbors++;
          }
        }
        if (openNeighbors === 1) deadEnds.push([x, y]);
      }
    }

    // Shuffle dead ends
    for (let i = deadEnds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deadEnds[i], deadEnds[j]] = [deadEnds[j], deadEnds[i]];
    }

    // Place up to 2 button+gate combos
    const comboCount = Math.min(2, Math.floor(deadEnds.length / 2));
    for (let c = 0; c < comboCount; c++) {
      const buttonPos = deadEnds[c * 2];
      const gatePos = deadEnds[c * 2 + 1];
      if (!buttonPos || !gatePos) break;

      // Find the corridor tile adjacent to the gate dead-end to block it
      // The gate goes on the one open neighbor of the dead-end
      let gateX = gatePos[0], gateY = gatePos[1];
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const t = map[gateY + dy][gateX + dx];
        if (t === TILE.FLOOR || t === TILE.DOOR) {
          // Place gate on this connecting tile to block access to the dead-end
          gateX = gatePos[0] + dx;
          gateY = gatePos[1] + dy;
          break;
        }
      }

      map[gateY][gateX] = TILE.GATE;
      map[buttonPos[1]][buttonPos[0]] = TILE.BUTTON;

      triggers.push({
        type: 'button',
        x: buttonPos[0],
        y: buttonPos[1],
        targetX: gateX,
        targetY: gateY,
        activated: false,
      });
    }
  }

  return { keys, triggers };
}
