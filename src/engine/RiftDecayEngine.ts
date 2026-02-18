// ── Rift Decay Engine ─────────────────────────────────────────────────────────
// Manages the decay timer and stage progression during zone exploration.
// Stages 0–5: Stable → Flickering → Unstable → Fracturing → Collapsing → Void Breach

export interface DecayStageInfo {
  index: number;
  name: string;
  color: string;
  spawnMultiplier: number;  // enemy count multiplier
  statMultiplier: number;   // enemy ATK/DEF multiplier
}

const STAGE_INFO: DecayStageInfo[] = [
  { index: 0, name: 'STABLE',      color: '#44cc44', spawnMultiplier: 1.0, statMultiplier: 1.0 },
  { index: 1, name: 'FLICKERING',  color: '#88cc44', spawnMultiplier: 1.0, statMultiplier: 1.0 },
  { index: 2, name: 'UNSTABLE',    color: '#cccc00', spawnMultiplier: 1.5, statMultiplier: 1.1 },
  { index: 3, name: 'FRACTURING',  color: '#ff8c00', spawnMultiplier: 2.0, statMultiplier: 1.2 },
  { index: 4, name: 'COLLAPSING',  color: '#ff4444', spawnMultiplier: 3.0, statMultiplier: 1.4 },
  { index: 5, name: 'VOID BREACH', color: '#cc00ff', spawnMultiplier: 4.0, statMultiplier: 1.6 },
];

// Base thresholds in seconds (before compression)
const BASE_THRESHOLDS_S = [0, 120, 240, 420, 600, 900];

export class RiftDecayEngine {
  private elapsedMs = 0;
  private currentStage = 0;
  private thresholdsMs: number[];
  private onStageChange?: (stage: number) => void;

  constructor(riftLevel: number, onStageChange?: (stage: number) => void) {
    // Higher rift levels compress the timeline (min 30% of base)
    const factor = Math.max(0.3, 1 - riftLevel * 0.01);
    this.thresholdsMs = BASE_THRESHOLDS_S.map((s) => Math.round(s * factor * 1000));
    this.onStageChange = onStageChange;
  }

  /** Call every frame with deltaMs from requestAnimationFrame. */
  tick(deltaMs: number): void {
    this.elapsedMs += deltaMs;

    // Check for stage advancement
    for (let i = STAGE_INFO.length - 1; i > this.currentStage; i--) {
      if (this.elapsedMs >= this.thresholdsMs[i]) {
        const prevStage = this.currentStage;
        this.currentStage = i;
        if (prevStage !== i) {
          this.onStageChange?.(i);
        }
        break;
      }
    }
  }

  getCurrentStage(): number {
    return this.currentStage;
  }

  getStageInfo(): DecayStageInfo {
    return STAGE_INFO[this.currentStage];
  }

  getElapsedMs(): number {
    return this.elapsedMs;
  }

  /** Progress within the current stage (0–1). */
  getStageProgress(): number {
    const nextThreshold = this.thresholdsMs[this.currentStage + 1];
    if (!nextThreshold) return 1; // at max stage
    const currentThreshold = this.thresholdsMs[this.currentStage];
    const elapsed = this.elapsedMs - currentThreshold;
    const total = nextThreshold - currentThreshold;
    return Math.min(1, elapsed / total);
  }

  /** Time until next stage in ms. */
  getTimeToNextStage(): number {
    const nextThreshold = this.thresholdsMs[this.currentStage + 1];
    if (!nextThreshold) return 0;
    return Math.max(0, nextThreshold - this.elapsedMs);
  }

  /** Restore from saved state. */
  restore(elapsedMs: number, stage: number): void {
    this.elapsedMs = elapsedMs;
    this.currentStage = stage;
  }

  static getStageInfo(stage: number): DecayStageInfo {
    return STAGE_INFO[Math.min(stage, STAGE_INFO.length - 1)];
  }

  static readonly STAGE_COUNT = STAGE_INFO.length;
}
