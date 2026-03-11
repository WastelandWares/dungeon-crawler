// ============================================================
//  COMBAT
// ============================================================
import { d20, roll, dist } from '../utils.js';
import { game } from './state.js';
import { GameAudio } from '../engine/audio.js';
import { addMessage } from '../ui/messages.js';
import { checkLevelUp, applyLevelUp } from '../systems/progression.js';
import { hasFeat } from '../systems/feats.js';
import { checkQuestProgress } from '../systems/quests.js';
import { showDamageNumber, showBorderFlash, triggerScreenShake, showRollValue } from '../ui/combat-fx.js';

export function playerAttack() {
  const p = game.player;
  // Find closest monster in front of player within melee range
  let target = null, targetDist = 1.8;
  for (const m of game.monsters) {
    if (!m.alive) continue;
    const d = dist(p.x, p.y, m.x, m.y);
    if (d > targetDist) continue;
    // Check if roughly in front
    const ang = Math.atan2(m.y - p.y, m.x - p.x) - p.angle;
    const normAng = ((ang + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    if (Math.abs(normAng) < Math.PI / 3 && d < targetDist) {
      target = m;
      targetDist = d;
    }
  }
  if (!target) {
    addMessage('You swing at the air.', 'combat');
    GameAudio.miss();
    return;
  }

  resolveAttack(p, target);
}

/**
 * Resolve a single melee attack against a target monster.
 * Extracted so cleave can reuse it.
 * @param {object} p - player
 * @param {object} target - monster
 * @param {boolean} isCleave - true if this is a cleave follow-up attack
 */
function resolveAttack(p, target, isCleave = false) {
  const attackRoll = d20();
  if (!isCleave) showRollValue(attackRoll);

  // Improved Critical: crit on 19-20 instead of just 20
  const critThreshold = hasFeat(p, 'improved_critical') ? 19 : 20;
  const isCritThreat = attackRoll >= critThreshold;

  if (attackRoll === 20 || attackRoll + p.attackBonus >= target.ac) {
    let dmg = roll(1, 8) + p.damageBonus; // longsword + STR mod
    if (dmg < 1) dmg = 1; // minimum 1 damage
    const isCrit = isCritThreat;
    if (isCrit) { dmg *= 2; addMessage(`CRITICAL HIT! (rolled ${attackRoll})`, 'combat'); }
    target.hp -= dmg;
    const prefix = isCleave ? '[Cleave] ' : '';
    addMessage(`${prefix}Hit ${target.name} for ${dmg} damage! (rolled ${attackRoll})`, 'combat');
    GameAudio.hit();

    // Visual feedback
    showDamageNumber(dmg, isCrit);
    showBorderFlash(isCrit ? 'crit' : 'hit');
    if (isCrit) triggerScreenShake(5);
    if (target.hp <= 0) {
      target.alive = false;
      p.xp += target.xp;
      game.meta.totalKills++;
      addMessage(`${target.name} slain! +${target.xp} XP`, 'loot');

      // Track kill quests
      if (game.quests) {
        for (const q of game.quests.active) {
          if (checkQuestProgress(q, { type: 'kill', monsterName: target.name })) {
            if (q.status === 'complete') {
              addMessage(`Quest complete: ${q.title}! Return to the bounty board to claim your reward.`, 'loot');
            } else {
              addMessage(`Quest progress: ${q.title} [${q.progress}/${q.count}]`, 'info');
            }
          }
        }
      }

      // Check for level up (may level multiple times from big XP gains)
      while (checkLevelUp(p)) {
        applyLevelUp(p);
        addMessage(`LEVEL UP! You are now level ${p.level}!`, 'info');
        GameAudio.pickup(); // reuse pickup sound for level-up fanfare
      }

      // Cleave: free attack on an adjacent monster when you drop a foe
      if (!isCleave && hasFeat(p, 'cleave')) {
        let cleaveTarget = null;
        let closestDist = 2.0; // melee range for cleave
        for (const m of game.monsters) {
          if (!m.alive || m === target) continue;
          const d = dist(p.x, p.y, m.x, m.y);
          if (d < closestDist) {
            cleaveTarget = m;
            closestDist = d;
          }
        }
        if (cleaveTarget) {
          addMessage('Cleave! You strike at a nearby foe!', 'combat');
          resolveAttack(p, cleaveTarget, true);
        }
      }
    }
  } else {
    addMessage(`Missed ${target.name}. (rolled ${attackRoll} vs AC ${target.ac})`, 'combat');
    GameAudio.miss();
    showBorderFlash(attackRoll === 1 ? 'fumble' : 'miss');
    if (attackRoll === 1) triggerScreenShake(3); // fumble shake
  }
}
