// ============================================================
//  QUEST / BOUNTY BOARD UI
// ============================================================
import { game } from '../game/state.js';
import { checkQuestProgress, completeQuest } from '../systems/quests.js';
import { addMessage } from './messages.js';
import { checkLevelUp, applyLevelUp } from '../systems/progression.js';
import { GameAudio } from '../engine/audio.js';

const MAX_ACTIVE_QUESTS = 3;

let questContentEl = null;

export function initQuestUI(panelElement) {
  questContentEl = panelElement.querySelector('#quest-content');
}

export function refreshQuestUI() {
  if (!questContentEl || !game || !game.quests) return;

  const { active, available } = game.quests;
  let html = '';

  // --- Active Quests ---
  const activeQuests = active.filter(q => q.status === 'active');
  const completeQuests = active.filter(q => q.status === 'complete');

  if (completeQuests.length > 0) {
    html += '<div class="quest-section"><h3 class="quest-section-title">Completed</h3>';
    for (const q of completeQuests) {
      html += renderQuestCard(q, 'complete');
    }
    html += '</div>';
  }

  if (activeQuests.length > 0) {
    html += '<div class="quest-section"><h3 class="quest-section-title">Active Quests</h3>';
    for (const q of activeQuests) {
      html += renderQuestCard(q, 'active');
    }
    html += '</div>';
  }

  // --- Available Bounties ---
  if (available.length > 0) {
    html += '<div class="quest-section"><h3 class="quest-section-title">Available Bounties</h3>';
    for (const q of available) {
      html += renderQuestCard(q, 'available');
    }
    html += '</div>';
  }

  if (!html) {
    html = '<div class="quest-empty">No bounties posted. Return to town to check the board.</div>';
  }

  questContentEl.innerHTML = html;

  // Bind buttons
  questContentEl.querySelectorAll('.quest-accept-btn').forEach(btn => {
    btn.addEventListener('click', () => acceptQuest(btn.dataset.questId));
  });
  questContentEl.querySelectorAll('.quest-claim-btn').forEach(btn => {
    btn.addEventListener('click', () => claimQuest(btn.dataset.questId));
  });
}

function getQuestIcon(type) {
  if (type === 'kill') return '\u2694';   // crossed swords
  if (type === 'floor') return '\u26F0';  // mountain
  if (type === 'survive') return '\uD83D\uDEE1'; // shield
  return '\u2753';
}

function renderDifficultyStars(difficulty) {
  const max = 5;
  const filled = Math.min(difficulty, max);
  return '<span class="quest-stars">' +
    '\u2605'.repeat(filled) +
    '\u2606'.repeat(max - filled) +
    '</span>';
}

function renderProgressBar(current, total) {
  const pct = Math.min(100, Math.floor((current / total) * 100));
  return `<div class="quest-progress-bar">` +
    `<div class="quest-progress-fill" style="width:${pct}%"></div>` +
    `</div>` +
    `<span class="quest-progress-text">[${current}/${total}]</span>`;
}

function getProgressTotal(quest) {
  if (quest.type === 'kill') return quest.count;
  if (quest.type === 'floor') return quest.targetFloor;
  if (quest.type === 'survive') return quest.targetFloors;
  return 1;
}

function renderQuestCard(quest, mode) {
  const icon = getQuestIcon(quest.type);
  const stars = renderDifficultyStars(quest.difficulty);
  const total = getProgressTotal(quest);

  let progressHtml = '';
  let actionHtml = '';

  if (mode === 'active') {
    progressHtml = `<div class="quest-progress-row">${renderProgressBar(quest.progress, total)}</div>`;
  } else if (mode === 'complete') {
    actionHtml = `<button class="quest-claim-btn btn-parchment" data-quest-id="${quest.id}">Claim Reward</button>`;
  } else if (mode === 'available') {
    const activeCount = game.quests.active.filter(q => q.status === 'active' || q.status === 'complete').length;
    if (activeCount >= MAX_ACTIVE_QUESTS) {
      actionHtml = '<span class="quest-full-msg">Quest log full</span>';
    } else {
      actionHtml = `<button class="quest-accept-btn btn-parchment" data-quest-id="${quest.id}">Accept</button>`;
    }
  }

  return `<div class="quest-card quest-card-${mode}">` +
    `<div class="quest-card-header">` +
      `<span class="quest-icon">${icon}</span>` +
      `<span class="quest-title">${quest.title}</span>` +
      stars +
    `</div>` +
    `<div class="quest-desc">${quest.description}</div>` +
    progressHtml +
    `<div class="quest-rewards">` +
      `<span class="quest-reward-gold">\uD83D\uDCB0 ${quest.goldReward}g</span>` +
      `<span class="quest-reward-xp">\u2728 ${quest.xpReward}xp</span>` +
    `</div>` +
    `<div class="quest-action">${actionHtml}</div>` +
  `</div>`;
}

function acceptQuest(questId) {
  const id = Number(questId);
  const idx = game.quests.available.findIndex(q => q.id === id);
  if (idx === -1) return;

  const activeCount = game.quests.active.filter(q => q.status === 'active' || q.status === 'complete').length;
  if (activeCount >= MAX_ACTIVE_QUESTS) {
    addMessage('You cannot take on more than 3 quests at a time.', 'info');
    return;
  }

  const quest = game.quests.available.splice(idx, 1)[0];
  quest.status = 'active';
  game.quests.active.push(quest);
  addMessage(`Quest accepted: ${quest.title}`, 'info');
  refreshQuestUI();
}

function claimQuest(questId) {
  const id = Number(questId);
  const idx = game.quests.active.findIndex(q => q.id === id && q.status === 'complete');
  if (idx === -1) return;

  const quest = game.quests.active[idx];
  const rewards = completeQuest(quest, game.player);

  // Remove from active list
  game.quests.active.splice(idx, 1);

  addMessage(`Quest complete: ${quest.title}! +${rewards.gold}g, +${rewards.xp}xp`, 'loot');

  // Check for level up from quest XP
  while (checkLevelUp(game.player)) {
    applyLevelUp(game.player);
    addMessage(`LEVEL UP! You are now level ${game.player.level}!`, 'info');
    GameAudio.pickup();
  }

  refreshQuestUI();
}
