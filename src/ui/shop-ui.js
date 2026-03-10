// ============================================================
//  SHOP UI — buy/sell panel with stock list & mini inventory
// ============================================================
import { game } from '../game/state.js';
import { getBuyPrice, getSellPrice } from '../systems/shop.js';
import { autoPlace, createItemFromContent, removeItem, getItemAt } from '../systems/inventory.js';
import { addMessage } from './messages.js';
import { abilityMod } from '../systems/progression.js';
import { closePanel } from './panels.js';

let shopContentEl = null;
let shopStock = [];
let selectedSellItem = null;

// ============================================================
//  INIT
// ============================================================
export function initShopUI(panelElement) {
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
  shopContentEl = panelElement.querySelector('#shop-content');
}

// ============================================================
//  PUBLIC: set stock & refresh
// ============================================================
export function setShopStock(stock) {
  shopStock = stock;
  selectedSellItem = null;
}

export function refreshShopUI() {
  if (!shopContentEl || !game || !game.player) return;
  selectedSellItem = null;
  render();
}

// ============================================================
//  RENDER
// ============================================================
function render() {
  const p = game.player;
  const chaMod = abilityMod(p.abilities.cha);

  let html = '';

  // Gold display
  html += `<div class="shop-header">
    <span class="shop-gold"><span class="shop-coin">&#x1FA99;</span> Gold: <span id="shop-gold-val">${p.gold}</span></span>
  </div>`;

  // Stock list
  html += '<div class="shop-stock-list">';
  if (shopStock.length === 0) {
    html += '<div class="shop-empty">The shop is empty.</div>';
  }
  for (let i = 0; i < shopStock.length; i++) {
    const entry = shopStock[i];
    const item = entry.item;
    const qty = entry.quantity;
    if (qty <= 0) continue;

    const price = getBuyPrice(item, chaMod);
    const canAfford = p.gold >= price;
    const stat = getKeyStat(item);
    const dimClass = canAfford ? '' : ' shop-item-dim';

    html += `<div class="shop-item-row${dimClass}" data-idx="${i}">
      <span class="shop-item-icon">${item.icon || '?'}</span>
      <div class="shop-item-info">
        <span class="shop-item-name">${item.name}</span>
        ${stat ? `<span class="shop-item-stat">${stat}</span>` : ''}
      </div>
      <span class="shop-item-qty">x${qty}</span>
      <span class="shop-item-price"><span class="shop-coin">&#x1FA99;</span>${price}</span>
      <button class="shop-btn-buy${canAfford ? '' : ' disabled'}" data-idx="${i}">Buy</button>
    </div>`;
  }
  html += '</div>';

  // Sell divider
  html += '<div class="shop-divider">Your Inventory — click to sell</div>';

  // Mini inventory grid
  html += '<div class="shop-inventory-grid">';
  const inv = p.inventory;
  for (let r = 0; r < inv.rows; r++) {
    for (let c = 0; c < inv.cols; c++) {
      const item = getItemAt(inv, c, r);
      const isOrigin = item && item._col === c && item._row === r;
      let cellClass = 'shop-inv-cell';
      if (item) cellClass += ' shop-inv-cell-occupied';
      if (selectedSellItem && item && item.id === selectedSellItem.id) {
        cellClass += ' shop-inv-cell-selected';
      }
      html += `<div class="${cellClass}" data-col="${c}" data-row="${r}">`;
      if (isOrigin) {
        html += `<span class="shop-inv-icon">${item.icon}</span>`;
        if (item.stackable && item.count > 1) {
          html += `<span class="shop-inv-stack">${item.count}</span>`;
        }
      }
      html += '</div>';
    }
  }
  html += '</div>';

  // Sell confirmation bar
  if (selectedSellItem) {
    const sellPrice = getSellPrice(selectedSellItem, chaMod);
    html += `<div class="shop-sell-bar">
      <span>Sell ${selectedSellItem.icon} ${selectedSellItem.name} for <span class="shop-coin">&#x1FA99;</span>${sellPrice}?</span>
      <button class="shop-btn-sell" id="shop-confirm-sell">Sell</button>
      <button class="shop-btn-cancel" id="shop-cancel-sell">Cancel</button>
    </div>`;
  }

  shopContentEl.innerHTML = html;
  attachHandlers(chaMod);
}

// ============================================================
//  EVENT HANDLERS
// ============================================================
function attachHandlers(chaMod) {
  // Buy buttons
  const buyBtns = shopContentEl.querySelectorAll('.shop-btn-buy:not(.disabled)');
  buyBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleBuy(parseInt(btn.dataset.idx), chaMod);
    });
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleBuy(parseInt(btn.dataset.idx), chaMod);
    });
  });

  // Inventory cells — click to select for selling
  const cells = shopContentEl.querySelectorAll('.shop-inv-cell-occupied');
  cells.forEach(cell => {
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      const col = parseInt(cell.dataset.col);
      const row = parseInt(cell.dataset.row);
      handleSelectSell(col, row);
    });
    cell.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const col = parseInt(cell.dataset.col);
      const row = parseInt(cell.dataset.row);
      handleSelectSell(col, row);
    });
  });

  // Sell confirm/cancel
  const confirmBtn = shopContentEl.querySelector('#shop-confirm-sell');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleSell(chaMod);
    });
    confirmBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleSell(chaMod);
    });
  }

  const cancelBtn = shopContentEl.querySelector('#shop-cancel-sell');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedSellItem = null;
      render();
    });
    cancelBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectedSellItem = null;
      render();
    });
  }
}

function handleBuy(idx, chaMod) {
  const entry = shopStock[idx];
  if (!entry || entry.quantity <= 0) return;

  const p = game.player;
  const price = getBuyPrice(entry.item, chaMod);

  if (p.gold < price) {
    addMessage('Not enough gold!', 'info');
    return;
  }

  // Create inventory item from content data and try to place
  const invItem = createItemFromContent(entry.item);
  if (!autoPlace(p.inventory, invItem)) {
    addMessage('Inventory full!', 'info');
    return;
  }

  p.gold -= price;
  entry.quantity--;
  addMessage(`Bought ${entry.item.name} for ${price} gold.`, 'loot');
  render();
}

function handleSelectSell(col, row) {
  const item = getItemAt(game.player.inventory, col, row);
  if (!item) return;
  selectedSellItem = item;
  render();
}

function handleSell(chaMod) {
  if (!selectedSellItem) return;

  const p = game.player;
  const sellPrice = getSellPrice(selectedSellItem, chaMod);

  // If stackable with count > 1, sell one from the stack
  if (selectedSellItem.stackable && selectedSellItem.count > 1) {
    selectedSellItem.count--;
    p.gold += sellPrice;
    addMessage(`Sold 1 ${selectedSellItem.name} for ${sellPrice} gold.`, 'loot');
  } else {
    removeItem(p.inventory, selectedSellItem);
    p.gold += sellPrice;
    addMessage(`Sold ${selectedSellItem.name} for ${sellPrice} gold.`, 'loot');
  }

  selectedSellItem = null;
  render();
}

// ============================================================
//  HELPERS
// ============================================================
function getKeyStat(item) {
  if (item.damage) return `${item.damage[0]}d${item.damage[1]} dmg`;
  if (item.acBonus) return `+${item.acBonus} AC`;
  if (item.healAmount) return `${item.healAmount[0]}d${item.healAmount[1]} heal`;
  if (item.attackBonus) return `+${item.attackBonus} atk`;
  if (item.speedBonus) return `+${item.speedBonus} spd`;
  return '';
}
