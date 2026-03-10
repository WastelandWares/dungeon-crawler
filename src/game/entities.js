// ============================================================
//  ENTITY DEFINITIONS — tiles, monsters, items
// ============================================================
import { roll } from '../utils.js';
import { addMessage } from '../ui/messages.js';
import { MonsterRegistry, ItemRegistry } from '../content/registry.js';

export const TILE = { WALL: 1, FLOOR: 0, DOOR: 2, STAIRS: 3, TOWN_FLOOR: 4, DUNGEON_ENTRANCE: 5, LOCKED_DOOR: 6, BUTTON: 7, GATE: 8, PAINTING: 9 };

export const MONSTER_TYPES = {
  skeleton: {
    name: 'Skeleton',
    hp: 8, ac: 13, attack: 4, damage: [1, 6],
    xp: 50, color: '#d4c8a0', icon: '\u{1F480}',
    aggroRange: 5, speed: 1.5,
  },
};

export const ITEM_TYPES = {
  gold: {
    name: 'Gold', color: '#c9a84c', icon: '\u{1F4B0}',
    effect: (p) => { p.gold += roll(3, 6); },
  },
  potion: {
    name: 'Healing Potion', color: '#c44444', icon: '\u{1F9EA}',
    effect: (p) => {
      const heal = roll(1, 8) + 1;
      p.hp = Math.min(p.maxHp, p.hp + heal);
      addMessage(`Healed ${heal} HP!`, 'loot');
    },
  },
};

// Helper to get monster types — prefers registry, falls back to hardcoded
export function getMonsterTypes() {
  if (MonsterRegistry.size > 0) return [...MonsterRegistry.values()];
  return Object.values(MONSTER_TYPES);
}

export function getItemTypes() {
  if (ItemRegistry.size > 0) return [...ItemRegistry.values()];
  return Object.values(ITEM_TYPES);
}
