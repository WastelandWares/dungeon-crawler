// ============================================================
//  SHOP SYSTEM — tiered stock generation, buy/sell pricing
// ============================================================
import { ItemRegistry, getItemsByTier } from '../content/registry.js';
import { getItemTypes } from '../game/entities.js';
import { abilityMod } from './progression.js';

/**
 * Generate shop stock based on player's deepest dungeon floor.
 * Tier = ceil(maxFloor / 3): floors 1-3 = tier 1, 4-6 = tier 2, 7+ = tier 3.
 * Always includes at least 1 healing potion and 1 weapon.
 * @param {number} maxFloor - highest floor the player has reached
 * @param {number} count - number of stock entries to generate (default 8)
 * @returns {Array<{item: object, quantity: number}>}
 */
export function generateShopStock(maxFloor, count = 8) {
  const tier = Math.ceil(Math.max(1, maxFloor) / 3);
  let available = getItemsByTier(tier);

  // Fall back to entity item types if registry is empty (filter out gold)
  if (!available.length) {
    available = getItemTypes().filter(i => i.name !== 'Gold' && i.type !== 'gold');
  }

  if (!available.length) return [];

  const stock = [];
  const used = new Set();

  // Guarantee at least 1 healing potion
  const potion = available.find(i =>
    i.category === 'consumable' || (i.name && i.name.toLowerCase().includes('potion'))
  );
  if (potion) {
    stock.push({ item: potion, quantity: randomQty() });
    used.add(potion.id || potion.name);
  }

  // Guarantee at least 1 weapon
  const weapon = available.find(i =>
    i.category === 'weapon' && !used.has(i.id || i.name)
  );
  if (weapon) {
    stock.push({ item: weapon, quantity: randomQty() });
    used.add(weapon.id || weapon.name);
  }

  // Fill remaining slots with random items
  const remaining = available.filter(i => !used.has(i.id || i.name));
  const shuffled = shuffleArray([...remaining]);

  for (const item of shuffled) {
    if (stock.length >= count) break;
    stock.push({ item, quantity: randomQty() });
  }

  return stock;
}

/**
 * Calculate buy price (what the player pays).
 * Higher CHA mod = slight discount.
 */
export function getBuyPrice(item, chaMod = 0) {
  const base = item.basePrice || 10;
  return Math.max(1, base - Math.floor(chaMod / 2));
}

/**
 * Calculate sell price (what the player receives).
 * Higher CHA mod = slightly better sell price.
 */
export function getSellPrice(item, chaMod = 0) {
  const base = item.basePrice || 10;
  return Math.max(1, Math.floor(base / 2) + Math.floor(chaMod / 2));
}

/**
 * Regenerate shop stock — called when returning to town.
 */
export function refreshStock(maxFloor) {
  return generateShopStock(maxFloor);
}

// ---- helpers ----

function randomQty() {
  return 1 + Math.floor(Math.random() * 3); // 1-3
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
