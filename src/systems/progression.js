// ============================================================
//  PROGRESSION — D&D 3.5e-lite ability scores & leveling
// ============================================================
import { roll } from '../utils.js';

/** Standard 3.5e ability modifier: (score - 10) / 2, rounded down */
export function abilityMod(score) {
  return Math.floor((score - 10) / 2);
}

/** XP threshold to reach next level (cumulative) */
export function getXpForLevel(level) {
  return level * 100;
}

/** Returns true if the player has enough XP to level up */
export function checkLevelUp(player) {
  return player.xp >= getXpForLevel(player.level);
}

/** Apply a level-up: increment level, roll HP, grant ability point, recalc stats */
export function applyLevelUp(player) {
  player.level++;

  // +HP: roll(1,10) + conMod, minimum 1
  const conMod = abilityMod(player.abilities.con);
  const hpGain = Math.max(1, roll(1, 10) + conMod);
  player.maxHp += hpGain;
  player.hp += hpGain;

  // +1 pending ability point (player chooses where to spend)
  player.pendingAbilityPoints++;

  // +1 base attack bonus every 2 levels
  player.baseAttack = Math.floor(player.level / 2);

  // Recalculate derived stats
  computeDerivedStats(player);
}

/**
 * Recalculate all derived stats from ability scores + level + equipment.
 * Call after any ability change, equip change, or level-up.
 * @param {object} player - the player state object
 * @param {object} equipStats - bonuses from equipment { acBonus, attackBonus, damageBonus, speedBonus }
 */
export function computeDerivedStats(player, equipStats = {}) {
  const strMod = abilityMod(player.abilities.str);
  const dexMod = abilityMod(player.abilities.dex);
  const conMod = abilityMod(player.abilities.con);
  const wisMod = abilityMod(player.abilities.wis);

  // AC = 10 + dexMod + equipment AC bonus
  player.ac = 10 + dexMod + (equipStats.acBonus || 0);

  // Attack bonus = baseAttack + strMod + equipment attack bonus
  player.attackBonus = player.baseAttack + strMod + (equipStats.attackBonus || 0);

  // Damage bonus from STR + equipment
  player.damageBonus = strMod + (equipStats.damageBonus || 0);

  // Save bonuses
  player.saves = {
    fort: conMod,
    reflex: dexMod,
    will: wisMod,
  };
}

/**
 * Roll ability scores: 4d6 drop lowest, for each of 6 abilities.
 * Returns { str, dex, con, int, wis, cha }
 */
export function rollAbilityScores() {
  function roll4d6DropLowest() {
    const dice = [roll(1, 6), roll(1, 6), roll(1, 6), roll(1, 6)];
    dice.sort((a, b) => a - b);
    return dice[1] + dice[2] + dice[3]; // drop lowest
  }

  return {
    str: roll4d6DropLowest(),
    dex: roll4d6DropLowest(),
    con: roll4d6DropLowest(),
    int: roll4d6DropLowest(),
    wis: roll4d6DropLowest(),
    cha: roll4d6DropLowest(),
  };
}
