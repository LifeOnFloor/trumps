export type ChipPreset = 'casual' | 'standard' | 'high_roller' | 'survival_debt';
export type AnteType = 'none' | 'fixed' | 'escalating';
export type BankruptcyRule = 'bust_game_over' | 'allow_debt'; // 破産即脱落 vs 黒棒借金OK

export interface CommonChipConfig {
  chipsMode: boolean;
  preset?: ChipPreset | 'custom';
  initialChips: number;
  anteType: AnteType;
  baseAnte: number;
  escalationStep?: number; // 漸増時の増分 (例: +50 / round)
  bankruptcyRule: BankruptcyRule;
}

export interface ChipPresetDefinition {
  readonly id: ChipPreset;
  readonly title: string;
  readonly desc: string;
  readonly icon: string;
  readonly config: Omit<CommonChipConfig, 'chipsMode' | 'preset'>;
}

export const CHIP_PRESETS: Record<ChipPreset, ChipPresetDefinition> = {
  casual: {
    id: 'casual',
    title: 'カジュアル',
    desc: '低レート・借金OKで気軽に遊べる（初期: 1,000 / アンティなし）',
    icon: '☕',
    config: {
      initialChips: 1000,
      anteType: 'none',
      baseAnte: 0,
      escalationStep: 0,
      bankruptcyRule: 'allow_debt',
    },
  },
  standard: {
    id: 'standard',
    title: 'スタンダード (カジノ)',
    desc: '王道のポット配分・破産脱落あり（初期: 1,000 / アンティ: 50）',
    icon: '🎰',
    config: {
      initialChips: 1000,
      anteType: 'fixed',
      baseAnte: 50,
      escalationStep: 0,
      bankruptcyRule: 'bust_game_over',
    },
  },
  high_roller: {
    id: 'high_roller',
    title: 'ハイローラー (激闘)',
    desc: 'ラウンド毎にアンティが漸増（初期: 5,000 / アンティ: 50〜+50/R）',
    icon: '🔥',
    config: {
      initialChips: 5000,
      anteType: 'escalating',
      baseAnte: 50,
      escalationStep: 50,
      bankruptcyRule: 'bust_game_over',
    },
  },
  survival_debt: {
    id: 'survival_debt',
    title: '競技サバイバル (麻雀風)',
    desc: '高額点棒・借金OK、トビ終了（初期: 10,000 / アンティ: 100）',
    icon: '🀄',
    config: {
      initialChips: 10000,
      anteType: 'fixed',
      baseAnte: 100,
      escalationStep: 0,
      bankruptcyRule: 'allow_debt',
    },
  },
};

/**
 * Pure function to calculate current round ante amount based on anteType and round index.
 */
export function calculateAnte(config: CommonChipConfig, roundIndex: number = 0): number {
  if (config.anteType === 'none') {
    return 0;
  }
  if (config.anteType === 'fixed') {
    return config.baseAnte ?? 0;
  }
  if (config.anteType === 'escalating') {
    const base = config.baseAnte ?? 0;
    const step = config.escalationStep ?? 50;
    return base + step * roundIndex;
  }
  return 0;
}
