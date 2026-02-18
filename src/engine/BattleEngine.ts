import type { Card, CardInPlay } from '@/types/card';
import type { CraftingItemId } from '@/types/game';
import { generateModdedCard, modCountForDifficulty } from '@/utils/cardMods';
import { ENEMIES } from '@/data/enemies';
import { rollCraftingDrop } from '@/data/craftingItems';
import { MOD_MAP } from '@/data/mods';

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
  };
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
}

// ── BattleEngine ──────────────────────────────────────────────────────────────

export class BattleEngine {
  private state: BattleState;

  constructor(playerDeck: Card[], enemyDeck: Card[], enemyProfileId: string, enemyHealth = 20) {
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
    };

    // Draw opening hands (4 cards each)
    this._drawCards(this.state.player, 4);
    this._drawCards(this.state.enemy, 4);
  }

  getState(): BattleState { return this.state; }

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
    combatant.currentDataCells = combatant.maxDataCells;

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
    }

    // Mark all as NOT summoned this turn (so they can attack if they have overclock)
    // Actually: summoned last turn can attack — but agents summoned THIS turn cannot
    // unless they have overclock. We set summonedThisTurn=false at start of turn
    for (const c of combatant.field) c.summonedThisTurn = false;

    // Draw 1
    this._drawCards(combatant, 1);

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
      combatant.field.push(inPlay);
      // Augmented mod: bonus defense on entry
      const shieldBonus = getShieldValue(inPlay);
      if (shieldBonus > 0) {
        inPlay.currentDefense += shieldBonus;
        this._log(`${inPlay.card.name} enters with +${shieldBonus} Shield`);
      }
      // Entry effects
      this._resolveEntryEffect(inPlay, combatant, opponent, targetInstanceId);
      this._log(`${side} plays Agent: ${inPlay.card.name}`);

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

      // ── Forked: re-launch effect on random additional targets ──
      if (forkedEfficacy > 0 && opponent.field.length > 0) {
        const forkedDmg = Math.max(1, Math.floor(dmg * forkedEfficacy / 100));
        const forkTarget = opponent.field[Math.floor(Math.random() * opponent.field.length)];
        if (forkTarget && forkTarget.currentDefense > 0) {
          this._dealDamageToAgent(forkTarget, opponent, forkedDmg);
          totalDamageDealt += forkedDmg;
          this._log(`Forked: ${forkTarget.card.name} takes ${forkedDmg} damage`);
        }
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
      owner.health = Math.min(owner.maxHealth, owner.health + (effect.value ?? 0));
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
      if (trap.card.triggerCondition === trigger) {
        trapOwner.traps.splice(i, 1);
        trapOwner.discard.push(trap.card);
        // Resolve trap effect
        const effect = trap.card.effect;
        if (!effect) continue;
        if (effect.type === 'damage') {
          if (trigger === 'on_play_agent') {
            this._dealDamageToAgent(triggeringCard,
              trapOwner === this.state.player ? this.state.enemy : this.state.player,
              effect.value ?? 0
            );
          }
        } else if (effect.type === 'counter') {
          // Cancel the triggering script — remove from field/discard
          const opp = trapOwner === this.state.player ? this.state.enemy : this.state.player;
          opp.discard.pop(); // remove the just-played script
          this._log(`Trap: ${trap.card.name} countered ${triggeringCard.card.name}!`);
        }
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

    attacker.tapped = true;

    // Both deal damage simultaneously
    const attackerDmg = attacker.currentAttack;
    const defenderDmg = defender.currentAttack;

    const attackerArmor = attacker.card.keywords?.find((k) => k.keyword === 'armor')?.value ?? 0;
    const defenderArmor = defender.card.keywords?.find((k) => k.keyword === 'armor')?.value ?? 0;

    this._dealDamageToAgent(defender, enemy,  Math.max(0, attackerDmg - defenderArmor), attacker, player);
    this._dealDamageToAgent(attacker, player, Math.max(0, defenderDmg - attackerArmor));

    // Corrode: v1 = ATK reduction, v2 = DEF reduction
    const corrode = getCorrodeValues(attacker);
    if (corrode.v1 > 0 || corrode.v2 > 0) {
      const stillAlive = enemy.field.find((c) => c.instanceId === defender.instanceId);
      if (stillAlive) {
        stillAlive.currentAttack  = Math.max(0, stillAlive.currentAttack  - corrode.v1);
        stillAlive.currentDefense = Math.max(1, stillAlive.currentDefense - corrode.v2);
      }
    }

    this._log(`${attacker.card.name} attacks ${defender.card.name}`);
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

    for (const attacker of [...enemy.field]) {
      if (attacker.card.type !== 'agent' || attacker.tapped || attacker.summonedThisTurn) continue;
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

      // Find player agent attacker can kill (profitable trade)
      const killTarget = canAttack.find(
        (c) => c.currentDefense <= attacker.currentAttack && c.currentAttack < attacker.currentDefense
      );
      // Otherwise any agent it can destroy
      const anyKill = canAttack.find((c) => c.currentDefense <= attacker.currentAttack);
      const target = killTarget ?? anyKill ?? null;

      if (target) {
        // Agent vs agent
        const attackerDmg = attacker.currentAttack;
        const defenderDmg = target.currentAttack;
        const attackerArmor = attacker.card.keywords?.find((k) => k.keyword === 'armor')?.value ?? 0;
        const defenderArmor = target.card.keywords?.find((k) => k.keyword === 'armor')?.value  ?? 0;
        this._dealDamageToAgent(target,   player, Math.max(0, attackerDmg - defenderArmor), attacker, enemy);
        this._dealDamageToAgent(attacker, enemy,  Math.max(0, defenderDmg - attackerArmor));
        const corrode = getCorrodeValues(attacker);
        if (corrode.v1 > 0 || corrode.v2 > 0) {
          const stillAlive = player.field.find((c) => c.instanceId === target.instanceId);
          if (stillAlive) {
            stillAlive.currentAttack  = Math.max(0, stillAlive.currentAttack  - corrode.v1);
            stillAlive.currentDefense = Math.max(1, stillAlive.currentDefense - corrode.v2);
          }
        }
        events.push({ type: 'combat', attacker, blocker: target, attackerDmg, blockerDmg: defenderDmg, target: 'agent' });
      } else {
        // Attack player directly — shield reduces damage, breach bypasses
        const shield = this.calculateShield('player');
        const breach = getBreachValue(attacker);
        const shieldedDmg = Math.max(0, attacker.currentAttack - shield);
        const effectiveDmg = shieldedDmg + breach;
        player.health -= effectiveDmg;
        events.push({ type: 'direct', attacker, damage: effectiveDmg, damageAbsorbed: attacker.currentAttack - shieldedDmg, target: 'player' });
        this._log(`Enemy ${attacker.card.name} attacks player: ${attacker.currentAttack} - ${shield} shield + ${breach} breach = ${effectiveDmg}`);
        const drainPct = getDrainPercent(attacker);
        if (drainPct > 0 && effectiveDmg > 0) {
          const healed = Math.ceil(effectiveDmg * drainPct / 100);
          enemy.health = Math.min(enemy.maxHealth, enemy.health + healed);
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
    for (let i = 0; i < count; i++) {
      if (combatant.deck.length === 0) {
        combatant.fatigue++;
        combatant.health -= combatant.fatigue;
        this._log(`Fatigue! Taking ${combatant.fatigue} damage.`);
      } else {
        const card = combatant.deck.shift()!;
        combatant.hand.push(makeInstance(card));
      }
    }
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
