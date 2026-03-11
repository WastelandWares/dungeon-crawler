// ============================================================
//  COMBAT
// ============================================================
import { d20, roll, dist } from '../utils.js';
import { game } from './state.js';
import { GameAudio } from '../engine/audio.js';
import { addMessage } from '../ui/messages.js';
import { checkLevelUp, applyLevelUp } from '../systems/progression.js';
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

  const attackRoll = d20();
  showRollValue(attackRoll);

  if (attackRoll === 20 || attackRoll + p.attackBonus >= target.ac) {
    let dmg = roll(1, 8) + p.damageBonus; // longsword + STR mod
    if (dmg < 1) dmg = 1; // minimum 1 damage
    const isCrit = attackRoll === 20;
    if (isCrit) { dmg *= 2; addMessage(`CRITICAL HIT! (nat 20)`, 'combat'); }
    target.hp -= dmg;
    addMessage(`Hit ${target.name} for ${dmg} damage! (rolled ${attackRoll})`, 'combat');
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
    }
  } else {
    addMessage(`Missed ${target.name}. (rolled ${attackRoll} vs AC ${target.ac})`, 'combat');
    GameAudio.miss();
    showBorderFlash(attackRoll === 1 ? 'fumble' : 'miss');
    if (attackRoll === 1) triggerScreenShake(3); // fumble shake
  }
}
