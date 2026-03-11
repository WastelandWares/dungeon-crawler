// ============================================================
//  STATS UI — Character sheet panel
// ============================================================
import { game } from '../game/state.js';
import { abilityMod, getXpForLevel, applyLevelUp, checkLevelUp, computeDerivedStats } from '../systems/progression.js';
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

export function refreshStatsUI() {
  if (!container || !game || !game.player) return;
  const p = game.player;
  const xpNeeded = getXpForLevel(p.level);
  const canLevel = checkLevelUp(p);

  let html = '<div class="stats-grid">';

  // Level & XP
  html += `<div class="stats-section">`;
  html += `<div class="stats-row"><span class="stats-label">Level</span><span class="stats-value">${p.level}</span></div>`;
  html += `<div class="stats-row"><span class="stats-label">XP</span><span class="stats-value">${p.xp} / ${xpNeeded}</span></div>`;
  html += `<div class="stats-row"><span class="stats-label">HP</span><span class="stats-value">${p.hp} / ${p.maxHp}</span></div>`;
  html += `<div class="stats-row"><span class="stats-label">AC</span><span class="stats-value">${p.ac}</span></div>`;
  html += `<div class="stats-row"><span class="stats-label">Attack</span><span class="stats-value">+${p.attackBonus}</span></div>`;
  html += `<div class="stats-row"><span class="stats-label">Damage</span><span class="stats-value">+${p.damageBonus}</span></div>`;
  html += `<div class="stats-row"><span class="stats-label">Gold</span><span class="stats-value">${p.gold}</span></div>`;
  html += `</div>`;

  // Level up notice
  if (canLevel) {
    html += `<div class="stats-levelup">Ready to level up! Gain HP, +1 ability point, and stronger attacks.</div>`;
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
}
