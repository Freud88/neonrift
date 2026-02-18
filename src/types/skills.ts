export type SkillTreeId = 'drifter' | 'trader' | 'survivor';

export interface PlayerSkills {
  skillPoints: number;
  trees: Record<SkillTreeId, number>; // 0-10 per tree
}

export type SkillEffectType =
  | 'radar_range'         // enemies visible from farther
  | 'move_speed'          // +% movement speed
  | 'cache_glow'          // caches glow through walls
  | 'card_drop_rate'      // +% card drop from enemies
  | 'shard_drop_rate'     // +% key shard drop
  | 'minimap_range'       // extra minimap chunk radius
  | 'elite_aura'          // elite enemies have visible aura
  | 'decay_delay'         // decay stage 1 delayed N seconds
  | 'boss_extra_card'     // +N card drop from boss
  | 'terminal_bonus_heal' // repair terminals heal extra HP
  | 'shop_discount'       // -% shop prices
  | 'see_mod_tiers'       // see tier of mods in shop
  | 'pack_discount'       // -% pack prices
  | 'sell_bonus'          // +% sell price
  | 'currency_drop_rate'  // +% currency drop
  | 'craft_discount'      // crafting costs -N
  | 'tier_roll_bonus'     // +% chance T7+
  | 'extra_shop_card'     // vendor offers 1 extra rare card
  | 'bonus_hp'            // +N starting HP
  | 'extra_start_cards'   // +N starting hand cards
  | 'extra_data_cell'     // +N starting data cells
  | 'survive_chance'      // % chance to survive lethal at 1 HP
  | 'mulligan'            // can mulligan once per battle
  | 'flee'                // can flee non-boss battles
  | 'second_wind'         // once per rift: revive at N HP
  | 'decay_resist'        // decay degrades -N tiers less
  | 'extra_max_hp'        // +N max HP
  | 'corruption_delay';   // corruptions activate N seconds later

export interface SkillEffect {
  type: SkillEffectType;
  value: number;
}

export interface SkillDef {
  level: number; // 1-10 within tree
  name: string;
  description: string;
  effect: SkillEffect;
}
