// ============================================================
//  INVENTORY UI — grid + paper doll rendering, drag & drop
// ============================================================
import { game } from '../game/state.js';
import { addMessage } from './messages.js';
import { roll } from '../utils.js';
import {
  ITEM_SHAPES, canPlace, placeItem, removeItem, getItemAt, autoPlace,
} from '../systems/inventory.js';
import {
  EQUIPMENT_SLOTS, canEquip, equipItem, unequipItem, computeEquipmentStats,
} from '../systems/equipment.js';
import { computeDerivedStats } from '../systems/progression.js';
import { closePanel } from './panels.js';
import { isTouchDevice } from './touch.js';

let panelEl = null;
let gridEl = null;
let slotsEl = null;
let tooltipEl = null;
let actionBarEl = null;

// Held item state (click-to-pick, click-to-place)
let heldItem = null;
let heldSource = null; // { type: 'grid' } or { type: 'equip', slot: '...' }

// Track hovered/selected consumable for action bar
let selectedConsumable = null;

// ============================================================
//  INIT
// ============================================================
export function initInventoryUI(panelElement) {
  panelEl = panelElement;
  gridEl = panelElement.querySelector('#inventory-grid');
  slotsEl = panelElement.querySelector('#equipment-slots');
  tooltipEl = panelElement.querySelector('#item-tooltip');
  actionBarEl = panelElement.querySelector('#inventory-action-bar');

  // Build action bar if it doesn't exist in the HTML
  if (!actionBarEl) {
    actionBarEl = document.createElement('div');
    actionBarEl.id = 'inventory-action-bar';
    actionBarEl.className = 'inv-action-bar hidden';
    // Insert after grid
    if (gridEl && gridEl.parentNode) {
      gridEl.parentNode.insertBefore(actionBarEl, gridEl.nextSibling);
    }
  }

  // Close button
  const closeBtn = panelElement.querySelector('.panel-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closePanel();
    });
    closeBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closePanel();
    });
  }

  // Grid and equipment slots are built on first refresh (after game starts)
}

// ============================================================
//  REFRESH — call whenever inventory/equipment changes
// ============================================================
let gridBuilt = false;

export function refreshInventoryUI() {
  if (!panelEl || !game || !game.player) return;
  if (!gridBuilt) {
    buildEquipmentSlots();
    buildGrid();
    gridBuilt = true;
  }
  renderGrid();
  renderEquipmentSlots();
}

// ============================================================
//  GRID BUILD & RENDER
// ============================================================
function buildGrid() {
  if (!gridEl) return;
  gridEl.innerHTML = '';
  const inv = game.player.inventory;
  for (let r = 0; r < inv.rows; r++) {
    for (let c = 0; c < inv.cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'inv-cell';
      cell.dataset.col = c;
      cell.dataset.row = r;
      cell.addEventListener('click', () => onGridCellClick(c, r));
      cell.addEventListener('dblclick', (e) => { e.preventDefault(); onGridCellRightClick(c, r); });
      cell.addEventListener('contextmenu', (e) => { e.preventDefault(); onGridCellRightClick(c, r); });
      // Long-press for touch
      let longTimer = null;
      cell.addEventListener('touchstart', () => {
        longTimer = setTimeout(() => onGridCellRightClick(c, r), 500);
      }, { passive: true });
      cell.addEventListener('touchend', () => clearTimeout(longTimer));
      cell.addEventListener('touchmove', () => clearTimeout(longTimer));
      // Tooltip + action bar on hover/touch
      cell.addEventListener('mouseenter', () => { showTooltipForGrid(c, r); showActionBarForGrid(c, r); });
      cell.addEventListener('mouseleave', () => { hideTooltip(); hideActionBar(); });
      gridEl.appendChild(cell);
    }
  }
}

function renderGrid() {
  if (!gridEl) return;
  const inv = game.player.inventory;
  const cells = gridEl.querySelectorAll('.inv-cell');

  // Clear all cell contents and state
  cells.forEach(cell => {
    cell.innerHTML = '';
    cell.classList.remove('inv-cell-occupied', 'inv-cell-held', 'inv-cell-valid', 'inv-cell-item-origin');
  });

  // Render placed items — icon goes in the top-left cell of each item
  for (const item of inv.items) {
    if (item._col == null || item._row == null) continue;
    const shapeCells = item.cells || ITEM_SHAPES[item.shape] || ITEM_SHAPES['1x1'];

    // Mark all cells occupied
    for (const [dc, dr] of shapeCells) {
      const idx = (item._row + dr) * inv.cols + (item._col + dc);
      if (cells[idx]) {
        cells[idx].classList.add('inv-cell-occupied');
      }
    }

    // Icon in origin cell
    const originIdx = item._row * inv.cols + item._col;
    if (cells[originIdx]) {
      cells[originIdx].classList.add('inv-cell-item-origin');
      const icon = document.createElement('span');
      icon.className = 'inv-item-icon';
      icon.textContent = item.icon;
      // Span across shape width/height
      const maxDc = Math.max(...shapeCells.map(([dc]) => dc)) + 1;
      const maxDr = Math.max(...shapeCells.map(([, dr]) => dr)) + 1;
      if (maxDc > 1) icon.style.width = `${maxDc * 100}%`;
      if (maxDr > 1) icon.style.height = `${maxDr * 100}%`;
      cells[originIdx].appendChild(icon);

      // Stack count badge
      if (item.stackable && item.count > 1) {
        const badge = document.createElement('span');
        badge.className = 'inv-stack-badge';
        badge.textContent = item.count;
        cells[originIdx].appendChild(badge);
      }
    }
  }

  // Highlight held item
  if (heldItem) {
    // Mark valid drop targets (for visual feedback we'd need hover pos,
    // so just dim the grid slightly to show pick-up state)
    gridEl.classList.add('inv-grid-holding');
  } else {
    gridEl.classList.remove('inv-grid-holding');
  }
}

// ============================================================
//  EQUIPMENT SLOTS BUILD & RENDER
// ============================================================
function buildEquipmentSlots() {
  if (!slotsEl) return;
  slotsEl.innerHTML = '';

  const layout = [
    ['', 'head', ''],
    ['weapon', 'chest', 'offhand'],
    ['ring1', 'hands', 'ring2'],
    ['', 'boots', ''],
  ];

  for (const row of layout) {
    const rowEl = document.createElement('div');
    rowEl.className = 'equip-row';
    for (const slotName of row) {
      const slotEl = document.createElement('div');
      if (slotName) {
        slotEl.className = 'equip-slot';
        slotEl.dataset.slot = slotName;
        const label = document.createElement('span');
        label.className = 'equip-slot-label';
        label.textContent = EQUIPMENT_SLOTS[slotName].name;
        slotEl.appendChild(label);
        slotEl.addEventListener('click', () => onEquipSlotClick(slotName));
        slotEl.addEventListener('contextmenu', (e) => e.preventDefault());
        slotEl.addEventListener('mouseenter', () => showTooltipForEquip(slotName));
        slotEl.addEventListener('mouseleave', hideTooltip);
      } else {
        slotEl.className = 'equip-slot-empty';
      }
      rowEl.appendChild(slotEl);
    }
    slotsEl.appendChild(rowEl);
  }
}

function renderEquipmentSlots() {
  if (!slotsEl) return;
  const equip = game.player.equipment;
  const slots = slotsEl.querySelectorAll('.equip-slot');

  slots.forEach(slotEl => {
    const slotName = slotEl.dataset.slot;
    const item = equip[slotName];

    // Clear old icon (keep label)
    const oldIcon = slotEl.querySelector('.equip-item-icon');
    if (oldIcon) oldIcon.remove();

    slotEl.classList.remove('equip-slot-filled', 'equip-slot-valid');

    if (item) {
      slotEl.classList.add('equip-slot-filled');
      const icon = document.createElement('span');
      icon.className = 'equip-item-icon';
      icon.textContent = item.icon;
      slotEl.appendChild(icon);
    }

    // Highlight valid drop target if holding an item
    if (heldItem && canEquip(heldItem, slotName)) {
      slotEl.classList.add('equip-slot-valid');
    }
  });
}

// ============================================================
//  CLICK HANDLERS
// ============================================================
function onGridCellClick(col, row) {
  const inv = game.player.inventory;
  const equip = game.player.equipment;

  if (heldItem) {
    // Placing held item into grid
    if (canPlace(inv, heldItem, col, row)) {
      placeItem(inv, heldItem, col, row);
      heldItem = null;
      heldSource = null;
      recalcStats();
      refreshInventoryUI();
    } else {
      // Check if there's an item at target — swap
      const targetItem = getItemAt(inv, col, row);
      if (targetItem && targetItem.id !== heldItem.id) {
        // Can't swap multi-cell items easily; just show feedback
        addMessage('No room there.', 'info');
      }
    }
  } else {
    // Show action bar for consumables on click (especially useful on mobile)
    const item = getItemAt(inv, col, row);
    if (item && item.category === 'consumable' && isTouchDevice()) {
      // On touch: single tap shows Use button, don't pick up
      showActionBarForGrid(col, row);
      showTooltipForGrid(col, row);
      return;
    }
    // Picking up item from grid
    if (item) {
      removeItem(inv, item);
      heldItem = item;
      heldSource = { type: 'grid' };
      refreshInventoryUI();
    }
  }
}

function onGridCellRightClick(col, row) {
  const inv = game.player.inventory;
  const item = getItemAt(inv, col, row);
  if (!item) return;

  if (item.category === 'consumable') {
    useConsumable(inv, item);
    refreshInventoryUI();
  }
}

function onEquipSlotClick(slotName) {
  const inv = game.player.inventory;
  const equip = game.player.equipment;

  if (heldItem) {
    // Try to equip held item
    if (canEquip(heldItem, slotName)) {
      const prev = equipItem(equip, heldItem, slotName);
      heldItem = null;
      heldSource = null;
      // If there was a previous item, put it back in inventory
      if (prev) {
        if (!autoPlace(inv, prev)) {
          // No room — hold the unequipped item instead
          heldItem = prev;
          heldSource = { type: 'equip', slot: slotName };
        }
      }
      recalcStats();
      refreshInventoryUI();
    } else {
      addMessage('Cannot equip that there.', 'info');
    }
  } else {
    // Pick up equipped item
    const item = unequipItem(equip, slotName);
    if (item) {
      heldItem = item;
      heldSource = { type: 'equip', slot: slotName };
      recalcStats();
      refreshInventoryUI();
    }
  }
}

// ============================================================
//  CONSUMABLE USE
// ============================================================
function useConsumable(inv, item) {
  const p = game.player;
  let used = false;

  if (item.healAmount) {
    const heal = roll(item.healAmount[0], item.healAmount[1]);
    p.hp = Math.min(p.maxHp, p.hp + heal);
    addMessage(`Used ${item.name}: healed ${heal} HP!`, 'loot');
    used = true;
  }

  if (item.effect === 'town_portal' || item.type === 'town_portal_scroll') {
    // Import dynamically to avoid circular deps
    import('../game/state.js').then(({ game: g, enterTown }) => {
      if (g.mode === 'dungeon') {
        enterTown();
        addMessage('A shimmering portal whisks you back to town!', 'info');
      } else {
        addMessage('The scroll fizzles — you are already in town.', 'info');
      }
    });
    used = true;
  }

  if (!used) {
    addMessage(`Used ${item.name}.`, 'info');
    used = true;
  }

  // Decrement stack
  if (item.stackable && item.count > 1) {
    item.count--;
  } else {
    removeItem(inv, item);
  }
}

// ============================================================
//  STAT RECALC
// ============================================================
function recalcStats() {
  const equip = game.player.equipment;
  const equipStats = computeEquipmentStats(equip);
  computeDerivedStats(game.player, equipStats);
}

// ============================================================
//  TOOLTIPS
// ============================================================
function showTooltipForGrid(col, row) {
  const item = getItemAt(game.player.inventory, col, row);
  if (item) showTooltip(item);
}

function showTooltipForEquip(slotName) {
  const item = game.player.equipment[slotName];
  if (item) showTooltip(item);
}

function showTooltip(item) {
  if (!tooltipEl) return;
  let html = `<div class="tooltip-name">${item.icon} ${item.name}</div>`;
  html += `<div class="tooltip-category">${item.category}</div>`;

  const stats = [];
  if (item.acBonus) stats.push(`AC +${item.acBonus}`);
  if (item.attackBonus) stats.push(`Attack +${item.attackBonus}`);
  if (item.damageBonus) stats.push(`Damage +${item.damageBonus}`);
  if (item.speedBonus) stats.push(`Speed +${item.speedBonus}`);
  if (item.damage) stats.push(`Damage: ${item.damage[0]}d${item.damage[1]}`);
  if (item.healAmount) stats.push(`Heals: ${item.healAmount[0]}d${item.healAmount[1]}`);
  if (stats.length) html += `<div class="tooltip-stats">${stats.join(' &middot; ')}</div>`;

  if (item.description) {
    html += `<div class="tooltip-desc">${item.description}</div>`;
  }

  if (item.stackable) {
    html += `<div class="tooltip-stack">${item.count} / ${item.maxStack}</div>`;
  }

  // Add usage hint for consumable items
  if (item.category === 'consumable') {
    const hint = isTouchDevice()
      ? 'Tap & hold to use'
      : 'Right-click or double-click to use';
    html += `<div class="tooltip-use-hint">${hint}</div>`;
  }

  tooltipEl.innerHTML = html;
  tooltipEl.classList.remove('hidden');
}

function hideTooltip() {
  if (!tooltipEl) return;
  tooltipEl.classList.add('hidden');
}

// ============================================================
//  ACTION BAR — visible "Use" button for consumables
// ============================================================
function showActionBarForGrid(col, row) {
  const item = getItemAt(game.player.inventory, col, row);
  if (item && item.category === 'consumable' && !heldItem) {
    selectedConsumable = { item, col, row };
    renderActionBar(item);
  } else {
    hideActionBar();
  }
}

function renderActionBar(item) {
  if (!actionBarEl) return;
  actionBarEl.innerHTML = '';

  const useBtn = document.createElement('button');
  useBtn.className = 'btn-parchment inv-action-btn';
  useBtn.textContent = `Use ${item.name}`;
  useBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (selectedConsumable) {
      useConsumable(game.player.inventory, selectedConsumable.item);
      selectedConsumable = null;
      hideActionBar();
      refreshInventoryUI();
    }
  });
  useBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedConsumable) {
      useConsumable(game.player.inventory, selectedConsumable.item);
      selectedConsumable = null;
      hideActionBar();
      refreshInventoryUI();
    }
  });

  actionBarEl.appendChild(useBtn);
  actionBarEl.classList.remove('hidden');
}

function hideActionBar() {
  if (!actionBarEl) return;
  selectedConsumable = null;
  actionBarEl.classList.add('hidden');
}

// ============================================================
//  PUBLIC: cancel held item (e.g. when panel closes)
// ============================================================
export function cancelHeld() {
  if (heldItem) {
    // Try to put it back
    const inv = game.player.inventory;
    if (!autoPlace(inv, heldItem)) {
      // If it came from equip, try to re-equip
      if (heldSource && heldSource.type === 'equip') {
        const equip = game.player.equipment;
        equipItem(equip, heldItem, heldSource.slot);
      }
    }
    heldItem = null;
    heldSource = null;
    recalcStats();
  }
}
