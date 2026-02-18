import type { Card, CardInPlay } from '@/types/card';
import type { CraftingItemId } from '@/types/game';
import { generateModdedCard, modCountForDifficulty } from '@/utils/cardMods';
import { ENEMIES } from '@/data/enemies';
import { rollCraftingDrop } from '@/data/craftingItems';
import { MOD_MAP } from '@/data/mods';
import { pickDecayMod } from '@/data/decayMods';
import { CORRUPTION_MAP } from '@/data/riftCorruptions';

// ── Mod special helpers (10-tier system: reads specialValue directly) ─────────

/** Returns the specialValue for the first mod matching the given special name. */
function getSpecialValue(card: CardInPlay, specialName: string): number {
  for (const applied of card.card.mods?.mods ?? []) {
    const mod = MOD_MAP[applied.modId];
    const effect = mod?.tiers[applied.tier];
    if (effect?.special === specialName) return effect.specialValue ?? 0;
  }
  return 0;
}

/** Returns both specialValue and specialValue2 for a mod. */
function getSpecialValues(card: CardInPlay, specialName: string): { v1: number; v2: number } {
  for (const applied of card.card.mods?.mods ?? []) {
    const mod = MOD_MAP[applied.modId];
    const effect = mod?.tiers[applied.tier];
    if (effect?.special === specialName) {
      return { v1: effect.specialValue ?? 0, v2: effect.specialValue2 ?? 0 };
    }
  }
  return { v1: 0, v2: 0 };
}

/** Returns true if card has any mod with the given special name. */
function hasSpecial(card: CardInPlay, specialName: string): boolean {
  return card.card.mods?.mods.some((m) => {
    const mod = MOD_MAP[m.modId];
    return mod?.tiers[m.tier]?.special === specialName;
  }) ?? false;
}

// Convenience aliases for readability
const getDrainPercent = (card: CardInPlay) => getSpecialValue(card, 'drain');
const getCorrodeValues = (card: CardInPlay) => getSpecialValues(card, 'corrode');
const getDetonateValue = (card: CardInPlay) => getSpecialValue(card, 'detonate');
const getDetonatePlayerDmg = (card: CardInPlay) => getSpecialValues(card, 'detonate').v2;
const getRecurseChance = (card: CardInPlay) => getSpecialValue(card, 'recurse') / 100;
const getShieldValue = (card: CardInPlay) => getSpecialValue(card, 'shield');
const getSiphonValue = (card: CardInPlay) => getSpecialValue(card, 'siphon');
const getDisruptValue = (card: CardInPlay) => getSpecialValue(card, 'shieldbypass') / 100;
const getBreachValue = (card: CardInPlay) => getSpecialValue(card, 'truedmg');

// ── Helpers ───────────────────────────────────────────────────────────────────

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let _instanceCounter = 0;
export function makeInstance(card: Card): CardInPlay {
  return {
    card,
    instanceId: `${card.id}_${++_instanceCounter}`,
    currentAttack: card.attack ?? 0,
    currentDefense: card.defense ?? 0,
    tapped: false,
    stealthTurns: 0,
    summonedThisTurn: true,
    buffs: [],
    turnsOnField: 0,
  };
}

// ── New mod special decoders ──────────────────────────────────────────────────

/** Decode a 2-digit signed int from corroded/unstable specialValue2:
 *  e.g. 21 → {atk:2, def:1}, -11 → {atk:-1, def:-1}, -1 → {atk:0, def:-1}
 *  Special: single negative small numbers (-1, -10) map to DEF only or ATK only.
 */
function decodeStatPair(v: number): { atk: number; def: number } {
  if (v === 0) return { atk: 0, def: 0 };
  const sign = v < 0 ? -1 : 1;
  const abs = Math.abs(v);
  const atk = Math.floor(abs / 10);
  const def = abs % 10;
  return { atk: sign * atk, def: sign * def };
}

// ── State types ───────────────────────────────────────────────────────────────

export type BattlePhase =
  | 'not_started'
  | 'mulligan'
  | 'player_turn'
  | 'enemy_turn'
  | 'battle_end';

export type TurnPhase = 'draw' | 'main' | 'attack' | 'block' | 'end';

export interface CombatantState {
  health: number;
  maxHealth: number;
  maxDataCells: number;
  currentDataCells: number;
  hand: CardInPlay[];
  field: CardInPlay[];        // Agents + Malware
  traps: CardInPlay[];        // face-down traps
  deck: Card[];
  discard: Card[];
  fatigue: number;            // damage per draw when deck is empty
}

export interface BattleState {
  phase: BattlePhase;
  turnPhase: TurnPhase;
  turnNumber: number;
  player: CombatantState;
  enemy: CombatantState;
  enemyProfileId: string;
  attackers: string[];          // instanceIds attacking
  blockers: Record<string, string>; // attackerId → blockerId
  pendingAttacks: { attacker: CardInPlay; blocker: CardInPlay | null }[];
  result: 'pending' | 'win' | 'lose';
  log: string[];                // combat log for debug
  /** Forked mod: second launch awaiting player target selection */
  pendingFork: { dmg: number; sourceCard: CardInPlay } | null;
  /** Decay mod events: shown as toasts in battle UI, cleared after each consume */
  decayEvents: string[];
}

// ── BattleEngine ──────────────────────────────────────────────────────────────

export class BattleEngine {
  private state: BattleState;
  private decayStage: number;
  private activeCorruptions: string[];

  constructor(
    playerDeck: Card[],
    enemyDeck: Card[],
    enemyProfileId: string,
    enemyHealth = 20,
    decayStage = 0,
    activeCorruptions: string[] = [],
  ) {
    this.decayStage = decayStage;
    this.activeCorruptions = activeCorruptions;

    const playerShuffled = shuffle(playerDeck);
    const enemyShuffled  = shuffle(enemyDeck);

    const mkCombatant = (deck: Card[], health: number): CombatantState => ({
      health,
      maxHealth: health,
      maxDataCells: 1,
      currentDataCells: 1,
      hand: [],
      field: [],
      traps: [],
      deck,
      discard: [],
      fatigue: 0,
    });

    this.state = {
      phase: 'mulligan',
      turnPhase: 'draw',
      turnNumber: 0,
      player: mkCombatant(playerShuffled, 20),
      enemy: mkCombatant(enemyShuffled, enemyHealth),
      enemyProfileId,
      attackers: [],
      blockers: {},
      pendingAttacks: [],
      result: 'pending',
      log: [],
      pendingFork: null,
      decayEvents: [],
    };

    // ── Apply corruption: junk injection ────────────────────────────────────
    let totalJunk = 0;
    for (const cid of activeCorruptions) {
      const c = CORRUPTION_MAP[cid];
      if (c?.effect.type === 'junk_inject') totalJunk += c.effect.value;
    }
    if (totalJunk > 0) {
      const junkCard: Card = {
        id: 'junk_data',
        name: 'Junk Data',
        description: 'Corrupted data. Cannot be played.',
        cost: 99,
        type: 'script',
        energy: 'neutral',
        rarity: 'common',
        effect: { type: 'damage', target: 'any', value: 0, description: 'No effect' },
      };
      for (let j = 0; j < totalJunk; j++) {
        const insertAt = Math.floor(Math.random() * (this.state.player.deck.length + 1));
        this.state.player.deck.splice(insertAt, 0, junkCard);
      }
      this._log(`Corruption: ${totalJunk} Junk Data injected into deck`);
    }

    // ── Apply corruption: cost increase ─────────────────────────────────────
    let totalCostIncrease = 0;
    for (const cid of activeCorruptions) {
      const c = CORRUPTION_MAP[cid];
      if (c?.effect.type === 'cost_increase') totalCostIncrease += c.effect.value;
    }
    if (totalCostIncrease > 0) {
      // Apply to all player deck cards
      this.state.player.deck = this.state.player.deck.map((card) => ({
        ...card,
        cost: Math.min(10, card.cost + totalCostIncrease),
      }));
    }

    // ── Draw opening hands ───────────────────────────────────────────────────
    // Starting hand reduce
    let handReduce = 0;
    for (const cid of activeCorruptions) {
      const c = CORRUPTION_MAP[cid];
      if (c?.effect.type === 'starting_hand_reduce') handReduce += c.effect.value;
    }
    const openingHandSize = Math.max(1, 4 - handReduce);
    this._drawCards(this.state.player, openingHandSize);
    this._drawCards(this.state.enemy, 4);
  }

  /** Returns total corruption effect value for a given type. */
  private _corruptionTotal(type: string): number {
    return this.activeCorruptions.reduce((sum, cid) => {
      const c = CORRUPTION_MAP[cid];
      return c?.effect.type === type ? sum + c.effect.value : sum;
    }, 0);
  }

  /** Returns true if any active corruption matches the given type. */
  private _hasCorruption(type: string): boolean {
    return this.activeCorruptions.some((cid) => CORRUPTION_MAP[cid]?.effect.type === type);
  }

  getState(): BattleState { return this.state; }

  /** Resolve the pending Forked second launch on the chosen target. */
  resolveFork(targetInstanceId: string): void {
    const fork = this.state.pendingFork;
    if (!fork) return;
    this.state.pendingFork = null;
    const opponent = this.state.enemy;
    const owner    = this.state.player;
    const { dmg, sourceCard } = fork;
    const drainPct = getDrainPercent(sourceCard);
    let dealt = 0;
    if (targetInstanceId === 'enemy_player') {
      this._dealScriptDamageToPlayer(sourceCard, opponent, dmg);
      dealt = dmg;
    } else {
      const t = opponent.field.find((c) => c.instanceId === targetInstanceId);
      if (t) {
        this._dealDamageToAgent(t, opponent, dmg);
        dealt = dmg;
        this._log(`Forked hit: ${t.card.name} takes ${dmg} damage`);
      }
    }
    if (drainPct > 0 && dealt > 0) {
      const healed = Math.ceil(dealt * drainPct / 100);
      owner.health = Math.min(owner.maxHealth, owner.health + healed);
    }
    this._checkWinCondition();
  }

  // ── Mulligan ────────────────────────────────────────────────────────────────

  doMulligan() {
    // Return hand to deck, shuffle, redraw 4
    const p = this.state.player;
    p.deck = shuffle([...p.deck, ...p.hand.map((c) => c.card)]);
    p.hand = [];
    this._drawCards(p, 4);
    this._log('Player mulliganed.');
  }

  acceptHand() {
    this.state.phase = 'player_turn';
    this._startTurn(this.state.player);
  }

  // ── Turn lifecycle ──────────────────────────────────────────────────────────

  private _startTurn(combatant: CombatantState) {
    combatant.maxDataCells = Math.min(10, combatant.maxDataCells + 1);
    const isPlayerTurn = combatant === this.state.player;
    // Cell Drain corruption: player gets fewer data cells
    if (isPlayerTurn) {
      const cellReduce = this._corruptionTotal('cell_reduce');
      combatant.currentDataCells = Math.max(0, combatant.maxDataCells - cellReduce);
    } else {
      combatant.currentDataCells = combatant.maxDataCells;
    }

    // Regen keyword
    for (const c of combatant.field) {
      const regen = c.card.keywords?.find((k) => k.keyword === 'regen');
      if (regen && regen.value) {
        c.currentDefense = Math.min(
          c.card.defense ?? 0,
          c.currentDefense + regen.value
        );
      }
    }

    // Untap all agents (un-tapped = can attack this turn if not summoned this turn)
    for (const c of combatant.field) {
      c.tapped = false;
      // Stealth countdown
      if (c.stealthTurns > 0) c.stealthTurns--;
      // Clear T10 Sluggish immunity after first turn
      if (c.sluggishImmune) c.sluggishImmune = false;
      // Sluggish countdown
      if (c.sluggishTurns !== undefined && c.sluggishTurns > 0) c.sluggishTurns--;
    }

    // Mark all as NOT summoned this turn (so they can attack if they have overclock)
    for (const c of combatant.field) {
      c.summonedThisTurn = false;
      // Increment turnsOnField for Overheating etc.
      if (c.turnsOnField !== undefined) c.turnsOnField++;
    }

    // ── Per-turn mod effects ────────────────────────────────────────────────────
    const isPlayer = combatant === this.state.player;
    const ally = combatant;
    const turnNum = this.state.turnNumber;

    for (const c of [...combatant.field]) {
      if (c.card.type !== 'agent') continue;

      // Leaking: lose HP per turn (positive = lose, negative = regen)
      const leakVal = getSpecialValue(c, 'leaking');
      if (leakVal !== 0) {
        if (leakVal > 0) {
          // Damage the agent
          c.currentDefense -= leakVal;
          if (isPlayer) this._log(`${c.card.name} leaks ${leakVal} HP (${c.currentDefense} DEF left)`);
          if (c.currentDefense <= 0) {
            this._dealDamageToAgent(c, combatant, 0); // trigger destruction logic
            continue;
          }
        } else {
          // Regen (negative = gain back HP)
          const regenAmt = -leakVal;
          c.currentDefense = Math.min((c.card.defense ?? 0) + (c.buffs.reduce((s, b) => s + b.defense, 0)), c.currentDefense + regenAmt);
          if (isPlayer) this._log(`${c.card.name} regens ${regenAmt} HP (${c.currentDefense} DEF)`);
          // T10 Life Siphon: all allies +1 ATK (bonus already baked into atkBonus in stats, but add as aura effect here)
          // Note: atkBonus from the mod itself is already applied at card generation — this is correct.
        }
      }

      // Corroded: gain/lose ATK/DEF per turn
      const corrodedVal = getSpecialValue(c, 'corroded');
      if (corrodedVal !== 0) {
        if (corrodedVal === 5) {
          // +1 ATK every 2 turns
          const playedOn = c.playedOnTurn ?? 0;
          const turnsSincePlay = turnNum - playedOn;
          if (turnsSincePlay > 0 && turnsSincePlay % 2 === 0) {
            c.currentAttack += 1;
            if (isPlayer) this._log(`${c.card.name} grows: +1 ATK (Corroded T6)`);
          }
        } else if (corrodedVal === -1) {
          // -1 DEF per turn (min 1)
          c.currentDefense = Math.max(1, c.currentDefense - 1);
          if (isPlayer) this._log(`${c.card.name} corrodes: -1 DEF`);
        } else if (corrodedVal === -10) {
          // -1 ATK per turn (min 0)
          c.currentAttack = Math.max(0, c.currentAttack - 1);
          if (isPlayer) this._log(`${c.card.name} corrodes: -1 ATK`);
        } else {
          // Encoded pair (positive = gain, negative = lose)
          const pair = decodeStatPair(corrodedVal);
          if (pair.atk !== 0) c.currentAttack = Math.max(0, c.currentAttack + pair.atk);
          if (pair.def !== 0) c.currentDefense = Math.max(0, c.currentDefense + pair.def);
          if (isPlayer && (pair.atk !== 0 || pair.def !== 0)) {
            const atkStr = pair.atk !== 0 ? `${pair.atk > 0 ? '+' : ''}${pair.atk} ATK` : '';
            const defStr = pair.def !== 0 ? `${pair.def > 0 ? '+' : ''}${pair.def} DEF` : '';
            this._log(`${c.card.name} adapts: ${[atkStr, defStr].filter(Boolean).join(', ')}`);
          }
        }
      }

      // Unstable: end-of-turn self-destruct chance + grow on survive
      const unstableVal = getSpecialValue(c, 'unstable');
      const unstableGain = getSpecialValues(c, 'unstable').v2; // specialValue2
      if (unstableVal > 0 && Math.random() * 100 < unstableVal) {
        if (isPlayer) this._log(`${c.card.name} self-destructs! (Unstable ${unstableVal}%)`);
        this._dealDamageToAgent(c, combatant, c.currentDefense + 1);
        continue;
      } else if (unstableGain > 0 && c.currentDefense > 0) {
        // Card survived — apply growth
        const gain = decodeStatPair(unstableGain);
        if (gain.atk > 0) c.currentAttack += gain.atk;
        if (gain.def > 0) c.currentDefense += gain.def;
        if (isPlayer && (gain.atk > 0 || gain.def > 0)) {
          const label = unstableVal > 0 ? 'survives' : 'grows';
          this._log(`${c.card.name} ${label}: ${gain.atk > 0 ? `+${gain.atk} ATK ` : ''}${gain.def > 0 ? `+${gain.def} DEF` : ''}`);
        }
      }

      // Overheating: +ATK first turn, -ATK from second turn onward
      const ohVals = getSpecialValues(c, 'overheating');
      if (ohVals.v1 > 0 && c.turnsOnField !== undefined) {
        if (c.turnsOnField === 1) {
          // Second turn: remove first-turn bonus and apply penalty
          c.currentAttack -= ohVals.v1; // undo bonus
          if (ohVals.v2 > 0) {
            c.currentAttack = Math.max(0, c.currentAttack - ohVals.v2);
          }
          if (isPlayer) this._log(`${c.card.name} overheats: -${ohVals.v1 + ohVals.v2} ATK`);
        }
      }
    }

    // Leaking T10: ally buff (already handled by atkBonus in cardMods at generation)
    // But if the leaking field card has specialValue === -2, buff other allies' ATK by 1
    for (const c of combatant.field) {
      if (c.card.type === 'agent' && getSpecialValue(c, 'leaking') === -2) {
        for (const ally2 of combatant.field) {
          if (ally2 !== c && ally2.card.type === 'agent') {
            ally2.currentAttack += 1;
          }
        }
        if (isPlayer) this._log(`${c.card.name} Life Siphon: all allies +1 ATK`);
        break; // Only one Life Siphon aura per turn
      }
    }
    void ally; // suppress unused warning

    // Memory Leak: cost changes per turn in hand
    for (const hCard of combatant.hand) {
      if (hCard.turnsInHand === undefined) hCard.turnsInHand = 0;
      hCard.turnsInHand++;

      const mlVal = getSpecialValue(hCard, 'memleak');
      if (mlVal === 0) continue;

      let shouldChange = false;
      if (mlVal === 1 || mlVal === -1) {
        // Every turn
        shouldChange = true;
      } else if (mlVal === 2 || mlVal === 3 || mlVal === -3) {
        // Every 2 turns
        shouldChange = hCard.turnsInHand % 2 === 0;
      } else if (mlVal === 4 || mlVal === -4) {
        // Every 3 turns
        shouldChange = hCard.turnsInHand % 3 === 0;
      }

      if (shouldChange) {
        const delta = mlVal > 0 ? 1 : -1;
        const currentCost = hCard.card.cost;
        const newCost = Math.max(0, currentCost + delta);
        (hCard.card as { cost: number }).cost = newCost;

        // Memory Compression (specialValue2=2): if cost reaches 0, card will be played twice
        // Just log for now — the "play twice" mechanic is handled in playCard
        const mlBonus = getSpecialValues(hCard, 'memleak').v2;
        if (mlBonus === 1 && newCost === 0) {
          // +2 ATK bonus applied directly
          hCard.currentAttack += 2;
        }
      }
    }

    // Shield Drain corruption: reduce player shield (agent DEF) at turn start
    if (isPlayerTurn && combatant === this.state.player) {
      const shieldDrain = this._corruptionTotal('shield_drain');
      if (shieldDrain > 0) {
        for (const c of combatant.field) {
          if (c.card.type === 'agent' && c.currentDefense > 0) {
            c.currentDefense = Math.max(0, c.currentDefense - shieldDrain);
          }
        }
        this._log(`Corruption Shield Erosion: all agents -${shieldDrain} DEF`);
      }
    }

    // Draw 1 (Hand Size Reduce applies only to player)
    const handReduce = isPlayerTurn ? this._corruptionTotal('hand_size_reduce') : 0;
    const drawCount = Math.max(0, 1 - handReduce);
    if (drawCount > 0) this._drawCards(combatant, drawCount);

    this.state.turnPhase = 'main';
  }

  endPlayerTurn() {
    if (this.state.phase !== 'player_turn') return;
    this.state.attackers = [];
    this.state.blockers = {};
    this.state.phase = 'enemy_turn';
    this._startTurn(this.state.enemy);
  }

  endEnemyTurn() {
    this.state.phase = 'player_turn';
    this.state.turnNumber++;
    this._startTurn(this.state.player);
  }

  // ── Card play ───────────────────────────────────────────────────────────────

  canPlay(side: 'player' | 'enemy', instanceId: string): boolean {
    const combatant = side === 'player' ? this.state.player : this.state.enemy;
    const card = combatant.hand.find((c) => c.instanceId === instanceId);
    if (!card) return false;
    if (card.card.cost > combatant.currentDataCells) return false;
    if (card.card.type === 'agent' && combatant.field.filter(c => c.card.type === 'agent').length >= 5) return false;
    return true;
  }

  playCard(
    side: 'player' | 'enemy',
    instanceId: string,
    targetInstanceId?: string   // for targeted spells
  ): boolean {
    const combatant = side === 'player' ? this.state.player : this.state.enemy;
    const opponent  = side === 'player' ? this.state.enemy  : this.state.player;

    const idx = combatant.hand.findIndex((c) => c.instanceId === instanceId);
    if (idx === -1) return false;
    const inPlay = combatant.hand[idx];
    if (!this.canPlay(side, instanceId)) return false;

    // Spend mana
    combatant.currentDataCells -= inPlay.card.cost;
    combatant.hand.splice(idx, 1);

    const type = inPlay.card.type;

    if (type === 'agent') {
      inPlay.summonedThisTurn = true;
      // Overclock: can attack even on summon turn (twice)
      if (inPlay.card.keywords?.some((k) => k.keyword === 'overclock')) {
        inPlay.summonedThisTurn = false; // treat as not summoned so tapping works
        inPlay.tapped = false;
      }
      if (inPlay.card.keywords?.some((k) => k.keyword === 'stealth')) {
        inPlay.stealthTurns = 1;
      }

      // Sluggish: initialize turn delay counter
      const sluggishDelay = getSpecialValue(inPlay, 'sluggish');
      const sluggishBonus = getSpecialValues(inPlay, 'sluggish').v2;
      if (sluggishDelay > 0) {
        inPlay.sluggishTurns = sluggishDelay;
        // Accumulate DEF/ATK bonus during wait (specialValue2 encodes as 2-digit: tens=def, ones=? wait...)
        // Per description: specialValue2 = DEF bonus amount (simple), or 2-digit for T6+ (31 = +3DEF+1ATK per wait turn)
        // For simplicity: apply bonus immediately as placeholder (agent can't attack for N turns)
      }
      // Sluggish T8+: Taunt (specialValue2 >= 100)
      if (sluggishBonus >= 100) {
        inPlay.card = { ...inPlay.card, keywords: [...(inPlay.card.keywords ?? []), { keyword: 'taunt' }] };
      }
      // Sluggish T10: immune first turn
      if (sluggishBonus >= 105) {
        inPlay.sluggishImmune = true;
      }
      inPlay.playedOnTurn = this.state.turnNumber;

      combatant.field.push(inPlay);

      // Overheating: first-turn ATK bonus
      const ohEntry = getSpecialValues(inPlay, 'overheating');
      if (ohEntry.v1 > 0) {
        inPlay.currentAttack += ohEntry.v1;
        this._log(`${inPlay.card.name} enters overheated: +${ohEntry.v1} ATK this turn!`);
      }

      // Augmented mod: bonus defense on entry
      const shieldBonus = getShieldValue(inPlay);
      if (shieldBonus > 0) {
        inPlay.currentDefense += shieldBonus;
        this._log(`${inPlay.card.name} enters with +${shieldBonus} Shield`);
      }
      // Entry effects
      this._resolveEntryEffect(inPlay, combatant, opponent, targetInstanceId);
      this._log(`${side} plays Agent: ${inPlay.card.name}`);

      // Bloated draw on play (for agents too)
      const bloatedDraw = getSpecialValue(inPlay, 'bloated_draw');
      if (bloatedDraw > 0) {
        const drawCount = bloatedDraw === 99
          ? Math.max(0, combatant.maxDataCells - combatant.hand.length) // draw to full hand
          : bloatedDraw;
        if (drawCount > 0) this._drawCards(combatant, drawCount);
      }

      // Check traps
      this._checkTraps(opponent, inPlay, 'on_play_agent');

    } else if (type === 'script') {
      // Flickering: chance to fizzle (card consumed but no effect)
      const flickerChance = getSpecialValue(inPlay, 'flickering') / 100;
      if (flickerChance > 0 && Math.random() < flickerChance) {
        combatant.discard.push(inPlay.card);
        this._log(`${side}'s ${inPlay.card.name} fizzles! (Flickering)`);
      } else {
        this._resolveScriptEffect(inPlay, combatant, opponent, targetInstanceId);
        // Bloated draw: draw cards on play
        const bloatedDraw = getSpecialValue(inPlay, 'bloated_draw');
        if (bloatedDraw > 0) {
          const drawCount = bloatedDraw === 99
            ? Math.max(0, combatant.maxDataCells - combatant.hand.length)
            : bloatedDraw;
          if (drawCount > 0) this._drawCards(combatant, drawCount);
        }
        // Recursive: chance to return to hand instead of discard
        const recurseChance = getRecurseChance(inPlay);
        if (recurseChance > 0 && Math.random() < recurseChance) {
          combatant.hand.push(inPlay);
          this._log(`${inPlay.card.name} returns to hand! (Recursive)`);
        } else {
          combatant.discard.push(inPlay.card);
        }
        this._log(`${side} plays Script: ${inPlay.card.name}`);
      }

      // Check opponent traps
      this._checkTraps(opponent, inPlay, 'on_play_script');

    } else if (type === 'malware') {
      combatant.field.push(inPlay);
      this._applyMalwareEffect(inPlay, combatant);
      this._log(`${side} plays Malware: ${inPlay.card.name}`);

    } else if (type === 'trap') {
      combatant.traps.push(inPlay);
      this._log(`${side} sets a Trap`);
    }

    this._checkWinCondition();
    return true;
  }

  // ── Entry effects ────────────────────────────────────────────────────────────

  private _resolveEntryEffect(
    inPlay: CardInPlay,
    _owner: CombatantState,
    opponent: CombatantState,
    targetId?: string
  ) {
    // Replicated: summon a copy with reduced stats on entry
    const replicateVals = getSpecialValues(inPlay, 'replicate');
    if (replicateVals.v1 > 0) {
      const copyCard: Card = {
        ...inPlay.card,
        mods: undefined,
        name: `${inPlay.card.name} (Copy)`,
      };
      const copy: CardInPlay = {
        card: copyCard,
        instanceId: `${inPlay.card.id}_copy_${++_instanceCounter}`,
        currentAttack: replicateVals.v1,
        currentDefense: replicateVals.v2,
        tapped: false,
        stealthTurns: 0,
        summonedThisTurn: true,
        buffs: [],
        turnsOnField: 0,
      };
      _owner.field.push(copy);
      this._log(`${inPlay.card.name} summons a ${replicateVals.v1}/${replicateVals.v2} copy!`);
    }

    const effect = inPlay.card.effect;
    if (!effect) return;

    if (effect.type === 'damage') {
      if (effect.target === 'any' && targetId) {
        const t = opponent.field.find((c) => c.instanceId === targetId);
        if (t) { this._dealDamageToAgent(t, opponent, effect.value ?? 0); }
        else   { opponent.health -= effect.value ?? 0; }
      } else if (effect.target === 'all_enemy_agents') {
        for (const t of [...opponent.field]) this._dealDamageToAgent(t, opponent, effect.value ?? 0);
      }
    } else if (effect.type === 'draw') {
      this._drawCards(_owner, effect.value ?? 1);
    } else if (effect.type === 'reveal') {
      // Decrypt: in game state, just log (UI can show top card)
      this._log(`Decrypt: enemy top card = ${opponent.deck[0]?.name ?? 'empty'}`);
    }
  }

  private _resolveScriptEffect(
    inPlay: CardInPlay,
    owner: CombatantState,
    opponent: CombatantState,
    targetId?: string
  ) {
    const effect = inPlay.card.effect;
    if (!effect) return;

    // Collect mod specials for this script
    const siphon = getSiphonValue(inPlay);
    const drainPct = getDrainPercent(inPlay);
    const corrode = getCorrodeValues(inPlay);
    const detonateDmg = getDetonateValue(inPlay);
    const forkedEfficacy = getSpecialValue(inPlay, 'forked');

    let totalDamageDealt = 0;

    if (effect.type === 'damage') {
      const dmg = effect.value ?? 0;  // amp bonus already baked into effect.value by mod system

      // ── Primary effect resolution ──
      if (effect.target === 'any' && targetId) {
        const t = opponent.field.find((c) => c.instanceId === targetId);
        if (t) {
          const defBefore = t.currentDefense;
          this._dealDamageToAgent(t, opponent, dmg);
          totalDamageDealt += dmg;
          // Corrode: reduce target defense
          if (corrode.v1 > 0 && t.currentDefense > 0) {
            t.currentDefense = Math.max(0, t.currentDefense - corrode.v1);
            this._log(`${t.card.name} corroded: -${corrode.v1} DEF`);
          }
          // Detonate: if target dies, AOE damage to remaining agents
          if (t.currentDefense <= 0 && detonateDmg > 0) {
            for (const a of [...opponent.field]) {
              if (a !== t && a.currentDefense > 0) {
                this._dealDamageToAgent(a, opponent, detonateDmg);
                this._log(`Detonation: ${a.card.name} takes ${detonateDmg} damage`);
              }
            }
          }
        } else {
          this._dealScriptDamageToPlayer(inPlay, opponent, dmg);
          totalDamageDealt += dmg;
        }
      } else if (effect.target === 'all_enemy_agents') {
        for (const t of [...opponent.field]) {
          this._dealDamageToAgent(t, opponent, dmg);
          totalDamageDealt += dmg;
          if (corrode.v1 > 0 && t.currentDefense > 0) {
            t.currentDefense = Math.max(0, t.currentDefense - corrode.v1);
          }
        }
      } else if (!targetId) {
        this._dealScriptDamageToPlayer(inPlay, opponent, dmg);
        totalDamageDealt += dmg;
      }

      // ── Forked: % chance to queue a second full-damage launch ──
      if (forkedEfficacy > 0 && Math.random() * 100 < forkedEfficacy) {
        this.state.pendingFork = { dmg, sourceCard: inPlay };
        this._log(`Forked: ${inPlay.card.name} procs second launch (${dmg} dmg)`);
      }

      // ── Drain: lifesteal (percentage of total damage dealt) ──
      if (drainPct > 0 && totalDamageDealt > 0) {
        const healed = Math.ceil(totalDamageDealt * drainPct / 100);
        owner.health = Math.min(owner.maxHealth, owner.health + healed);
        this._log(`Drain: healed ${healed} HP`);
      }
      // Siphon: flat HP heal after dealing damage
      if (siphon > 0) {
        owner.health = Math.min(owner.maxHealth, owner.health + siphon);
      }
    } else if (effect.type === 'heal') {
      if (owner === this.state.player && this._hasCorruption('no_healing')) {
        this._log(`${inPlay.card.name}: healing blocked! (No Repair corruption)`);
      } else {
        const healed = Math.min(owner.maxHealth - owner.health, effect.value ?? 0);
        owner.health = Math.min(owner.maxHealth, owner.health + (effect.value ?? 0));
        if (healed > 0) this._log(`${inPlay.card.name} heals ${healed} HP.`);
      }
    } else if (effect.type === 'draw') {
      this._drawCards(owner, effect.value ?? 1);
      // supply crate: +1 temp data cell
      if (inPlay.card.id === 'neutral_supply_crate') {
        owner.currentDataCells = Math.min(owner.maxDataCells, owner.currentDataCells + 1);
      }
    } else if (effect.type === 'bounce' && targetId) {
      const idx = opponent.field.findIndex((c) => c.instanceId === targetId);
      if (idx !== -1) {
        const bounced = opponent.field.splice(idx, 1)[0];
        bounced.currentAttack = bounced.card.attack ?? 0;
        bounced.currentDefense = bounced.card.defense ?? 0;
        bounced.tapped = false;
        bounced.buffs = [];
        opponent.hand.push(bounced);
      }
    } else if (effect.type === 'buff') {
      if (effect.target === 'self' && targetId) {
        const t = owner.field.find((c) => c.instanceId === targetId);
        if (t) {
          t.currentAttack += effect.value ?? 0;
          t.buffs.push({ attack: effect.value ?? 0, defense: 0, source: inPlay.card.id });
        }
      } else if (effect.target === 'all_agents') {
        for (const t of owner.field) {
          t.currentAttack += effect.value ?? 0;
          t.currentDefense += effect.value ?? 0;
        }
      }
    }
  }

  private _applyMalwareEffect(inPlay: CardInPlay, owner: CombatantState) {
    const effect = inPlay.card.effect;
    if (!effect || effect.type !== 'buff') return;
    // Continuous buff to matching energy agents
    const energy = inPlay.card.energy;
    for (const a of owner.field) {
      if (a.card.type === 'agent' && (a.card.energy === energy || effect.target === 'all_agents')) {
        a.currentAttack += effect.value ?? 0;
        a.buffs.push({ attack: effect.value ?? 0, defense: 0, source: inPlay.card.id });
      }
    }
  }

  // ── Trap resolution ──────────────────────────────────────────────────────────

  private _checkTraps(
    trapOwner: CombatantState,
    triggeringCard: CardInPlay,
    trigger: 'on_play_agent' | 'on_play_script'
  ) {
    for (let i = trapOwner.traps.length - 1; i >= 0; i--) {
      const trap = trapOwner.traps[i];
      if (trap.card.triggerCondition !== trigger) continue;

      // Initialize layeredCharges on first trigger if the trap has the Layered mod
      if (trap.layeredCharges === undefined) {
        const extraTriggers = getSpecialValue(trap, 'layered');
        trap.layeredCharges = extraTriggers; // 0 = no extra triggers (normal), 1/2/3 = extra
      }

      // Resolve trap effect
      const effect = trap.card.effect;
      if (effect) {
        if (effect.type === 'damage') {
          if (trigger === 'on_play_agent') {
            this._dealDamageToAgent(triggeringCard,
              trapOwner === this.state.player ? this.state.enemy : this.state.player,
              effect.value ?? 0
            );
          }
        } else if (effect.type === 'counter') {
          const opp = trapOwner === this.state.player ? this.state.enemy : this.state.player;
          opp.discard.pop();
          this._log(`Trap: ${trap.card.name} countered ${triggeringCard.card.name}!`);
        }
      }

      // Consume one charge or remove the trap
      if (trap.layeredCharges > 0) {
        trap.layeredCharges--;
        this._log(`Trap triggered: ${trap.card.name} (${trap.layeredCharges} extra trigger${trap.layeredCharges !== 1 ? 's' : ''} left)`);
      } else {
        trapOwner.traps.splice(i, 1);
        trapOwner.discard.push(trap.card);
        this._log(`Trap triggered: ${trap.card.name}`);
      }
    }
  }

  // ── Shield calculation ────────────────────────────────────────────────────────

  /** Sum of DEF of all living Agents on a side — used to reduce direct player damage */
  calculateShield(side: 'player' | 'enemy'): number {
    const combatant = side === 'player' ? this.state.player : this.state.enemy;
    return combatant.field
      .filter((c) => c.card.type === 'agent' && c.currentDefense > 0)
      .reduce((sum, c) => sum + c.currentDefense, 0);
  }

  /** Apply script damage to player, accounting for shield + disrupt bypass */
  private _dealScriptDamageToPlayer(script: CardInPlay, target: CombatantState, dmg: number) {
    const side = target === this.state.player ? 'player' : 'enemy';
    const shield = this.calculateShield(side);
    const disrupt = getDisruptValue(script);
    const effectiveShield = Math.round(shield * (1 - disrupt));
    const effectiveDmg = Math.max(0, dmg - effectiveShield);
    target.health -= effectiveDmg;
    if (disrupt > 0 && shield > 0) {
      this._log(`${script.card.name} disrupts shield (${Math.round(disrupt * 100)}% bypass): ${dmg} - ${effectiveShield}/${shield} shield = ${effectiveDmg}`);
    }
  }

  // ── Combat — Player chooses target per attacker ───────────────────────────────

  /** Returns true if the given player agent can attack this turn */
  canAttack(instanceId: string): boolean {
    const attacker = this.state.player.field.find((c) => c.instanceId === instanceId);
    if (!attacker || attacker.card.type !== 'agent') return false;
    if (attacker.tapped) return false;
    if (attacker.summonedThisTurn && !attacker.card.keywords?.some((k) => k.keyword === 'overclock')) return false;
    if ((attacker.sluggishTurns ?? 0) > 0) return false;
    return true;
  }

  /** Player agent attacks a specific enemy agent (agent vs agent) */
  attackAgentVsAgent(attackerInstanceId: string, targetInstanceId: string): AttackEvent | null {
    const player = this.state.player;
    const enemy  = this.state.enemy;

    const attacker = player.field.find((c) => c.instanceId === attackerInstanceId);
    const defender = enemy.field.find((c) => c.instanceId === targetInstanceId);

    if (!attacker || !defender) return null;
    if (!this.canAttack(attackerInstanceId)) return null;
    if (defender.card.type !== 'agent') return null;

    // Sluggish: can't attack if still in delay
    if ((attacker.sluggishTurns ?? 0) > 0) return null;

    attacker.tapped = true;

    // Both deal damage simultaneously
    const attackerDmg = attacker.currentAttack;
    const defenderDmg = defender.currentAttack;

    const attackerArmor = attacker.card.keywords?.find((k) => k.keyword === 'armor')?.value ?? 0;
    const defenderArmor = defender.card.keywords?.find((k) => k.keyword === 'armor')?.value ?? 0;

    // Short Circuit: % self-damage on attack + bonus damage at high tiers
    const scChance = getSpecialValues(attacker, 'shortcircuit').v1;
    const scBonus  = getSpecialValues(attacker, 'shortcircuit').v2;
    if (scChance > 0 && Math.random() * 100 < scChance) {
      this._dealDamageToAgent(attacker, player, attackerDmg);
      this._log(`${attacker.card.name} Short Circuit: takes ${attackerDmg} self-damage!`);
    }

    // Glitchstrike: bypass N points of armor (specialValue: 1/2/3=N, >=99=ignore all armor)
    // "First attack this turn" is always true since attacker was just untapped.
    const glitchVal = getSpecialValue(attacker, 'glitchstrike');
    const effectiveDefArmor = glitchVal >= 99 ? 0 : Math.max(0, defenderArmor - glitchVal);
    const attackDealt = Math.max(0, attackerDmg - effectiveDefArmor) + scBonus;

    this._dealDamageToAgent(defender, enemy,  attackDealt, attacker, player);
    this._dealDamageToAgent(attacker, player, Math.max(0, defenderDmg - defenderArmor));

    // Corrode: v1 = ATK reduction, v2 = DEF reduction
    const corrode = getCorrodeValues(attacker);
    if (corrode.v1 > 0 || corrode.v2 > 0) {
      const stillAlive = enemy.field.find((c) => c.instanceId === defender.instanceId);
      if (stillAlive) {
        stillAlive.currentAttack  = Math.max(0, stillAlive.currentAttack  - corrode.v1);
        stillAlive.currentDefense = Math.max(1, stillAlive.currentDefense - corrode.v2);
      }
    }

    // False Positive / Cleave: chance (or guaranteed T10) to hit an additional enemy
    const fpAllyChance = getSpecialValues(attacker, 'falsepositive').v1;  // ally hit chance
    const fpCleaveChance = getSpecialValues(attacker, 'falsepositive').v2; // cleave chance
    if (fpAllyChance > 0 && Math.random() * 100 < fpAllyChance) {
      // Hit a random friendly instead (additional attack — not the same target)
      const friendlies = player.field.filter((c) => c !== attacker && c.card.type === 'agent');
      if (friendlies.length > 0) {
        const friendly = friendlies[Math.floor(Math.random() * friendlies.length)];
        this._dealDamageToAgent(friendly, player, attackerDmg);
        this._log(`${attacker.card.name} False Positive: hits own ${friendly.card.name}!`);
      }
    } else if (fpCleaveChance > 0 && Math.random() * 100 < fpCleaveChance) {
      // Cleave: hit another enemy agent
      const otherTargets = enemy.field.filter((c) => c !== defender && c.card.type === 'agent');
      if (otherTargets.length > 0) {
        const secondary = otherTargets[Math.floor(Math.random() * otherTargets.length)];
        this._dealDamageToAgent(secondary, enemy, attackerDmg, attacker, player);
        this._log(`${attacker.card.name} Cleave: also hits ${secondary.card.name}`);
      }
    }

    this._log(`${attacker.card.name} attacks ${defender.card.name}`);

    // Flux Surge: chance to attack again (agent must still be alive)
    const fluxChance = getSpecialValue(attacker, 'fluxsurge');
    if (fluxChance > 0 && attacker.currentDefense > 0 && Math.random() * 100 < fluxChance) {
      this._log(`${attacker.card.name} surges! Attacking again!`);
      // Pick a new target (the same or another live enemy agent, or player if none)
      const liveTargets = enemy.field.filter((c) => c.card.type === 'agent' && c.currentDefense > 0);
      if (liveTargets.length > 0) {
        const t2 = liveTargets[Math.floor(Math.random() * liveTargets.length)];
        const surgeArmor = t2.card.keywords?.find((k) => k.keyword === 'armor')?.value ?? 0;
        const surgeDmg = Math.max(0, attacker.currentAttack - surgeArmor);
        this._dealDamageToAgent(t2, enemy, surgeDmg, attacker, player);
        this._dealDamageToAgent(attacker, player, Math.max(0, t2.currentAttack - (attacker.card.keywords?.find((k) => k.keyword === 'armor')?.value ?? 0)));
      } else {
        // No agents left — hit player directly
        enemy.health -= attacker.currentAttack;
        this._log(`${attacker.card.name} surge hits player for ${attacker.currentAttack}`);
      }
    }

    this._checkWinCondition();

    return { type: 'combat', attacker, blocker: defender, attackerDmg, blockerDmg: defenderDmg, target: 'agent' };
  }

  /** Player agent attacks the enemy player directly (shield reduces damage) */
  attackAgentVsPlayer(attackerInstanceId: string): AttackEvent | null {
    const player = this.state.player;
    const enemy  = this.state.enemy;

    const attacker = player.field.find((c) => c.instanceId === attackerInstanceId);
    if (!attacker) return null;
    if (!this.canAttack(attackerInstanceId)) return null;

    attacker.tapped = true;

    const rawDmg = attacker.currentAttack;

    // Phasing mod: bypass some or all shield
    let shieldBypass = 0;
    const phasingPct = getSpecialValue(attacker, 'phasing');
    if (phasingPct > 0) shieldBypass = phasingPct / 100;

    const shield = this.calculateShield('enemy');
    const effectiveShield = Math.round(shield * (1 - shieldBypass));
    const shieldedDmg = Math.max(0, rawDmg - effectiveShield);

    // Breach mod: bonus true damage that ignores shield entirely
    const breach = getBreachValue(attacker);
    const effectiveDmg = shieldedDmg + breach;

    enemy.health -= effectiveDmg;
    if (breach > 0) {
      this._log(`${attacker.card.name} attacks player: ${rawDmg} - ${effectiveShield} shield = ${shieldedDmg} + ${breach} breach = ${effectiveDmg}`);
    } else {
      this._log(`${attacker.card.name} attacks player directly: ${rawDmg} - ${effectiveShield} shield = ${effectiveDmg} damage`);
    }

    // Drain: heal % of damage dealt on direct player damage
    const drainPct = getDrainPercent(attacker);
    if (drainPct > 0 && effectiveDmg > 0) {
      const healed = Math.ceil(effectiveDmg * drainPct / 100);
      player.health = Math.min(player.maxHealth, player.health + healed);
      this._log(`${attacker.card.name} drains ${healed} life! (${drainPct}%)`);
    }

    // Flux Surge: chance to attack again
    const fluxDirect = getSpecialValue(attacker, 'fluxsurge');
    if (fluxDirect > 0 && attacker.currentDefense > 0 && Math.random() * 100 < fluxDirect) {
      this._log(`${attacker.card.name} surges! Attacking player again!`);
      enemy.health -= Math.max(0, attacker.currentAttack - this.calculateShield('enemy'));
    }

    this._checkWinCondition();
    return { type: 'direct', attacker, damage: effectiveDmg, damageAbsorbed: rawDmg - shieldedDmg, target: 'player' };
  }

  // Keep declareAttacker for backward compat (battleStore legacy path)
  declareAttacker(instanceId: string) {
    const attacker = this.state.player.field.find((c) => c.instanceId === instanceId);
    if (!attacker || attacker.card.type !== 'agent') return;
    if (attacker.tapped) return;
    if (attacker.summonedThisTurn && !attacker.card.keywords?.some((k) => k.keyword === 'overclock')) return;
    const already = this.state.attackers.indexOf(instanceId);
    if (already !== -1) this.state.attackers.splice(already, 1);
    else this.state.attackers.push(instanceId);
  }

  declareBlocker(attackerId: string, blockerId: string | null) {
    if (blockerId === null) delete this.state.blockers[attackerId];
    else {
      const blocker = this.state.enemy.field.find((c) => c.instanceId === blockerId);
      if (!blocker || blocker.card.type !== 'agent') return;
      this.state.blockers[attackerId] = blockerId;
    }
  }

  // Legacy resolveAttacks (kept for compatibility; new UI uses attackAgentVs*)
  resolveAttacks(): { events: AttackEvent[] } {
    const events: AttackEvent[] = [];
    const player = this.state.player;
    const enemy  = this.state.enemy;

    for (const attackerId of this.state.attackers) {
      const attacker = player.field.find((c) => c.instanceId === attackerId);
      if (!attacker) continue;
      attacker.tapped = true;
      const blockerId = this.state.blockers[attackerId];
      const blocker = blockerId ? enemy.field.find((c) => c.instanceId === blockerId) : undefined;

      if (blocker) {
        const attackerDmg = attacker.currentAttack;
        const blockerDmg  = blocker.currentAttack;
        const attackerArmor = attacker.card.keywords?.find((k) => k.keyword === 'armor')?.value ?? 0;
        const blockerArmor  = blocker.card.keywords?.find((k) => k.keyword === 'armor')?.value  ?? 0;
        this._dealDamageToAgent(blocker,  enemy,  Math.max(0, attackerDmg - blockerArmor), attacker, player);
        this._dealDamageToAgent(attacker, player, Math.max(0, blockerDmg  - attackerArmor));
        const corrode = getCorrodeValues(attacker);
        if (corrode.v1 > 0 || corrode.v2 > 0) {
          const stillAlive = enemy.field.find((c) => c.instanceId === blocker.instanceId);
          if (stillAlive) {
            stillAlive.currentAttack  = Math.max(0, stillAlive.currentAttack  - corrode.v1);
            stillAlive.currentDefense = Math.max(1, stillAlive.currentDefense - corrode.v2);
          }
        }
        events.push({ type: 'combat', attacker, blocker, attackerDmg, blockerDmg, target: 'agent' });
      } else {
        const shield = this.calculateShield('enemy');
        const breach = getBreachValue(attacker);
        const shieldedDmg = Math.max(0, attacker.currentAttack - shield);
        const effectiveDmg = shieldedDmg + breach;
        enemy.health -= effectiveDmg;
        events.push({ type: 'direct', attacker, damage: effectiveDmg, damageAbsorbed: attacker.currentAttack - shieldedDmg, target: 'player' });
        const drainPct = getDrainPercent(attacker);
        if (drainPct > 0 && effectiveDmg > 0) {
          const healed = Math.ceil(effectiveDmg * drainPct / 100);
          player.health = Math.min(player.maxHealth, player.health + healed);
        }
      }
    }
    this.state.attackers = [];
    this.state.blockers  = {};
    this._checkWinCondition();
    return { events };
  }

  // Enemy AI attacks — uses shield system for direct damage to player
  resolveEnemyAttacks(): { events: AttackEvent[] } {
    const events: AttackEvent[] = [];
    const enemy  = this.state.enemy;
    const player = this.state.player;

    // Sort enemy field by lag: negative lag = acts first, positive = acts last
    const sortedField = [...enemy.field].sort((a, b) => {
      const lagA = getSpecialValue(a, 'lag');
      const lagB = getSpecialValue(b, 'lag');
      return lagA - lagB; // negative first, then 0, then positive
    });

    for (const attacker of sortedField) {
      if (attacker.card.type !== 'agent' || attacker.tapped || attacker.summonedThisTurn) continue;
      if ((attacker.sluggishTurns ?? 0) > 0) continue;
      attacker.tapped = true;

      // Stealth: can't be targeted
      if (attacker.stealthTurns > 0) {
        const shield = this.calculateShield('player');
        const breach = getBreachValue(attacker);
        const shieldedDmg = Math.max(0, attacker.currentAttack - shield);
        const effectiveDmg = shieldedDmg + breach;
        player.health -= effectiveDmg;
        events.push({ type: 'direct', attacker, damage: effectiveDmg, damageAbsorbed: attacker.currentAttack - shieldedDmg, target: 'player' });
        const drainPct = getDrainPercent(attacker);
        if (drainPct > 0 && effectiveDmg > 0) {
          const healed = Math.ceil(effectiveDmg * drainPct / 100);
          enemy.health = Math.min(enemy.maxHealth, enemy.health + healed);
        }
        continue;
      }

      // AI decision: attack weakest player agent that would die, otherwise go direct
      const canAttack = player.field.filter(
        (c) => c.card.type === 'agent' && c.currentDefense > 0
      );

      // Taunt: enemy must target taunt agents first
      const tauntTargets = canAttack.filter((c) => c.card.keywords?.some((k) => k.keyword === 'taunt'));
      const attackPool = tauntTargets.length > 0 ? tauntTargets : canAttack;

      // Find player agent attacker can kill (profitable trade)
      const killTarget = attackPool.find(
        (c) => c.currentDefense <= attacker.currentAttack && c.currentAttack < attacker.currentDefense
      );
      // Otherwise any agent it can destroy
      const anyKill = attackPool.find((c) => c.currentDefense <= attacker.currentAttack);
      // If taunt agent exists but can't kill, still must attack it
      const forcedTaunt = tauntTargets.length > 0 ? tauntTargets[0] : null;
      const target = killTarget ?? anyKill ?? forcedTaunt ?? null;

      if (target) {
        // Agent vs agent
        const attackerDmg = attacker.currentAttack;
        const defenderDmg = target.currentAttack;
        const attackerArmor = attacker.card.keywords?.find((k) => k.keyword === 'armor')?.value ?? 0;
        const defenderArmor = target.card.keywords?.find((k) => k.keyword === 'armor')?.value  ?? 0;
        // Short Circuit: self-damage + bonus damage for enemy agents
        const eScChance = getSpecialValues(attacker, 'shortcircuit').v1;
        const eScBonus  = getSpecialValues(attacker, 'shortcircuit').v2;
        if (eScChance > 0 && Math.random() * 100 < eScChance) {
          this._dealDamageToAgent(attacker, enemy, attackerDmg);
        }
        const eEffectiveDmg = Math.max(0, attackerDmg - defenderArmor) + eScBonus;
        const targetWillDie = (target.currentDefense - eEffectiveDmg) <= 0;
        this._dealDamageToAgent(target,   player, eEffectiveDmg, attacker, enemy);
        this._dealDamageToAgent(attacker, enemy,  Math.max(0, defenderDmg - attackerArmor));
        const corrode = getCorrodeValues(attacker);
        if (corrode.v1 > 0 || corrode.v2 > 0) {
          const stillAlive = player.field.find((c) => c.instanceId === target.instanceId);
          if (stillAlive) {
            stillAlive.currentAttack  = Math.max(0, stillAlive.currentAttack  - corrode.v1);
            stillAlive.currentDefense = Math.max(1, stillAlive.currentDefense - corrode.v2);
          }
        }
        // False Positive / Cleave on enemy agents
        const eFpAlly  = getSpecialValues(attacker, 'falsepositive').v1;
        const eFpCleave = getSpecialValues(attacker, 'falsepositive').v2;
        if (eFpAlly > 0 && Math.random() * 100 < eFpAlly) {
          const friendlies = enemy.field.filter((c) => c !== attacker && c.card.type === 'agent');
          if (friendlies.length > 0) {
            const friendly = friendlies[Math.floor(Math.random() * friendlies.length)];
            this._dealDamageToAgent(friendly, enemy, attackerDmg);
          }
        } else if (eFpCleave > 0 && Math.random() * 100 < eFpCleave) {
          const others = player.field.filter((c) => c !== target && c.card.type === 'agent');
          if (others.length > 0) {
            const secondary = others[Math.floor(Math.random() * others.length)];
            this._dealDamageToAgent(secondary, player, attackerDmg, attacker, enemy);
          }
        }

        // Decay mod effects (only if target has mods worth degrading, or memory_wipe/bit_flip)
        if (this.decayStage >= 2) {
          this._applyDecayEffect(attacker, target, targetWillDie);
        }
        events.push({ type: 'combat', attacker, blocker: target, attackerDmg, blockerDmg: defenderDmg, target: 'agent' });

        // Flux Surge: enemy agent attacks again
        const eFlux = getSpecialValue(attacker, 'fluxsurge');
        if (eFlux > 0 && attacker.currentDefense > 0 && Math.random() * 100 < eFlux) {
          this._log(`Enemy ${attacker.card.name} surges! Attacking again!`);
          const liveTargets = player.field.filter((c) => c.card.type === 'agent' && c.currentDefense > 0);
          if (liveTargets.length > 0) {
            const t2 = liveTargets[Math.floor(Math.random() * liveTargets.length)];
            this._dealDamageToAgent(t2, player, Math.max(0, attacker.currentAttack - (t2.card.keywords?.find((k) => k.keyword === 'armor')?.value ?? 0)), attacker, enemy);
          } else {
            player.health -= attacker.currentAttack;
          }
        }
      } else {
        // Attack player directly — shield reduces damage, breach bypasses
        const shield = this.calculateShield('player');
        const breach = getBreachValue(attacker);
        const shieldedDmg = Math.max(0, attacker.currentAttack - shield);
        const doubleDmgMult = this._hasCorruption('double_damage') ? 2 : 1;
        const effectiveDmg = (shieldedDmg + breach) * doubleDmgMult;
        player.health -= effectiveDmg;
        events.push({ type: 'direct', attacker, damage: effectiveDmg, damageAbsorbed: attacker.currentAttack - shieldedDmg, target: 'player' });
        this._log(`Enemy ${attacker.card.name} attacks player: ${attacker.currentAttack} - ${shield} shield + ${breach} breach = ${effectiveDmg}${doubleDmgMult > 1 ? ' (x2 VOID RESONANCE)' : ''}`);
        const drainPct = getDrainPercent(attacker);
        if (drainPct > 0 && effectiveDmg > 0) {
          const healed = Math.ceil(effectiveDmg * drainPct / 100);
          enemy.health = Math.min(enemy.maxHealth, enemy.health + healed);
        }
        // Flux Surge: enemy agent attacks player again
        const eFluxDirect = getSpecialValue(attacker, 'fluxsurge');
        if (eFluxDirect > 0 && attacker.currentDefense > 0 && Math.random() * 100 < eFluxDirect) {
          this._log(`Enemy ${attacker.card.name} surges! Attacking player again!`);
          player.health -= Math.max(0, attacker.currentAttack - this.calculateShield('player'));
        }
        // Decay: direct hit can trigger memory_wipe / heap_corruption
        if (this.decayStage >= 2) {
          this._applyDecayEffect(attacker, null, false);
        }
      }
    }

    this._checkWinCondition();
    return { events };
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  private _dealDamageToAgent(
    target: CardInPlay,
    owner: CombatantState,
    amount: number,
    attacker?: CardInPlay,
    attackerOwner?: CombatantState,
  ) {
    // Sluggish T10: first-turn immunity
    if (target.sluggishImmune && amount > 0) {
      this._log(`${target.card.name} is immune this turn! (Sluggish T10)`);
      return;
    }
    target.currentDefense -= amount;
    if (target.currentDefense <= 0) {
      // Remove from field
      const fi = owner.field.findIndex((c) => c.instanceId === target.instanceId);
      if (fi !== -1) {
        owner.field.splice(fi, 1);
        owner.discard.push(target.card);
        // Remove malware buffs granted by this card
        for (const a of owner.field) {
          a.buffs = a.buffs.filter((b) => b.source !== target.card.id);
        }
        this._log(`${target.card.name} is destroyed!`);

        // Detonate: deal damage to all enemy agents + player on death
        const detonate = getDetonateValue(target);
        if (detonate > 0) {
          const opp = owner === this.state.player ? this.state.enemy : this.state.player;
          for (const f of [...opp.field]) {
            this._dealDamageToAgent(f, opp, detonate);
          }
          if (detonate >= 3) opp.health -= detonate;
          this._log(`${target.card.name} DETONATES for ${detonate}!`);
        }

        // Fragile Death: on-death damage burst
        // specialValue > 0 = single target, < 0 = AoE, -999 = ATK damage to all + heal
        const fragileVal = getSpecialValue(target, 'fragile_death');
        if (fragileVal !== 0) {
          const opp = owner === this.state.player ? this.state.enemy : this.state.player;
          if (fragileVal === -999) {
            // ATK damage to all enemies + heal 3
            const dmg = target.currentAttack > 0 ? target.currentAttack : (target.card.attack ?? 1);
            for (const f of [...opp.field]) this._dealDamageToAgent(f, opp, dmg);
            opp.health -= dmg;
            owner.health = Math.min(owner.maxHealth, owner.health + 3);
            this._log(`${target.card.name} Fragile Death: ${dmg} AoE + heal 3`);
          } else if (fragileVal < 0) {
            // AoE damage to all enemies
            const dmg = -fragileVal;
            for (const f of [...opp.field]) this._dealDamageToAgent(f, opp, dmg);
            opp.health -= dmg;
            this._log(`${target.card.name} Fragile Death: ${dmg} AoE!`);
          } else {
            // Single target: pick random enemy agent or hit player directly
            const targets = opp.field.filter((c) => c.card.type === 'agent');
            if (targets.length > 0) {
              const t = targets[Math.floor(Math.random() * targets.length)];
              this._dealDamageToAgent(t, opp, fragileVal);
            } else {
              opp.health -= fragileVal;
            }
            this._log(`${target.card.name} Fragile Death: ${fragileVal} to random target`);
          }
        }

        // Recurse: chance to return to hand on death
        const recurseChance = getRecurseChance(target);
        if (recurseChance > 0 && Math.random() < recurseChance) {
          // Reset to base stats and return to hand
          const fresh = { ...target, currentAttack: target.card.attack ?? 0, currentDefense: target.card.defense ?? 0, tapped: false, buffs: [], summonedThisTurn: false };
          owner.hand.push(fresh);
          // Remove from discard
          const di = owner.discard.indexOf(target.card);
          if (di !== -1) owner.discard.splice(di, 1);
          this._log(`${target.card.name} recurses back to hand!`);
        }

        // Feedback Loop: surviving allies react to this death
        for (const ally of [...owner.field]) {
          if (ally.card.type !== 'agent') continue;
          const fbVal = getSpecialValue(ally, 'feedbackloop');
          if (fbVal === 0) continue;

          if (fbVal < 0) {
            // Negative: discard/damage self
            if (fbVal === -1) {
              // Always discarded on ally death
              this._dealDamageToAgent(ally, owner, ally.currentDefense + 1);
            } else if (fbVal === -2) {
              // Discarded from hand (ally is on field here, so only triggers if in hand version — skip)
            } else if (fbVal === -3) {
              // 50% chance
              if (Math.random() < 0.5) this._dealDamageToAgent(ally, owner, ally.currentDefense + 1);
            } else if (fbVal === -4) {
              // 25% chance
              if (Math.random() < 0.25) this._dealDamageToAgent(ally, owner, ally.currentDefense + 1);
            }
          } else {
            // Positive: gain stats / draw
            const gain = decodeStatPair(fbVal);
            if (gain.atk > 0) ally.currentAttack += gain.atk;
            if (gain.def > 0) ally.currentDefense += gain.def;
            // specialValue >= 30 = also draw 1 (fbVal=31,32 → tens digit ≥3)
            if (Math.floor(fbVal / 10) >= 3) {
              this._drawCards(owner, 1);
            }
            this._log(`${ally.card.name} Feedback Loop: +${gain.atk} ATK +${gain.def} DEF`);
          }
        }

        // Feedback Loop (hand version, T2-T3): when ally dies, discard this card from hand
        for (let hi = owner.hand.length - 1; hi >= 0; hi--) {
          const hcard = owner.hand[hi];
          const fbVal = getSpecialValue(hcard, 'feedbackloop');
          if (fbVal === -2) {
            owner.hand.splice(hi, 1);
            owner.discard.push(hcard.card);
            this._log(`${hcard.card.name} discarded by Feedback Loop!`);
          }
        }
      }
    } else if (attacker && attackerOwner) {
      // Drain on combat hit (target survived) — heal % of damage dealt
      const drainPct = getDrainPercent(attacker);
      if (drainPct > 0 && amount > 0) {
        const healed = Math.ceil(amount * drainPct / 100);
        attackerOwner.health = Math.min(attackerOwner.maxHealth, attackerOwner.health + healed);
      }
    }
  }

  private _drawCards(combatant: CombatantState, count: number) {
    const isPlayer = combatant === this.state.player;
    let drawn = 0;
    for (let i = 0; i < count; i++) {
      if (combatant.deck.length === 0) {
        combatant.fatigue++;
        combatant.health -= combatant.fatigue;
        this._log(`Fatigue! Taking ${combatant.fatigue} damage.`);
      } else {
        const card = combatant.deck.shift()!;
        combatant.hand.push(makeInstance(card));
        drawn++;
      }
    }
    if (isPlayer && drawn > 0) {
      this._log(`Drew ${drawn} card${drawn > 1 ? 's' : ''}.`);
    }
  }

  private _decayEvent(msg: string) {
    this.state.decayEvents.push(msg);
    this._log(`☠ ${msg}`);
  }

  /**
   * Apply a decay mod effect from an enemy attacker to the player's target card.
   * Called when an enemy agent with a decay mod hits (or kills) a player card.
   */
  private _applyDecayEffect(
    enemyAttacker: CardInPlay,
    playerTarget: CardInPlay | null,   // null if attacking player directly
    onKill: boolean,
  ) {
    if (this.decayStage < 2) return;

    const cardType = enemyAttacker.card.type as 'agent' | 'script' | 'trap';
    const decay = pickDecayMod(cardType, this.decayStage);
    if (!decay) return;

    const player = this.state.player;
    const effect = decay.effect;

    switch (effect.type) {
      case 'tier_corrode': {
        // Corrode N tiers from a random mod on the hit target
        if (!playerTarget) break;
        // Only on-kill for D04/D07; otherwise on-hit
        if (decay.id === 'D04' || decay.id === 'D07') {
          if (!onKill) break;
        } else {
          if (onKill) break;
        }
        const mods = playerTarget.card.mods?.mods ?? [];
        if (mods.length === 0) break;
        const unlocked = mods.filter((m) => !playerTarget.card.mods?.locked.includes(m.modId));
        const target = unlocked.length > 0 ? unlocked[Math.floor(Math.random() * unlocked.length)] : mods[Math.floor(Math.random() * mods.length)];
        if (!target) break;
        const modDef = MOD_MAP[target.modId];
        const oldTier = target.tier;
        const newTier = Math.max(1, oldTier - effect.value);
        // Apply to the live card's mod array (mutate in place)
        const liveCard = player.field.find((c) => c.instanceId === playerTarget.instanceId);
        if (liveCard?.card.mods) {
          const liveMod = liveCard.card.mods.mods.find((m) => m.modId === target.modId);
          if (liveMod) liveMod.tier = newTier;
        }
        this._decayEvent(`${decay.name}: ${playerTarget.card.mods?.displayName ?? playerTarget.card.name}'s ${modDef?.name ?? target.modId} corroded T${oldTier}→T${newTier}`);
        break;
      }

      case 'mod_strip': {
        // Strip a random unlocked mod from the killed player card
        if (!onKill || !playerTarget) break;
        const mods = playerTarget.card.mods?.mods ?? [];
        const unlocked = mods.filter((m) => !playerTarget.card.mods?.locked.includes(m.modId));
        if (unlocked.length === 0) break;
        const stripMod = unlocked[Math.floor(Math.random() * unlocked.length)];
        const modDef = MOD_MAP[stripMod.modId];
        // Remove from the card in-place (card in discard — visual only)
        const modsArr = playerTarget.card.mods!.mods;
        const idx = modsArr.indexOf(stripMod);
        if (idx !== -1) modsArr.splice(idx, 1);
        this._decayEvent(`${decay.name}: stripped ${modDef?.name ?? stripMod.modId} from ${playerTarget.card.mods?.displayName ?? playerTarget.card.name}`);
        break;
      }

      case 'worm': {
        // On kill: infect 1 random card in player deck, corrode 1 tier
        if (!onKill) break;
        const deckCard = player.deck[Math.floor(Math.random() * player.deck.length)];
        if (!deckCard?.mods?.mods.length) break;
        const deckMod = deckCard.mods.mods[Math.floor(Math.random() * deckCard.mods.mods.length)];
        const modDef = MOD_MAP[deckMod.modId];
        const oldTier = deckMod.tier;
        deckMod.tier = Math.max(1, oldTier - 1);
        this._decayEvent(`${decay.name}: worm infected ${deckCard.mods.displayName ?? deckCard.name}'s ${modDef?.name ?? deckMod.modId} (T${oldTier}→T${deckMod.tier}) in deck`);
        break;
      }

      case 'memory_wipe': {
        // Discard N random cards from player hand (on-hit for scripts)
        if (onKill) break;
        const count = Math.min(effect.value, player.hand.length);
        if (count === 0) break;
        const victims: string[] = [];
        for (let i = 0; i < count; i++) {
          const idx = Math.floor(Math.random() * player.hand.length);
          const [removed] = player.hand.splice(idx, 1);
          player.discard.push(removed.card);
          victims.push(removed.card.name);
        }
        this._decayEvent(`${decay.name}: discarded ${victims.join(', ')}`);
        break;
      }

      case 'bit_flip': {
        // Swap ATK/DEF on a player agent — triggered by traps, apply on hit
        if (onKill || !playerTarget) break;
        const liveCard = player.field.find((c) => c.instanceId === playerTarget.instanceId);
        if (!liveCard) break;
        const tmp = liveCard.currentAttack;
        liveCard.currentAttack  = liveCard.currentDefense;
        liveCard.currentDefense = tmp;
        this._decayEvent(`${decay.name}: ${liveCard.card.name}'s ATK/DEF swapped (${liveCard.currentDefense}/${liveCard.currentAttack}→${liveCard.currentAttack}/${liveCard.currentDefense})`);
        break;
      }

      case 'stack_overflow': {
        // Increase cost of all player hand cards by 1
        if (onKill) break;
        for (const handCard of player.hand) {
          // Mutate the card cost in-place
          (handCard.card as Card & { _costOverflow?: number })._costOverflow = ((handCard.card as Card & { _costOverflow?: number })._costOverflow ?? 0) + effect.value;
        }
        this._decayEvent(`${decay.name}: all hand cards cost +${effect.value} this battle`);
        break;
      }

      case 'heap_corruption': {
        // Reduce player max HP
        if (onKill) break;
        player.maxHealth = Math.max(1, player.maxHealth - effect.value);
        player.health    = Math.min(player.health, player.maxHealth);
        this._decayEvent(`${decay.name}: max HP reduced by ${effect.value} (now ${player.maxHealth})`);
        break;
      }

      case 'damage_degrade': {
        // Corrode N tiers from target on hit
        if (onKill || !playerTarget) break;
        const mods = playerTarget.card.mods?.mods ?? [];
        if (mods.length === 0) break;
        const unlocked = mods.filter((m) => !playerTarget.card.mods?.locked.includes(m.modId));
        const t = unlocked.length > 0 ? unlocked[Math.floor(Math.random() * unlocked.length)] : mods[Math.floor(Math.random() * mods.length)];
        if (!t) break;
        const modDef = MOD_MAP[t.modId];
        const oldTier = t.tier;
        const newTier = Math.max(1, oldTier - effect.value);
        const liveCard = player.field.find((c) => c.instanceId === playerTarget.instanceId);
        if (liveCard?.card.mods) {
          const liveMod = liveCard.card.mods.mods.find((m) => m.modId === t.modId);
          if (liveMod) liveMod.tier = newTier;
        }
        this._decayEvent(`${decay.name}: ${playerTarget.card.mods?.displayName ?? playerTarget.card.name}'s ${modDef?.name ?? t.modId} degraded T${oldTier}→T${newTier}`);
        break;
      }

      default:
        break;
    }
  }

  /** Consume and return pending decay events (clears the buffer). */
  consumeDecayEvents(): string[] {
    const events = [...this.state.decayEvents];
    this.state.decayEvents = [];
    return events;
  }

  private _checkWinCondition() {
    if (this.state.result !== 'pending') return;
    if (this.state.enemy.health <= 0) {
      this.state.result = 'win';
      this.state.phase  = 'battle_end';
      this._log('Player WINS!');
    } else if (this.state.player.health <= 0) {
      this.state.result = 'lose';
      this.state.phase  = 'battle_end';
      this._log('Player LOSES!');
    }
  }

  private _log(msg: string) {
    this.state.log.push(msg);
    if (this.state.log.length > 50) this.state.log.shift();
  }

  // Generate 3 random reward cards from enemy deck, with mods based on difficulty
  getRewardChoices(): Card[] {
    const profile = ENEMIES[this.state.enemyProfileId];
    const difficulty = profile?.difficulty ?? 1;
    const isBoss = profile?.isBoss ?? false;

    const enemyCards = [
      ...this.state.enemy.discard,
      ...this.state.enemy.deck,
    ];
    const unique: Card[] = [];
    const seen = new Set<string>();
    for (const c of enemyCards) {
      if (!seen.has(c.id)) { seen.add(c.id); unique.push(c); }
    }
    const shuffled = shuffle(unique);
    return shuffled.slice(0, 3).map((c) => {
      const modCount = modCountForDifficulty(difficulty, isBoss);
      return generateModdedCard(c, modCount);
    });
  }

  // Roll a crafting item drop for this battle's rewards
  getCraftingDrop(): CraftingItemId | null {
    const profile = ENEMIES[this.state.enemyProfileId];
    const isBoss = profile?.isBoss ?? false;
    return rollCraftingDrop(isBoss);
  }
}

export interface AttackEvent {
  type: 'combat' | 'direct';
  target: 'agent' | 'player';
  attacker: CardInPlay;
  blocker?: CardInPlay;      // defender agent (when target='agent')
  attackerDmg?: number;
  blockerDmg?: number;
  damage?: number;           // effective damage dealt (when target='player')
  damageAbsorbed?: number;   // damage absorbed by shield
}
