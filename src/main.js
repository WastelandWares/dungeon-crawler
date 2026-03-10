// ============================================================
//  MAIN — game loop, screen transitions, bootstrap
// ============================================================
import { game, newGame, restoreGame, updatePlayer, updateMonsters, enterTown, enterDungeon } from './game/state.js';
import { playerAttack } from './game/combat.js';
import { initRenderer, renderScene } from './engine/renderer.js';
import { initMinimap, renderMinimap } from './ui/minimap.js';
import { updateHUD } from './ui/hud.js';
import { addMessage, initMessages } from './ui/messages.js';
import { Input } from './engine/input.js';
import { initTouchControls, isTouchDevice } from './ui/touch.js';
import { hasSave, loadGame, deleteSave, saveGame } from './game/save.js';
import { VERSION, BUILD_DATE, RECENT_CHANGES, CFG } from './config.js';
import { registerPanel, openPanel, togglePanel, isAnyPanelOpen, closePanel } from './ui/panels.js';
import { initInventoryUI, refreshInventoryUI, cancelHeld } from './ui/inventory-ui.js';
import { initShopUI, setShopStock, refreshShopUI } from './ui/shop-ui.js';
import { getNearestInteractable, getInteractionPrompt } from './game/interactions.js';
import { initQuestUI, refreshQuestUI } from './ui/quest-ui.js';
import { initStatsUI, refreshStatsUI } from './ui/stats-ui.js';

// ============================================================
//  INIT
// ============================================================
const canvas = document.getElementById('game');
const mmCanvas = document.getElementById('minimap');

Input.init();
initTouchControls();
initRenderer(canvas);
initMinimap(mmCanvas);
initMessages(document.getElementById('messages'));

const isTouch = isTouchDevice();
const interactionPrompt = document.getElementById('interaction-prompt');

// ============================================================
//  PANELS & INVENTORY UI
// ============================================================
const invPanel = document.getElementById('panel-inventory');
if (invPanel) {
  registerPanel('inventory', invPanel);
  initInventoryUI(invPanel);
}

// Shop panel
const shopPanel = document.getElementById('panel-shop');
if (shopPanel) {
  registerPanel('shop', shopPanel);
  initShopUI(shopPanel);
}

// Quest panel
const questPanel = document.getElementById('panel-quests');
if (questPanel) {
  registerPanel('quests', questPanel);
  initQuestUI(questPanel);
}

// Stats panel
const statsPanel = document.getElementById('panel-stats');
if (statsPanel) {
  registerPanel('stats', statsPanel);
  initStatsUI(statsPanel);
}

// Inventory toggle: 'i' or Tab key
document.addEventListener('keydown', (e) => {
  if (state !== 'playing') return;
  const key = e.key.toLowerCase();
  if (key === 'i' || key === 'tab') {
    e.preventDefault();
    if (isAnyPanelOpen()) {
      cancelHeld();
      closePanel();
      if (!isTouch) canvas.requestPointerLock();
    } else {
      togglePanel('inventory');
      refreshInventoryUI();
    }
  }
  // Character sheet: 'c'
  if (key === 'c') {
    e.preventDefault();
    if (isAnyPanelOpen()) {
      cancelHeld();
      closePanel();
      if (!isTouch) canvas.requestPointerLock();
    } else {
      togglePanel('stats');
      refreshStatsUI();
    }
  }
  // Escape closes panels
  if (key === 'escape' && isAnyPanelOpen()) {
    e.preventDefault();
    cancelHeld();
    closePanel();
    if (!isTouch) canvas.requestPointerLock();
  }
  // Return to town: 't' key (only in dungeon)
  if (key === 't' && !isAnyPanelOpen() && game && game.mode === 'dungeon') {
    e.preventDefault();
    enterTown();
    addMessage('You retreat to town...', 'info');
  }
});

// Inventory button for touch (HUD button)
const invBtn = document.getElementById('btn-inventory');
if (invBtn) {
  invBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state !== 'playing') return;
    if (isAnyPanelOpen()) {
      cancelHeld();
      closePanel();
    } else {
      togglePanel('inventory');
      refreshInventoryUI();
    }
  });
  invBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (state !== 'playing') return;
    if (isAnyPanelOpen()) {
      cancelHeld();
      closePanel();
    } else {
      togglePanel('inventory');
      refreshInventoryUI();
    }
  });
}

// ============================================================
//  TITLE SCREEN — Continue / New Game
// ============================================================
function refreshTitleButtons() {
  const continueBtn = document.getElementById('btn-continue');
  const newGameBtn = document.getElementById('btn-new-game');
  const oldPrompt = document.querySelector('#title-screen .prompt');

  if (hasSave()) {
    if (continueBtn) continueBtn.style.display = 'inline-block';
    if (oldPrompt) oldPrompt.style.display = 'none';
  } else {
    if (continueBtn) continueBtn.style.display = 'none';
    if (oldPrompt) oldPrompt.style.display = 'none';
  }
  if (newGameBtn) newGameBtn.style.display = 'inline-block';
}

refreshTitleButtons();

// Populate version and changelog on title screen
const versionEl = document.getElementById('title-version');
if (versionEl) versionEl.textContent = `v${VERSION} — ${BUILD_DATE}`;

const changelogEl = document.getElementById('title-changelog');
if (changelogEl && RECENT_CHANGES.length) {
  changelogEl.innerHTML = '<span class="changelog-label">Recent Changes</span>' +
    RECENT_CHANGES.slice(0, 4).map(c => `<span class="changelog-item">• ${c}</span>`).join('');
}

// ============================================================
//  GAME LOOP
// ============================================================
let state = 'title'; // 'title' | 'playing' | 'dead'
let lastTime = 0;

function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);
  if (state !== 'playing') return;
  if (!lastTime) { lastTime = timestamp; return; }

  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  // Track play time
  if (game && game.meta) game.meta.playTime += dt;

  const panelOpen = isAnyPanelOpen();
  updatePlayer(dt);
  if (!panelOpen) updateMonsters(dt, timestamp);
  renderScene(timestamp);
  renderMinimap();
  updateHUD();

  // Town interaction system
  if (game.mode === 'town' && game.town) {
    const interactable = getNearestInteractable(
      game.player, game.town.npcs, CFG.interactRange || 2.0, game.map
    );

    if (interactable && interactionPrompt) {
      interactionPrompt.textContent = getInteractionPrompt(interactable, isTouch);
      interactionPrompt.classList.add('visible');
    } else if (interactionPrompt) {
      interactionPrompt.classList.remove('visible');
    }

    // Handle interaction (E key or touch tap in town)
    if (interactable && (Input.consume('e') || (isTouch && Input.consumeAttack()))) {
      const type = interactable.npc.interactType;
      if (type === 'dungeon_entrance') {
        enterDungeon();
      } else if (type === 'shop') {
        addMessage('Grimwald nods. "Browse my wares, adventurer."', 'info');
        if (game.shopStock) {
          setShopStock(game.shopStock);
        }
        openPanel('shop');
        refreshShopUI();
      } else if (type === 'quests') {
        refreshQuestUI();
        togglePanel('quests');
      } else if (type === 'stash') {
        const p = game.player;
        if (p.hp < p.maxHp) {
          p.hp = p.maxHp;
          addMessage('You rest at the stash chest. HP fully restored!', 'info');
        } else {
          addMessage('You check the stash chest. You feel well-rested.', 'info');
        }
      }
    }
  } else if (interactionPrompt) {
    interactionPrompt.classList.remove('visible');
  }

  // Touch attack (checked every frame) — only in dungeon, skip if panel open
  if (game.mode === 'dungeon' && Input.consumeAttack() && !isAnyPanelOpen()) {
    playerAttack();
  }

  // Check death
  if (game.player.hp <= 0) {
    state = 'dead';
    if (!isTouch) document.exitPointerLock();
    const ds = document.getElementById('death-screen');
    ds.style.display = 'flex';
    document.getElementById('death-stats').innerHTML =
      `Reached dungeon level ${game.level}<br>` +
      `Level ${game.player.level} adventurer<br>` +
      `Earned ${game.player.xp} XP &nbsp;|&nbsp; Found ${game.player.gold} gold<br>` +
      `Monsters slain: ${game.meta.totalKills}`;
  }
}

// ============================================================
//  SCREEN TRANSITIONS
// ============================================================
function beginNewGame(screenId) {
  document.getElementById(screenId).style.display = 'none';
  if (!isTouch) canvas.requestPointerLock();
  deleteSave();
  newGame();
  state = 'playing';
  lastTime = 0;
  addMessage('Welcome to town, adventurer.', 'info');
  addMessage('Visit the merchants, check the bounty board, or enter the dungeon.', 'info');
}

function continueGame(screenId) {
  const saveData = loadGame();
  if (!saveData) {
    // Save corrupted or missing — fall back to new game
    beginNewGame(screenId);
    return;
  }
  document.getElementById(screenId).style.display = 'none';
  if (!isTouch) canvas.requestPointerLock();
  restoreGame(saveData);
  state = 'playing';
  lastTime = 0;
  addMessage('Welcome back, adventurer.', 'info');
}

// Continue button
const continueBtn = document.getElementById('btn-continue');
if (continueBtn) {
  continueBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    continueGame('title-screen');
  });
  continueBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    continueGame('title-screen');
  });
}

// New Game button
const newGameBtn = document.getElementById('btn-new-game');
if (newGameBtn) {
  newGameBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    beginNewGame('title-screen');
  });
  newGameBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    beginNewGame('title-screen');
  });
}

// Death screen — restart
const deathScreen = document.getElementById('death-screen');
function handleDeath() {
  deathScreen.style.display = 'none';
  // Return to town — keep equipped gear and gold
  // Restore HP to half max (survived, but battered)
  game.player.hp = Math.max(1, Math.floor(game.player.maxHp / 2));
  enterTown();
  state = 'playing';
  lastTime = 0;
  addMessage('You wake up in town, battered but alive...', 'info');
  addMessage('Your gold and equipment are intact.', 'info');
}
deathScreen.addEventListener('click', handleDeath);
deathScreen.addEventListener('touchend', e => {
  e.preventDefault();
  handleDeath();
});

canvas.addEventListener('click', () => {
  if (state === 'playing' && !isAnyPanelOpen()) {
    if (!isTouch && !Input.pointerLocked) {
      canvas.requestPointerLock();
    } else if (Input.pointerLocked) {
      playerAttack();
    }
  }
});

requestAnimationFrame(gameLoop);
