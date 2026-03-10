// ============================================================
//  CONTENT REGISTRY — stores loaded content for runtime use
// ============================================================
import { loadAllContent } from './loader.js';

export const MonsterRegistry = new Map();
export const ItemRegistry = new Map();
export const QuestTemplateRegistry = new Map();

/**
 * Register a monster definition from parsed content data.
 */
export function registerMonster(id, data) {
  MonsterRegistry.set(id, { ...data.meta, description: data.body, id });
}

/**
 * Register an item definition from parsed content data.
 */
export function registerItem(id, data) {
  ItemRegistry.set(id, { ...data.meta, description: data.body, id });
}

/**
 * Register a quest template from parsed content data.
 */
export function registerQuestTemplate(id, data) {
  QuestTemplateRegistry.set(id, { ...data.meta, description: data.body, id });
}

/**
 * Load all content from markdown files and populate registries.
 * Falls back silently so hardcoded entities.js data still works.
 */
export async function initContent(basePath = 'content') {
  try {
    const all = await loadAllContent(basePath);

    for (const data of all.monsters) {
      const id = fileNameToId(data.meta.name || 'unknown');
      registerMonster(id, data);
    }

    for (const data of all.items) {
      const id = fileNameToId(data.meta.name || 'unknown');
      registerItem(id, data);
    }

    for (const data of all.quests) {
      const id = fileNameToId(data.meta.name || 'unknown');
      registerQuestTemplate(id, data);
    }

    console.log(`[Content] Loaded ${MonsterRegistry.size} monsters, ${ItemRegistry.size} items, ${QuestTemplateRegistry.size} quest templates`);
  } catch (err) {
    console.warn('[Content] Failed to load content files, falling back to hardcoded entities:', err.message);
  }
}

/**
 * Get all monsters valid for a given dungeon floor.
 */
export function getMonstersByFloor(floor) {
  return [...MonsterRegistry.values()].filter(m =>
    floor >= (m.minFloor || 1) && floor <= (m.maxFloor || 99)
  );
}

/**
 * Get all items up to and including a given tier.
 */
export function getItemsByTier(tier) {
  return [...ItemRegistry.values()].filter(i => (i.tier || 1) <= tier);
}

/**
 * Convert a display name to a snake_case id.
 */
function fileNameToId(name) {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}
