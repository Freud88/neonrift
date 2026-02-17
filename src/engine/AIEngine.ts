import type { BattleEngine } from './BattleEngine';
import type { CardInPlay } from '@/types/card';
import type { AIType } from '@/types/enemy';

// ── AI decision engine ────────────────────────────────────────────────────────

export class AIEngine {
  private engine: BattleEngine;
  private aiType: AIType;

  constructor(engine: BattleEngine, aiType: AIType) {
    this.engine = engine;
    this.aiType = aiType;
  }

  // Run a full enemy turn: play cards, then attack
  runEnemyTurn(): void {
    this._playPhase();
    this._attackPhase();
    this.engine.resolveEnemyAttacks();
  }

  // ── Play phase ────────────────────────────────────────────────────────────

  private _playPhase() {
    const state   = this.engine.getState();
    const enemy   = state.enemy;
    const player  = state.player;

    // Loop until no more cards can be played
    let played = true;
    while (played && enemy.currentDataCells > 0) {
      played = false;

      // Sort hand by priority
      const playable = enemy.hand.filter((c) =>
        this.engine.canPlay('enemy', c.instanceId)
      );

      if (playable.length === 0) break;

      const chosen = this._chooseBestPlay(playable, enemy, player);
      if (!chosen) break;

      // Pick target for scripts/agents with entry effects
      let targetId: string | undefined;
      if (chosen.card.effect?.target === 'any' && player.field.length > 0) {
        // Target the weakest enemy agent (most efficient damage)
        const weakest = player.field.reduce(
          (w, c) => c.currentDefense < w.currentDefense ? c : w,
          player.field[0]
        );
        targetId = weakest.instanceId;
      } else if (chosen.card.effect?.target === 'self' && enemy.field.length > 0) {
        // Buff the strongest agent
        const strongest = enemy.field
          .filter((c) => c.card.type === 'agent')
          .reduce((s, c) => c.currentAttack > s.currentAttack ? c : s, enemy.field[0]);
        targetId = strongest?.instanceId;
      } else if (chosen.card.effect?.target === 'enemy_agent' && player.field.length > 0) {
        const weakest = player.field.reduce(
          (w, c) => c.currentDefense < w.currentDefense ? c : w,
          player.field[0]
        );
        targetId = weakest.instanceId;
      }

      const success = this.engine.playCard('enemy', chosen.instanceId, targetId);
      if (success) played = true;
    }
  }

  private _chooseBestPlay(
    playable: CardInPlay[],
    enemy: { field: CardInPlay[]; health: number },
    player: { field: CardInPlay[]; health: number }
  ): CardInPlay | null {
    if (playable.length === 0) return null;

    if (this.aiType === 'aggressive' || this.aiType === 'boss') {
      // Prefer damage scripts, then high-attack agents
      const damageScripts = playable.filter(
        (c) => c.card.type === 'script' && c.card.effect?.type === 'damage'
      );
      if (damageScripts.length > 0) {
        return damageScripts.sort((a, b) =>
          (b.card.effect?.value ?? 0) - (a.card.effect?.value ?? 0)
        )[0];
      }
      // Highest cost agent
      const agents = playable.filter((c) => c.card.type === 'agent');
      if (agents.length > 0) {
        return agents.sort((a, b) => b.card.cost - a.card.cost)[0];
      }
    }

    if (this.aiType === 'defensive') {
      // Prefer high-defense agents, then healing/draw
      const agents = playable.filter((c) => c.card.type === 'agent');
      if (agents.length > 0) {
        return agents.sort((a, b) => (b.card.defense ?? 0) - (a.card.defense ?? 0))[0];
      }
      const heals = playable.filter(
        (c) => c.card.type === 'script' && c.card.effect?.type === 'heal'
      );
      if (heals.length > 0) return heals[0];
    }

    // basic AI: play highest cost affordable
    return playable.sort((a, b) => b.card.cost - a.card.cost)[0];
  }

  // ── Attack phase ──────────────────────────────────────────────────────────
  // (resolveEnemyAttacks handles the actual combat, this is just a hook)

  private _attackPhase() {
    // Enemy attacks are resolved in BattleEngine.resolveEnemyAttacks()
    // This method can set up special logic if needed (boss combos, etc.)
    void this;
  }
}
