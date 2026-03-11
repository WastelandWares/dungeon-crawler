// ============================================================
//  PROGRESSION — D&D 3.5e Fighter class leveling
// ============================================================
import { roll } from '../utils.js';
import { applyFeatEffects } from './feats.js';

/** Standard 3.5e ability modifier: (score - 10) / 2, rounded down */
export function abilityMod(score) {
  return Math.floor((score - 10) / 2);
}

/** D&D 3.5e cumulative XP thresholds (levels 2-20) */
const XP_TABLE = [
  0,        // level 1 (index 0, not used for threshold)
  1000,     // level 2
  3000,     // level 3
  6000,     // level 4
  10000,    // level 5
  15000,    // level 6
  21000,    // level 7
  28000,    // level 8
  36000,    // level 9
  45000,    // level 10
  55000,    // level 11
  66000,    // level 12
  78000,    // level 13
  91000,    // level 14
  105000,   // level 15
  120000,   // level 16
  136000,   // level 17
  153000,   // level 18
  171000,   // level 19
  190000,   // level 20
];

/** XP threshold to reach the next level (cumulative). Level 20 is max. */
export function getXpForLevel(level) {
  if (level >= 20) return Infinity; // max level
  return XP_TABLE[level]; // XP_TABLE[level] = XP needed to reach level+1
}

/** Returns true if the player has enough XP to level up */
export function checkLevelUp(player) {
  if (player.level >= 20) return false;
  return player.xp >= getXpForLevel(player.level);
}

/**
 * Levels where the player gains a feat choice.
 * Combines standard feats (1, 3, 6, 9, 12, 15, 18) with
 * Fighter bonus feats (1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20).
 * Merged and deduplicated: 1,2,3,4,6,8,9,10,12,14,15,16,18,20
 */
const FEAT_LEVELS = [1, 2, 3, 4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20];

/** Returns the array of levels at which feats are gained */
export function getFeatLevels() {
  return FEAT_LEVELS;
}

/** Returns true if the given level grants an ability score increase */
export function isAbilityScoreLevel(level) {
  return level > 0 && level % 4 === 0;
}

/**
 * Fighter base save bonuses by level.
 * Fort is a "good" save; Reflex and Will are "poor" saves.
 */
function getBaseSaves(level) {
  return {
    fort: Math.floor(level / 2) + 2,
    reflex: Math.floor((level - 1) / 3),
    will: Math.floor((level - 1) / 3),
  };
}

/** Apply a level-up: increment level, roll HP, update BAB/saves, grant feat/ability points */
export function applyLevelUp(player) {
  player.level++;

  // +HP: roll(1,10) + conMod, minimum 1
  const conMod = abilityMod(player.abilities.con);
  const hpGain = Math.max(1, roll(1, 10) + conMod);
  player.maxHp += hpGain;
  player.hp += hpGain;

  // Fighter BAB = level (full BAB progression)
  player.baseAttack = player.level;

  // Base saves from Fighter class table
  const baseSaves = getBaseSaves(player.level);
  player.baseSaves = baseSaves;

  // Ability score increase at levels 4, 8, 12, 16, 20
  if (isAbilityScoreLevel(player.level)) {
    player.pendingAbilityPoints++;
  }

  // Feat at designated levels
  if (FEAT_LEVELS.includes(player.level)) {
    player.pendingFeats = (player.pendingFeats || 0) + 1;
  }

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

  // Fighter BAB = level (ensure it's set even if called outside applyLevelUp)
  player.baseAttack = player.level;

  // Attack bonus = baseAttack + strMod + equipment attack bonus
  player.attackBonus = player.baseAttack + strMod + (equipStats.attackBonus || 0);

  // Damage bonus from STR + equipment
  player.damageBonus = strMod + (equipStats.damageBonus || 0);

  // HP: CON modifier applies retroactively to all levels (D&D 3.5e rule).
  const prevConMod = player._lastConMod ?? conMod;
  if (conMod !== prevConMod) {
    const hpDelta = (conMod - prevConMod) * player.level;
    player.maxHp = Math.max(1, player.maxHp + hpDelta);
    player.hp = Math.max(1, Math.min(player.hp + hpDelta, player.maxHp));
  }
  player._lastConMod = conMod;

  // Base saves from Fighter class table + ability modifiers
  const baseSaves = player.baseSaves || getBaseSaves(player.level);
  player.saves = {
    fort: baseSaves.fort + conMod,
    reflex: baseSaves.reflex + dexMod,
    will: baseSaves.will + wisMod,
  };

  // Apply passive feat bonuses (stacks on top of base stats)
  applyFeatEffects(player);
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
