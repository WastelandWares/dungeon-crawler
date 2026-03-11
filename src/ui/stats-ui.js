// ============================================================
//  STATS UI — Character sheet panel
// ============================================================
import { game } from '../game/state.js';
import { abilityMod, getXpForLevel, applyLevelUp, checkLevelUp, computeDerivedStats, isAbilityScoreLevel, getFeatLevels } from '../systems/progression.js';
import { FEAT_REGISTRY, getAvailableFeats, hasFeat } from '../systems/feats.js';
import { computeEquipmentStats } from '../systems/equipment.js';
import { addMessage } from './messages.js';

let container = null;

export function initStatsUI(panel) {
  container = panel.querySelector('#stats-content');
}

const ABILITY_NAMES = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

const ABILITY_DESCS = {
  str: 'Melee attack & damage', dex: 'AC & reflex saves',
  con: 'HP per level & fort saves', int: 'Reserved',
  wis: 'Will saves', cha: 'Shop prices',
};

/** Build dynamic level-up notice text based on what the next level grants */
function getLevelUpNotice(player) {
  const nextLevel = player.level + 1;
  let text = 'Ready to level up! Gain HP and improved combat abilities.';
  const extras = [];
  if (typeof isAbilityScoreLevel === 'function' && isAbilityScoreLevel(nextLevel)) {
    extras.push('Ability score increase');
  }
  if (typeof getFeatLevels === 'function') {
    const featLevels = getFeatLevels();
    if (featLevels && featLevels.includes(nextLevel)) {
      extras.push('Choose a new feat');
    }
  }
  if (extras.length > 0) {
    text += ' + ' + extras.join(' + ');
  }
  return text;
}

/** Render the list of player's current feats */
function renderFeatsList(player) {
  const feats = player.feats || [];
  if (feats.length === 0) return '<div class="feat-item-desc">No feats yet.</div>';

  let html = '<div class="feat-list">';
  for (const featId of feats) {
    const feat = FEAT_REGISTRY ? FEAT_REGISTRY[featId] : null;
    if (feat) {
      html += `<div class="feat-item">`;
      html += `<div class="feat-item-name">${feat.name}</div>`;
      html += `<div class="feat-item-desc">${feat.description || ''}</div>`;
      html += `</div>`;
    } else {
      html += `<div class="feat-item"><div class="feat-item-name">${featId}</div></div>`;
    }
  }
  html += '</div>';
  return html;
}

/** Render feat picker for pending feat selections */
function renderFeatPicker(player) {
  if (!player.pendingFeats || player.pendingFeats <= 0) return '';
  let available = [];
  if (typeof getAvailableFeats === 'function') {
    available = getAvailableFeats(player);
  }
  if (available.length === 0) return '<div class="feat-item-desc">No feats available.</div>';

  let html = '<div class="feat-picker">';
  for (const feat of available) {
    html += `<div class="feat-option">`;
    html += `<div class="feat-option-info">`;
    html += `<div class="feat-option-name">${feat.name}</div>`;
    html += `<div class="feat-option-desc">${feat.description || ''}</div>`;
    // Build prereq display text from the prereqs object
    if (feat.prereqs && Object.keys(feat.prereqs).length > 0) {
      const parts = [];
      if (feat.prereqs.str) parts.push(`STR ${feat.prereqs.str}`);
      if (feat.prereqs.dex) parts.push(`DEX ${feat.prereqs.dex}`);
      if (feat.prereqs.con) parts.push(`CON ${feat.prereqs.con}`);
      if (feat.prereqs.wis) parts.push(`WIS ${feat.prereqs.wis}`);
      if (feat.prereqs.bab) parts.push(`BAB +${feat.prereqs.bab}`);
      if (feat.prereqs.level) parts.push(`Level ${feat.prereqs.level}`);
      if (feat.prereqs.feats) {
        for (const fid of feat.prereqs.feats) {
          const req = FEAT_REGISTRY[fid];
          parts.push(req ? req.name : fid);
        }
      }
      if (parts.length > 0) {
        html += `<div class="feat-prereq">Requires: ${parts.join(', ')}</div>`;
      }
    }
    html += `</div>`;
    html += `<button class="btn-feat-select" data-feat-id="${feat.id}">Select</button>`;
    html += `</div>`;
  }
  html += '</div>';
  return html;
}

export function refreshStatsUI() {
  if (!container || !game || !game.player) return;
  const p = game.player;
  const xpNeeded = getXpForLevel(p.level);
  const canLevel = checkLevelUp(p);

  let html = '<div class="stats-grid">';

  // Level & XP
  html += `<div class="stats-section">`;
  html += `<div class="stats-row"><span class="stats-label">Level</span><span class="stats-value">${p.level}</span></div>`;
  html += `<div class="stats-row"><span class="stats-label">XP</span><span class="stats-value">${xpNeeded === Infinity ? `${p.xp} (MAX)` : `${p.xp} / ${xpNeeded}`}</span></div>`;
  html += `<div class="stats-row"><span class="stats-label">HP</span><span class="stats-value">${p.hp} / ${p.maxHp}</span></div>`;
  html += `<div class="stats-row"><span class="stats-label">AC</span><span class="stats-value">${p.ac}</span></div>`;
  html += `<div class="stats-row"><span class="stats-label">Attack</span><span class="stats-value">+${p.attackBonus}</span></div>`;
  html += `<div class="stats-row"><span class="stats-label">Damage</span><span class="stats-value">+${p.damageBonus}</span></div>`;
  html += `<div class="stats-row"><span class="stats-label">Gold</span><span class="stats-value">${p.gold}</span></div>`;
  html += `</div>`;

  // Level up notice
  if (canLevel) {
    html += `<div class="stats-levelup">${getLevelUpNotice(p)}</div>`;
    html += `<button class="btn-parchment stats-levelup-btn" id="btn-levelup">Level Up!</button>`;
  }

  // Ability scores
  html += `<div class="stats-section"><div class="stats-section-title">Ability Scores</div>`;
  if (p.pendingAbilityPoints > 0) {
    html += `<div class="stats-pending">${p.pendingAbilityPoints} point${p.pendingAbilityPoints > 1 ? 's' : ''} to spend</div>`;
  }
  for (const [key, name] of Object.entries(ABILITY_NAMES)) {
    const score = p.abilities[key];
    const mod = abilityMod(score);
    const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
    html += `<div class="stats-row ability-row">`;
    html += `<span class="stats-label" title="${ABILITY_DESCS[key]}">${name}</span>`;
    html += `<span class="stats-value">${score} <span class="stats-mod">(${modStr})</span></span>`;
    if (p.pendingAbilityPoints > 0) {
      html += `<button class="btn-ability-up" data-ability="${key}">+</button>`;
    }
    html += `</div>`;
  }
  html += `</div>`;

  // Feats section
  html += `<div class="stats-section"><div class="stats-section-title">Feats</div>`;
  if (p.pendingFeats > 0) {
    html += `<div class="stats-feat-pending">${p.pendingFeats} feat${p.pendingFeats > 1 ? 's' : ''} to choose</div>`;
    html += renderFeatPicker(p);
  }
  html += renderFeatsList(p);
  html += `</div>`;

  // Saves
  html += `<div class="stats-section"><div class="stats-section-title">Saving Throws</div>`;
  html += `<div class="stats-row"><span class="stats-label">Fortitude</span><span class="stats-value">+${p.saves.fort}</span></div>`;
  html += `<div class="stats-row"><span class="stats-label">Reflex</span><span class="stats-value">+${p.saves.reflex}</span></div>`;
  html += `<div class="stats-row"><span class="stats-label">Will</span><span class="stats-value">+${p.saves.will}</span></div>`;
  html += `</div>`;

  // Play time
  const mins = Math.floor(game.meta.playTime / 60);
  const secs = Math.floor(game.meta.playTime % 60);
  html += `<div class="stats-section stats-meta">`;
  html += `<div class="stats-row"><span class="stats-label">Floor</span><span class="stats-value">${game.level} (deepest: ${game.meta.maxFloor})</span></div>`;
  html += `<div class="stats-row"><span class="stats-label">Kills</span><span class="stats-value">${game.meta.totalKills}</span></div>`;
  html += `<div class="stats-row"><span class="stats-label">Time</span><span class="stats-value">${mins}m ${secs}s</span></div>`;
  html += `</div>`;

  html += '</div>';
  container.innerHTML = html;

  // Wire up level-up button
  const levelBtn = container.querySelector('#btn-levelup');
  if (levelBtn) {
    levelBtn.addEventListener('click', () => {
      applyLevelUp(p);
      const equipStats = computeEquipmentStats(p.equipment);
      computeDerivedStats(p, equipStats);
      addMessage(`Level up! You are now level ${p.level}!`, 'info');
      refreshStatsUI();
    });
  }

  // Wire up ability point buttons
  container.querySelectorAll('.btn-ability-up').forEach(btn => {
    btn.addEventListener('click', () => {
      const ability = btn.dataset.ability;
      if (p.pendingAbilityPoints > 0) {
        const oldMaxHp = p.maxHp;
        p.abilities[ability]++;
        p.pendingAbilityPoints--;
        const equipStats = computeEquipmentStats(p.equipment);
        computeDerivedStats(p, equipStats);
        let msg = `${ABILITY_NAMES[ability]} increased to ${p.abilities[ability]}!`;
        if (ability === 'con' && p.maxHp !== oldMaxHp) {
          const hpDelta = p.maxHp - oldMaxHp;
          msg += ` Max HP ${hpDelta > 0 ? '+' : ''}${hpDelta} (now ${p.maxHp})`;
        }
        addMessage(msg, 'info');
        refreshStatsUI();
      }
    });
  });

  // Wire up feat selection buttons
  container.querySelectorAll('.btn-feat-select').forEach(btn => {
    btn.addEventListener('click', () => {
      const featId = btn.dataset.featId;
      if (p.pendingFeats > 0 && featId) {
        if (!p.feats) p.feats = [];
        p.feats.push(featId);
        p.pendingFeats--;

        // Apply feat bonuses if feat has an onSelect callback
        const feat = FEAT_REGISTRY ? FEAT_REGISTRY[featId] : null;
        if (feat && typeof feat.onSelect === 'function') {
          feat.onSelect(p);
        }

        const equipStats = computeEquipmentStats(p.equipment);
        computeDerivedStats(p, equipStats);
        addMessage(`Feat acquired: ${feat ? feat.name : featId}!`, 'info');
        refreshStatsUI();
      }
    });
  });
}
