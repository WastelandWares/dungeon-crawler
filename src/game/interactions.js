// ============================================================
//  INTERACTIONS — proximity-based NPC interaction system
// ============================================================
import { dist } from '../utils.js';
import { TILE } from './entities.js';

/**
 * Find the closest NPC/station within maxRange that the player is roughly facing.
 * Also checks for dungeon entrance tile proximity.
 * Returns { npc, distance } or null.
 */
export function getNearestInteractable(player, npcs, maxRange, map) {
  let closest = null;
  let closestDist = maxRange;

  const cos = Math.cos(player.angle);
  const sin = Math.sin(player.angle);

  // Check NPCs
  for (const npc of npcs) {
    const d = dist(player.x, player.y, npc.x, npc.y);
    if (d > maxRange || d >= closestDist) continue;

    // Check if player is roughly facing this NPC (within ~120 degree cone)
    const dx = npc.x - player.x;
    const dy = npc.y - player.y;
    const dot = (dx * cos + dy * sin) / d;
    if (dot < -0.25) continue; // behind the player

    closest = { npc, distance: d };
    closestDist = d;
  }

  // Check for dungeon entrance tile
  if (map) {
    const tx = Math.floor(player.x);
    const ty = Math.floor(player.y);
    // Check tiles in front of the player
    for (let r = 0; r <= 1; r++) {
      const checkX = Math.floor(player.x + cos * r);
      const checkY = Math.floor(player.y + sin * r);
      if (checkX >= 0 && checkX < map[0].length && checkY >= 0 && checkY < map.length) {
        if (map[checkY][checkX] === TILE.DUNGEON_ENTRANCE) {
          const ex = checkX + 0.5;
          const ey = checkY + 0.5;
          const ed = dist(player.x, player.y, ex, ey);
          if (ed < maxRange && ed < closestDist) {
            closest = {
              npc: {
                name: 'Dungeon Entrance',
                interactType: 'dungeon_entrance',
                icon: '\u{1F573}\u{FE0F}',
                x: ex, y: ey,
              },
              distance: ed,
            };
            closestDist = ed;
          }
        }
      }
    }
  }

  return closest;
}

/**
 * Returns a human-readable interaction prompt string.
 * On touch devices: "Tap to <action>"
 * On desktop: "[E] <action>"
 */
export function getInteractionPrompt(interactable, isTouch = false) {
  if (!interactable || !interactable.npc) return '';

  const npc = interactable.npc;
  const key = isTouch ? 'Tap' : '[E]';

  switch (npc.interactType) {
    case 'shop':
      return `${key} Talk to ${npc.name.split(' the ')[0] || npc.name}`;
    case 'quests':
      return `${key} ${npc.name}`;
    case 'stash':
      return `${key} Open ${npc.name}`;
    case 'dungeon_entrance':
      return `${key} Enter the Dungeon`;
    default:
      return `${key} Interact`;
  }
}
