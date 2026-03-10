// ============================================================
//  EQUIPMENT — paper doll slot system
// ============================================================

export const EQUIPMENT_SLOTS = {
  head:    { name: 'Head',      accepts: ['helmet'] },
  chest:   { name: 'Chest',     accepts: ['armor'] },
  hands:   { name: 'Hands',     accepts: ['gloves'] },
  weapon:  { name: 'Main Hand', accepts: ['weapon'] },
  offhand: { name: 'Off Hand',  accepts: ['shield', 'weapon'] },
  ring1:   { name: 'Ring',      accepts: ['ring'] },
  ring2:   { name: 'Ring',      accepts: ['ring'] },
  boots:   { name: 'Boots',     accepts: ['boots'] },
};

/**
 * Create a fresh equipment object with all slots empty.
 */
export function createEquipment() {
  const equip = {};
  for (const slot of Object.keys(EQUIPMENT_SLOTS)) {
    equip[slot] = null;
  }
  return equip;
}

/**
 * Check if an item can be equipped in a given slot.
 */
export function canEquip(item, slotName) {
  const slotDef = EQUIPMENT_SLOTS[slotName];
  if (!slotDef) return false;
  if (!item || !item.category) return false;
  return slotDef.accepts.includes(item.category);
}

/**
 * Equip an item into a slot. Returns the previously equipped item (or null).
 */
export function equipItem(equipment, item, slotName) {
  if (!canEquip(item, slotName)) return null;
  const prev = equipment[slotName];
  equipment[slotName] = item;
  return prev;
}

/**
 * Remove and return the item from a slot.
 */
export function unequipItem(equipment, slotName) {
  const item = equipment[slotName];
  equipment[slotName] = null;
  return item;
}

/**
 * Sum all stat bonuses from equipped items.
 * Returns { acBonus, attackBonus, damageBonus, speedBonus }
 */
export function computeEquipmentStats(equipment) {
  const stats = {
    acBonus: 0,
    attackBonus: 0,
    damageBonus: 0,
    speedBonus: 0,
  };

  for (const slotName of Object.keys(EQUIPMENT_SLOTS)) {
    const item = equipment[slotName];
    if (!item) continue;
    stats.acBonus += item.acBonus || 0;
    stats.attackBonus += item.attackBonus || 0;
    stats.damageBonus += item.damageBonus || 0;
    stats.speedBonus += item.speedBonus || 0;
  }

  return stats;
}
