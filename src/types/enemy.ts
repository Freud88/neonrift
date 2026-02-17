export type AIType = 'basic' | 'aggressive' | 'defensive' | 'boss';

export interface EnemyProfile {
  id: string;
  name: string;
  title: string;
  health: number;
  deck: string[];        // card IDs
  difficulty: 1 | 2 | 3;
  aiType: AIType;
  isBoss: boolean;
  spriteColor: string;   // CSS color for placeholder sprite
  rewards: {
    credits: number;
    xpGain: number;
  };
  dialogue: {
    preBattle: string;
    onWin: string;
    onLose: string;
  };
}
