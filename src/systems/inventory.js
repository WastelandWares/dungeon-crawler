// ============================================================
//  INVENTORY — grid-based backpack (8x4 default)
// ============================================================

/** Shape lookup: maps shape string from content to cell offsets [col, row] */
export const ITEM_SHAPES = {
  '1x1': [[0, 0]],
  '2x1': [[0, 0], [1, 0]],
  '1x2': [[0, 0], [0, 1]],
  '2x2': [[0, 0], [1, 0], [0, 1], [1, 1]],
};

let nextItemId = 1;

/** Generate a unique item ID */
export function genItemId() {
  return nextItemId++;
}

/**
 * Create an inventory item object from content registry data.
 * These are plain JSON-serializable objects for save compatibility.
 */
export function createItemFromContent(contentData) {
  const shape = contentData.shape || '1x1';
  return {
    id: genItemId(),
    type: contentData.id || contentData.name.toLowerCase().replace(/\s+/g, '_'),
    name: contentData.name,
    icon: contentData.icon || '?',
    shape,
    cells: ITEM_SHAPES[shape] || ITEM_SHAPES['1x1'],
    category: contentData.category || 'misc',
    slot: contentData.slot || null,
    stackable: !!contentData.stackable,
    maxStack: contentData.maxStack || 1,
    count: 1,
    description: contentData.description || '',
    // Stat bonuses
    acBonus: contentData.acBonus || 0,
    attackBonus: contentData.attackBonus || 0,
    damageBonus: contentData.damageBonus || 0,
    speedBonus: contentData.speedBonus || 0,
    damage: contentData.damage || null,
    healAmount: contentData.healAmount || null,
    basePrice: contentData.basePrice || 0,
    tier: contentData.tier || 1,
  };
}

/**
 * Create a fresh inventory grid.
 */
export function createInventory(cols = 8, rows = 4) {
  const grid = [];
  for (let r = 0; r < rows; r++) {
    grid.push(new Array(cols).fill(null));
  }
  return { cols, rows, grid, items: [] };
}

/**
 * Check if an item can be placed at (col, row) in the inventory.
 */
export function canPlace(inventory, item, col, row) {
  const cells = item.cells || ITEM_SHAPES[item.shape] || ITEM_SHAPES['1x1'];
  for (const [dc, dr] of cells) {
    const c = col + dc;
    const r = row + dr;
    if (c < 0 || c >= inventory.cols || r < 0 || r >= inventory.rows) return false;
    if (inventory.grid[r][c] !== null) return false;
  }
  return true;
}

/**
 * Place an item at (col, row). Marks grid cells with item id.
 * Does NOT check — call canPlace first.
 */
export function placeItem(inventory, item, col, row) {
  const cells = item.cells || ITEM_SHAPES[item.shape] || ITEM_SHAPES['1x1'];
  item._col = col;
  item._row = row;
  for (const [dc, dr] of cells) {
    inventory.grid[row + dr][col + dc] = item.id;
  }
  if (!inventory.items.find(i => i.id === item.id)) {
    inventory.items.push(item);
  }
}

/**
 * Remove an item from the inventory, clearing its grid cells.
 */
export function removeItem(inventory, item) {
  const cells = item.cells || ITEM_SHAPES[item.shape] || ITEM_SHAPES['1x1'];
  if (item._col != null && item._row != null) {
    for (const [dc, dr] of cells) {
      const c = item._col + dc;
      const r = item._row + dr;
      if (c >= 0 && c < inventory.cols && r >= 0 && r < inventory.rows) {
        if (inventory.grid[r][c] === item.id) {
          inventory.grid[r][c] = null;
        }
      }
    }
  }
  inventory.items = inventory.items.filter(i => i.id !== item.id);
  item._col = null;
  item._row = null;
}

/**
 * Try to auto-place an item in the first available position.
 * For stackable items, first tries to merge into an existing stack.
 * Returns true if placed, false if no room.
 */
export function autoPlace(inventory, item) {
  // Stackable: try to merge into existing stack first
  if (item.stackable) {
    for (const existing of inventory.items) {
      if (existing.type === item.type && existing.stackable && existing.count < existing.maxStack) {
        const spaceLeft = existing.maxStack - existing.count;
        const toAdd = Math.min(spaceLeft, item.count);
        existing.count += toAdd;
        item.count -= toAdd;
        if (item.count <= 0) return true;
      }
    }
  }

  // Try every position
  for (let r = 0; r < inventory.rows; r++) {
    for (let c = 0; c < inventory.cols; c++) {
      if (canPlace(inventory, item, c, r)) {
        placeItem(inventory, item, c, r);
        return true;
      }
    }
  }
  return false;
}

/**
 * Get the item occupying a grid cell, or null.
 */
export function getItemAt(inventory, col, row) {
  if (col < 0 || col >= inventory.cols || row < 0 || row >= inventory.rows) return null;
  const id = inventory.grid[row][col];
  if (id === null) return null;
  return inventory.items.find(i => i.id === id) || null;
}
