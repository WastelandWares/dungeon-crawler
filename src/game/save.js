// ============================================================
//  SAVE / LOAD — localStorage persistence
// ============================================================

const SAVE_KEY = 'turtles-save';
const SAVE_VERSION = 1;

/**
 * Serialize and persist the game state.
 * We save player data and meta stats but NOT the dungeon
 * (it's procedurally generated and rebuilt on floor entry).
 */
export function saveGame(gameState) {
  const p = gameState.player;
  const data = {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    player: {
      level: p.level,
      abilities: { ...p.abilities },
      hp: p.hp,
      maxHp: p.maxHp,
      ac: p.ac,
      gold: p.gold,
      xp: p.xp,
      attackBonus: p.attackBonus,
      armorBonus: p.armorBonus,
      damageBonus: p.damageBonus,
      pendingAbilityPoints: p.pendingAbilityPoints,
      baseAttack: p.baseAttack,
      saves: { ...p.saves },
      _lastConMod: p._lastConMod,
      inventory: p.inventory,
      equipment: p.equipment,
    },
    meta: { ...gameState.meta },
    floor: gameState.level,
    keys: gameState.keys || 0,
    quests: gameState.quests
      ? { active: [...gameState.quests.active], available: [...gameState.quests.available] }
      : { active: [], available: [] },
  };

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('Save failed:', e);
    return false;
  }
}

/**
 * Load and validate a saved game. Returns the parsed data or null.
 */
export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!data || data.version !== SAVE_VERSION) return null;
    if (!data.player || !data.meta) return null;

    return data;
  } catch (e) {
    console.warn('Load failed:', e);
    return null;
  }
}

/** Returns true if a save exists in localStorage */
export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}

/** Delete the current save */
export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}

/** Export the raw save JSON string (for sharing / backup) */
export function exportSave() {
  return localStorage.getItem(SAVE_KEY);
}

/**
 * Import a save from a JSON string.
 * Validates structure and version before storing.
 * Returns true on success, false on failure.
 */
export function importSave(json) {
  try {
    const data = JSON.parse(json);
    if (!data || data.version !== SAVE_VERSION) return false;
    if (!data.player || !data.meta) return false;

    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('Import failed:', e);
    return false;
  }
}
