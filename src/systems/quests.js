// ============================================================
//  QUEST / BOUNTY SYSTEM
// ============================================================
import { roll } from '../utils.js';

// Quest types
const QUEST_GENERATORS = {
  kill: {
    generate(playerLevel) {
      // "Slay N <monster_type>" — N scales with level
      const targets = ['Skeleton', 'Goblin', 'Dire Rat', 'Zombie', 'Ogre'];
      const target = targets[Math.floor(Math.random() * targets.length)];
      const count = Math.max(2, roll(1, 3) + Math.floor(playerLevel / 2));
      const reward = count * 15 + playerLevel * 10;
      const xpReward = count * 20 + playerLevel * 15;
      return {
        type: 'kill', title: `Slay ${count} ${target}s`,
        description: `The guild needs ${count} ${target}s eliminated.`,
        target, count, progress: 0,
        goldReward: reward, xpReward,
        difficulty: Math.ceil(count / 3),
      };
    },
  },
  floor: {
    generate(playerLevel) {
      // "Reach floor N"
      const floor = playerLevel + roll(1, 3);
      const reward = floor * 25;
      const xpReward = floor * 30;
      return {
        type: 'floor', title: `Reach Dungeon Floor ${floor}`,
        description: `Prove your worth by descending to floor ${floor}.`,
        targetFloor: floor, progress: 0,
        goldReward: reward, xpReward,
        difficulty: Math.ceil(floor / 3),
      };
    },
  },
  survive: {
    generate(playerLevel) {
      // "Survive N consecutive floors"
      const floors = Math.max(2, roll(1, 3) + Math.floor(playerLevel / 3));
      const reward = floors * 30;
      const xpReward = floors * 35;
      return {
        type: 'survive', title: `Survive ${floors} Floors`,
        description: `Descend ${floors} floors without returning to town.`,
        targetFloors: floors, progress: 0,
        goldReward: reward, xpReward,
        difficulty: Math.ceil(floors / 2),
      };
    },
  },
};

export function generateBounties(playerLevel, count = 3) {
  // Generate `count` unique quests of different types
  const types = Object.keys(QUEST_GENERATORS);
  const quests = [];
  const usedTypes = new Set();
  for (let i = 0; i < count && i < types.length; i++) {
    let type;
    do { type = types[Math.floor(Math.random() * types.length)]; }
    while (usedTypes.has(type));
    usedTypes.add(type);
    quests.push({ id: Date.now() + i, ...QUEST_GENERATORS[type].generate(playerLevel), status: 'available' });
  }
  return quests;
}

export function checkQuestProgress(quest, event) {
  // event: { type: 'kill', monsterName: '...' } or { type: 'floor_reached', floor: N }
  // Returns true if progress was made
  if (quest.status !== 'active') return false;

  if (quest.type === 'kill' && event.type === 'kill' && event.monsterName === quest.target) {
    quest.progress++;
    if (quest.progress >= quest.count) quest.status = 'complete';
    return true;
  }
  if (quest.type === 'floor' && event.type === 'floor_reached') {
    quest.progress = Math.max(quest.progress, event.floor);
    if (quest.progress >= quest.targetFloor) quest.status = 'complete';
    return true;
  }
  if (quest.type === 'survive' && event.type === 'floor_descended') {
    quest.progress++;
    if (quest.progress >= quest.targetFloors) quest.status = 'complete';
    return true;
  }
  return false;
}

export function completeQuest(quest, player) {
  // Award rewards
  player.gold += quest.goldReward;
  player.xp += quest.xpReward;
  quest.status = 'claimed';
  return { gold: quest.goldReward, xp: quest.xpReward };
}
