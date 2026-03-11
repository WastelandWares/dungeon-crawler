// ============================================================
//  FEATS — D&D 3.5e-style feat registry & application
// ============================================================

/**
 * Each feat definition:
 *   id           - unique string key
 *   name         - display name
 *   description  - tooltip text
 *   prereqs      - { level, str, dex, con, wis, bab, feats[] }
 *   passive      - function(player) applies permanent stat bonuses
 *   combat       - true if feat has special combat logic (handled in combat.js)
 */
export const FEAT_REGISTRY = {
  toughness: {
    id: 'toughness',
    name: 'Toughness',
    description: '+3 hit points.',
    prereqs: {},
    passive(player) {
      player.maxHp += 3;
    },
  },

  great_fortitude: {
    id: 'great_fortitude',
    name: 'Great Fortitude',
    description: '+2 bonus on Fortitude saves.',
    prereqs: {},
    passive(player) {
      player.saves.fort += 2;
    },
  },

  iron_will: {
    id: 'iron_will',
    name: 'Iron Will',
    description: '+2 bonus on Will saves.',
    prereqs: {},
    passive(player) {
      player.saves.will += 2;
    },
  },

  lightning_reflexes: {
    id: 'lightning_reflexes',
    name: 'Lightning Reflexes',
    description: '+2 bonus on Reflex saves.',
    prereqs: {},
    passive(player) {
      player.saves.reflex += 2;
    },
  },

  weapon_focus: {
    id: 'weapon_focus',
    name: 'Weapon Focus',
    description: '+1 attack bonus with your weapon.',
    prereqs: { bab: 1 },
    passive(player) {
      player.attackBonus += 1;
    },
  },

  dodge: {
    id: 'dodge',
    name: 'Dodge',
    description: '+1 dodge bonus to AC.',
    prereqs: { dex: 13 },
    passive(player) {
      player.ac += 1;
    },
  },

  power_attack: {
    id: 'power_attack',
    name: 'Power Attack',
    description: 'Trade -1 attack for +2 damage (applied automatically).',
    prereqs: { str: 13, bab: 1 },
    passive(player) {
      player.attackBonus -= 1;
      player.damageBonus += 2;
    },
  },

  cleave: {
    id: 'cleave',
    name: 'Cleave',
    description: 'When you drop a foe, make a free attack on an adjacent enemy.',
    prereqs: { str: 13, feats: ['power_attack'] },
    combat: true,
    passive: null,
  },

  improved_critical: {
    id: 'improved_critical',
    name: 'Improved Critical',
    description: 'Critical threat range doubled (19-20).',
    prereqs: { bab: 8 },
    combat: true,
    passive: null,
  },

  improved_initiative: {
    id: 'improved_initiative',
    name: 'Improved Initiative',
    description: '+4 bonus on initiative checks. (Future use)',
    prereqs: {},
    passive: null, // placeholder for future initiative system
  },
};

/**
 * Check whether a player meets a feat's prerequisites.
 * @param {object} player
 * @param {object} feat - a FEAT_REGISTRY entry
 * @returns {boolean}
 */
function meetsPrereqs(player, feat) {
  const req = feat.prereqs;
  if (!req) return true;

  if (req.str && player.abilities.str < req.str) return false;
  if (req.dex && player.abilities.dex < req.dex) return false;
  if (req.con && player.abilities.con < req.con) return false;
  if (req.wis && player.abilities.wis < req.wis) return false;
  if (req.bab && player.baseAttack < req.bab) return false;
  if (req.level && player.level < req.level) return false;

  if (req.feats) {
    for (const fid of req.feats) {
      if (!hasFeat(player, fid)) return false;
    }
  }

  return true;
}

/**
 * Returns an array of feat definitions the player qualifies for
 * but does not yet possess.
 */
export function getAvailableFeats(player) {
  const available = [];
  for (const feat of Object.values(FEAT_REGISTRY)) {
    if (hasFeat(player, feat.id)) continue;
    if (meetsPrereqs(player, feat)) {
      available.push(feat);
    }
  }
  return available;
}

/**
 * Check if a player has a specific feat.
 */
export function hasFeat(player, featId) {
  return player.feats && player.feats.includes(featId);
}

/**
 * Apply all passive feat bonuses to a player.
 * Called during computeDerivedStats, AFTER base stats are calculated
 * so that feat bonuses stack on top.
 */
export function applyFeatEffects(player) {
  if (!player.feats) return;
  for (const featId of player.feats) {
    const feat = FEAT_REGISTRY[featId];
    if (feat && feat.passive) {
      feat.passive(player);
    }
  }
}
