// ============================================================
//  TOWN — Hub town map and NPC definitions
// ============================================================
import { TILE } from './entities.js';

export const TOWN_SIZE = 15;

export const TOWN_NPCS = {
  shopkeeper: { x: 7.5, y: 3.5, icon: '\u{1F9D9}', name: 'Grimwald the Merchant', interactType: 'shop', minimapColor: '#c9a84c' },
  questgiver: { x: 11.5, y: 7.5, icon: '\u{1F4CB}', name: 'Bounty Board', interactType: 'quests', minimapColor: '#7cafc2' },
  stash:      { x: 3.5, y: 7.5, icon: '\u{1F4E6}', name: 'Stash Chest', interactType: 'stash', minimapColor: '#a86cc9' },
};

/**
 * Generate a hand-crafted 15x15 town map.
 *
 * Layout:
 *   - Walled perimeter
 *   - Wide entrance at bottom center where player spawns
 *   - Central open courtyard with decorative columns
 *   - Shop alcove on north wall (Grimwald)
 *   - Bounty board alcove on east wall
 *   - Stash chest alcove on west wall
 *   - Dungeon entrance archway at far north center
 */
export function generateTownMap() {
  // Initialize all walls
  const map = Array.from({ length: TOWN_SIZE }, () => Array(TOWN_SIZE).fill(TILE.WALL));

  // Carve out the main courtyard (columns 2-12, rows 2-12)
  for (let y = 2; y <= 12; y++) {
    for (let x = 2; x <= 12; x++) {
      map[y][x] = TILE.TOWN_FLOOR;
    }
  }

  // -- Entrance corridor at bottom center (rows 12-14, cols 6-8) --
  for (let y = 12; y <= 14; y++) {
    for (let x = 5; x <= 9; x++) {
      map[y][x] = TILE.TOWN_FLOOR;
    }
  }

  // -- Shop alcove on north wall (Grimwald) -- rows 1-3, cols 6-8
  for (let y = 1; y <= 3; y++) {
    for (let x = 5; x <= 9; x++) {
      map[y][x] = TILE.TOWN_FLOOR;
    }
  }

  // -- Bounty board alcove on east wall -- rows 6-9, cols 11-13
  for (let y = 5; y <= 9; y++) {
    for (let x = 11; x <= 13; x++) {
      map[y][x] = TILE.TOWN_FLOOR;
    }
  }

  // -- Stash alcove on west wall -- rows 6-9, cols 1-3
  for (let y = 5; y <= 9; y++) {
    for (let x = 1; x <= 3; x++) {
      map[y][x] = TILE.TOWN_FLOOR;
    }
  }

  // -- Decorative columns in courtyard --
  const columns = [
    [4, 4], [10, 4],
    [4, 10], [10, 10],
  ];
  for (const [cx, cy] of columns) {
    map[cy][cx] = TILE.WALL;
  }

  // -- Paintings on town walls --
  map[2][1] = TILE.PAINTING;   // west wall near stash
  map[2][13] = TILE.PAINTING;  // east wall
  map[4][0] = TILE.PAINTING;   // outer west wall
  map[10][0] = TILE.PAINTING;  // outer west wall south
  map[4][14] = TILE.PAINTING;  // outer east wall
  map[10][14] = TILE.PAINTING; // outer east wall south

  // -- Dungeon entrance at far north center --
  map[1][7] = TILE.DUNGEON_ENTRANCE;

  // Build NPC instances from TOWN_NPCS definitions
  const npcs = Object.entries(TOWN_NPCS).map(([id, def]) => ({
    id,
    x: def.x,
    y: def.y,
    icon: def.icon,
    name: def.name,
    interactType: def.interactType,
    minimapColor: def.minimapColor,
  }));

  return {
    map,
    npcs,
    dungeonEntrance: { x: 7, y: 1 },
  };
}
