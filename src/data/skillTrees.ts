import type { SkillTreeId, SkillDef } from '@/types/skills';

export const SKILL_TREES: Record<SkillTreeId, { name: string; icon: string; color: string; skills: SkillDef[] }> = {
  drifter: {
    name: 'DRIFTER',
    icon: '🗺',
    color: '#00f0ff',
    skills: [
      { level: 1, name: 'Radar Upgrade', description: 'Enemies visible from farther on minimap', effect: { type: 'radar_range', value: 1.5 } },
      { level: 2, name: 'Swift Feet', description: '+10% movement speed', effect: { type: 'move_speed', value: 0.10 } },
      { level: 3, name: 'Keen Eye', description: 'Caches glow through walls', effect: { type: 'cache_glow', value: 1 } },
      { level: 4, name: 'Scavenger', description: '+15% card drop from enemies', effect: { type: 'card_drop_rate', value: 0.15 } },
      { level: 5, name: 'Efficient Explorer', description: '+20% Key Shard drop rate', effect: { type: 'shard_drop_rate', value: 0.20 } },
      { level: 6, name: 'Cartographer', description: 'Minimap shows 2 extra chunks', effect: { type: 'minimap_range', value: 2 } },
      { level: 7, name: 'Danger Sense', description: 'Elite enemies have visible aura', effect: { type: 'elite_aura', value: 1 } },
      { level: 8, name: 'Rift Walker', description: 'Decay Stage 1 delayed 30s', effect: { type: 'decay_delay', value: 30 } },
      { level: 9, name: 'Treasure Hunter', description: '+1 card drop from bosses', effect: { type: 'boss_extra_card', value: 1 } },
      { level: 10, name: 'Master Explorer', description: 'Repair Terminals heal +3 extra HP', effect: { type: 'terminal_bonus_heal', value: 3 } },
    ],
  },
  trader: {
    name: 'TRADER',
    icon: '💰',
    color: '#ffe600',
    skills: [
      { level: 1, name: 'Haggler', description: 'Shop prices -10%', effect: { type: 'shop_discount', value: 0.10 } },
      { level: 2, name: 'Appraiser', description: 'See mod Tiers in shop', effect: { type: 'see_mod_tiers', value: 1 } },
      { level: 3, name: 'Bulk Buyer', description: 'Pack prices -20%', effect: { type: 'pack_discount', value: 0.20 } },
      { level: 4, name: 'Salvage Expert', description: 'Sell cards for +25% credits', effect: { type: 'sell_bonus', value: 0.25 } },
      { level: 5, name: 'Lucky Find', description: '+10% currency drop rate', effect: { type: 'currency_drop_rate', value: 0.10 } },
      { level: 6, name: 'Stash Organizer', description: 'Filter stash by mod combo', effect: { type: 'currency_drop_rate', value: 0 } },
      { level: 7, name: 'Efficient Crafter', description: 'Crafting costs -1 currency (min 1)', effect: { type: 'craft_discount', value: 1 } },
      { level: 8, name: 'Fortune', description: '+5% chance to roll T7+ mods', effect: { type: 'tier_roll_bonus', value: 0.05 } },
      { level: 9, name: 'Collector\'s Eye', description: 'Corrupted+ cards glow on map', effect: { type: 'cache_glow', value: 2 } },
      { level: 10, name: 'Master Trader', description: 'Vendor offers 1 extra rare card', effect: { type: 'extra_shop_card', value: 1 } },
    ],
  },
  survivor: {
    name: 'SURVIVOR',
    icon: '🛡',
    color: '#ff4444',
    skills: [
      { level: 1, name: 'Tough', description: 'Start battles with +1 HP (21)', effect: { type: 'bonus_hp', value: 1 } },
      { level: 2, name: 'Quick Draw', description: 'Start with 1 extra card in hand', effect: { type: 'extra_start_cards', value: 1 } },
      { level: 3, name: 'Energy Efficient', description: 'Start with +1 Data Cell', effect: { type: 'extra_data_cell', value: 1 } },
      { level: 4, name: 'Resilient', description: '10% chance to survive lethal at 1 HP', effect: { type: 'survive_chance', value: 0.10 } },
      { level: 5, name: 'Mulligan', description: 'Can mulligan once per battle', effect: { type: 'mulligan', value: 1 } },
      { level: 6, name: 'Tactical Retreat', description: 'Can flee non-boss battles', effect: { type: 'flee', value: 1 } },
      { level: 7, name: 'Second Wind', description: 'Once per rift: revive at 5 HP', effect: { type: 'second_wind', value: 5 } },
      { level: 8, name: 'Decay Resistant', description: 'Decay degrades -1 tier less', effect: { type: 'decay_resist', value: 1 } },
      { level: 9, name: 'Endurance', description: '+2 max HP (22)', effect: { type: 'extra_max_hp', value: 2 } },
      { level: 10, name: 'Master Survivor', description: 'Corruptions activate 15s later', effect: { type: 'corruption_delay', value: 15 } },
    ],
  },
};

export const TREE_IDS: SkillTreeId[] = ['drifter', 'trader', 'survivor'];
