---
# ============================================================
#  CONTENT TEMPLATE — Reference for all frontmatter fields
#  Copy this file and fill in the fields for your content type.
#  Lines starting with # inside frontmatter are comments.
# ============================================================

# ------ COMMON FIELDS (all content types) ------
name: Display Name
# icon: emoji or character used for rendering
icon: 🔮
# tier: difficulty/quality tier (integer, 1 = basic)
tier: 1
# tags: list of categorical tags for filtering
tags: [example, melee]

# ------ MONSTER FIELDS ------
# hp: base hit points (integer)
hp: 10
# ac: armor class / defense rating (integer)
ac: 12
# attack: base attack bonus (integer)
attack: 3
# damage: dice roll as [count, sides], e.g. [1, 6] = 1d6
damage: [1, 6]
# xp: experience points awarded on kill (integer)
xp: 50
# speed: movement speed multiplier (float, 1.0 = normal)
speed: 1.0
# aggroRange: distance in tiles at which monster detects the player (integer)
aggroRange: 5
# minFloor: earliest dungeon floor this monster can appear on (integer, default 1)
minFloor: 1
# maxFloor: deepest dungeon floor this monster can appear on (integer, default 99)
maxFloor: 99

# ------ ITEM FIELDS ------
# shape: inventory grid size as "WxH", e.g. "1x1", "2x1", "2x2"
shape: 1x1
# category: one of weapon, armor, shield, helmet, boots, ring, consumable
category: weapon
# slot: equipment slot — weapon, chest, offhand, head, boots, ring1
slot: weapon
# basePrice: gold value for buying/selling (integer)
basePrice: 10
# attackBonus: bonus added to player attack rolls when equipped (integer)
attackBonus: 0
# acBonus: bonus added to player armor class when equipped (integer)
acBonus: 0
# speedBonus: bonus added to player movement speed when equipped (float)
speedBonus: 0
# stackable: whether this item can stack in inventory (boolean)
stackable: false
# maxStack: maximum stack size if stackable (integer)
maxStack: 1
# healAmount: dice roll for healing as [count, sides] (consumables only)
healAmount: [1, 8]
# effect: special effect identifier string (consumables only)
effect: none

# ------ QUEST FIELDS ------
# objective: short description of the quest goal
objective: Defeat 5 skeletons
# targetType: entity type this quest tracks (monster id or item id)
targetType: skeleton
# targetCount: how many of targetType must be completed (integer)
targetCount: 5
# rewardXp: experience points awarded on quest completion (integer)
rewardXp: 100
# rewardGold: gold awarded on quest completion (integer)
rewardGold: 50
# rewardItem: item id granted on quest completion (optional)
rewardItem: longsword
---

This is the body section. Write flavor text, lore, or extended descriptions here.
The body supports full markdown formatting and will be available as the
`description` field in the registry.

Content authors: copy this template, remove the fields you don't need for your
content type, and fill in the values. The frontmatter parser handles strings,
numbers, booleans, and arrays automatically.
