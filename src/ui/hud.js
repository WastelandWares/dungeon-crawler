// ============================================================
//  HUD
// ============================================================
import { game } from '../game/state.js';
import { getXpForLevel } from '../systems/progression.js';

export function updateHUD() {
  const p = game.player;

  document.getElementById('hud-hp').textContent = `${p.hp}/${p.maxHp}`;
  document.getElementById('hud-ac').textContent = p.ac;
  document.getElementById('hud-level').textContent = `Lv ${p.level}`;
  document.getElementById('hud-gold').textContent = p.gold;

  // XP bar
  const xpNeeded = getXpForLevel(p.level);
  const xpPrev = p.level > 1 ? getXpForLevel(p.level - 1) : 0;
  const xpInLevel = p.xp - xpPrev;
  const xpRange = xpNeeded - xpPrev;
  const pct = xpNeeded === Infinity ? 100 : Math.min(100, (xpInLevel / xpRange) * 100);

  const xpFill = document.getElementById('xp-fill');
  if (xpFill) xpFill.style.width = pct + '%';

  const xpLabel = document.getElementById('xp-label');
  if (xpLabel) xpLabel.textContent = xpNeeded === Infinity ? `XP: ${p.xp} (MAX)` : `XP: ${p.xp} / ${xpNeeded}`;

  // Key count
  const keyWrap = document.getElementById('hud-keys-wrap');
  const keyEl = document.getElementById('hud-keys');
  if (keyWrap && keyEl) {
    if (game.keys > 0) {
      keyWrap.style.display = '';
      keyEl.textContent = game.keys;
    } else {
      keyWrap.style.display = 'none';
    }
  }

  // Pending ability points indicator
  const apIndicator = document.getElementById('hud-ability-pts');
  if (apIndicator) {
    if (p.pendingAbilityPoints > 0) {
      apIndicator.style.display = 'block';
      apIndicator.textContent = `+${p.pendingAbilityPoints} Ability`;
    } else {
      apIndicator.style.display = 'none';
    }
  }

  // Pending feats indicator
  const featIndicator = document.getElementById('hud-feat-pts');
  if (featIndicator) {
    if (p.pendingFeats > 0) {
      featIndicator.style.display = 'block';
      featIndicator.textContent = `+${p.pendingFeats} Feat${p.pendingFeats > 1 ? 's' : ''}`;
    } else {
      featIndicator.style.display = 'none';
    }
  }
}
