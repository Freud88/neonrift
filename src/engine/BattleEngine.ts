import type { Card, CardInPlay } from '@/types/card';
import type { CraftingItemId } from '@/types/game';
import { generateModdedCard, modCountForDifficulty } from '@/utils/cardMods';
import { ENEMIES } from '@/data/enemies';
import { rollCraftingDrop } from '@/data/craftingItems';

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
      // Entry effects
      this._resolveEntryEffect(inPlay, combatant, opponent, targetInstanceId);
      this._log(`${side} plays Agent: ${inPlay.card.name}`);

      // Check traps
      this._checkTraps(opponent, inPlay, 'on_play_agent');

    } else if (type === 'script') {
      this._resolveScriptEffect(inPlay, combatant, opponent, targetInstanceId);
      combatant.discard.push(inPlay.card);
      this._log(`${side} plays Script: ${inPlay.card.name}`);

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

    if (effect.type === 'damage') {
      if (effect.target === 'any' && targetId) {
        const t = opponent.field.find((c) => c.instanceId === targetId);
        if (t) { this._dealDamageToAgent(t, opponent, effect.value ?? 0); }
        else   { opponent.health -= effect.value ?? 0; }
      } else if (effect.target === 'all_enemy_agents') {
        for (const t of [...opponent.field]) this._dealDamageToAgent(t, opponent, effect.value ?? 0);
      } else if (!targetId) {
        opponent.health -= effect.value ?? 0;
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

  // ── Combat ───────────────────────────────────────────────────────────────────

  declareAttacker(instanceId: string) {
    const attacker = this.state.player.field.find((c) => c.instanceId === instanceId);
    if (!attacker || attacker.card.type !== 'agent') return;
    if (attacker.tapped) return;
    if (attacker.summonedThisTurn && !attacker.card.keywords?.some((k) => k.keyword === 'overclock')) return;

    const already = this.state.attackers.indexOf(instanceId);
    if (already !== -1) {
      this.state.attackers.splice(already, 1);
    } else {
      this.state.attackers.push(instanceId);
    }
  }

  // Enemy AI calls this to block
  declareBlocker(attackerId: string, blockerId: string | null) {
    if (blockerId === null) {
      delete this.state.blockers[attackerId];
    } else {
      const blocker = this.state.enemy.field.find((c) => c.instanceId === blockerId);
      if (!blocker || blocker.card.type !== 'agent') return;
      if (blocker.stealthTurns > 0) return; // can't block stealth... wait, stealth is for attackers
      this.state.blockers[attackerId] = blockerId;
    }
  }

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
        // Combat: both deal damage simultaneously
        const attackerDmg = attacker.currentAttack;
        const blockerDmg  = blocker.currentAttack;

        // Armor reduction
        const attackerArmor = attacker.card.keywords?.find((k) => k.keyword === 'armor')?.value ?? 0;
        const blockerArmor  = blocker.card.keywords?.find((k) => k.keyword === 'armor')?.value  ?? 0;

        this._dealDamageToAgent(blocker,  enemy,  Math.max(0, attackerDmg - blockerArmor));
        this._dealDamageToAgent(attacker, player, Math.max(0, blockerDmg  - attackerArmor));

        events.push({ type: 'combat', attacker, blocker, attackerDmg, blockerDmg });
      } else {
        // Check stealth on attacker: already handled (stealth = can't be blocked)
        const dmg = attacker.currentAttack;
        enemy.health -= dmg;
        events.push({ type: 'direct', attacker, damage: dmg });
        this._log(`${attacker.card.name} deals ${dmg} direct damage!`);
      }
    }

    this.state.attackers = [];
    this.state.blockers  = {};
    this._checkWinCondition();
    return { events };
  }

  // Enemy attacks
  resolveEnemyAttacks(): { events: AttackEvent[] } {
    const events: AttackEvent[] = [];
    const enemy  = this.state.enemy;
    const player = this.state.player;

    for (const attacker of enemy.field) {
      if (attacker.card.type !== 'agent' || attacker.tapped || attacker.summonedThisTurn) continue;

      attacker.tapped = true;

      // Player can't choose blockers in MVP — AI chooses for player
      // Simple: find weakest player agent that can trade
      const canBlock = player.field.filter(
        (c) => c.card.type === 'agent' && !c.tapped && c.stealthTurns === 0
      );

      // Stealth check on attacker
      if (attacker.stealthTurns > 0) {
        // Can't be blocked
        player.health -= attacker.currentAttack;
        events.push({ type: 'direct', attacker, damage: attacker.currentAttack });
        continue;
      }

      const blocker = canBlock.length > 0
        ? canBlock.reduce((best, c) =>
            c.currentDefense < best.currentDefense ? c : best, canBlock[0])
        : null;

      if (blocker && player.field.length > 0) {
        // Blocker choice: only block if it survives or kills attacker
        const blockerSurvives = blocker.currentDefense > attacker.currentAttack;
        const attackerDies    = attacker.currentDefense <= blocker.currentAttack;
        if (blockerSurvives || attackerDies) {
          this._dealDamageToAgent(blocker, player, attacker.currentAttack);
          this._dealDamageToAgent(attacker, enemy, blocker.currentAttack);
          events.push({ type: 'combat', attacker, blocker, attackerDmg: attacker.currentAttack, blockerDmg: blocker.currentAttack });
        } else {
          // Don't block — take direct
          player.health -= attacker.currentAttack;
          events.push({ type: 'direct', attacker, damage: attacker.currentAttack });
        }
      } else {
        player.health -= attacker.currentAttack;
        events.push({ type: 'direct', attacker, damage: attacker.currentAttack });
        this._log(`Enemy ${attacker.card.name} deals ${attacker.currentAttack} direct!`);
      }
    }

    this._checkWinCondition();
    return { events };
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  private _dealDamageToAgent(
    target: CardInPlay,
    owner: CombatantState,
    amount: number
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
  attacker: CardInPlay;
  blocker?: CardInPlay;
  attackerDmg?: number;
  blockerDmg?: number;
  damage?: number;
}
