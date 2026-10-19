import type { CommonChipConfig, ChipPreset, AnteType, BankruptcyRule } from '../../types/chips.js';

export type SuitLockType = 'none' | 'single' | 'double' | 'geki';
export type NineEffectType = 'none' | 'reverse' | 'revolution';

export interface DaifugoConfig extends Partial<CommonChipConfig> {
  eightCut: boolean;             // 8切り
  revolution: boolean;           // 革命（4枚出し / 4枚以上の階段出し）
  stairs: boolean;               // 階段（3枚以上の連続スート出し）
  spadeThreeReturn: boolean;     // スペ3返し（ジョーカー単騎に対して♠3を出せる）
  suitLock: SuitLockType;        // 縛り: なし / 片縛り / 両縛り / 激縛り
  sequenceLock: boolean;         // 数字縛り（連番縛り）
  nineEffect: NineEffectType;    // 9の効果: なし / 9リバース / 9革命
  elevenBack: boolean;           // 11バック（イレブンバック: 場が流れるまで一時的革命）
  fiveSkip: boolean;             // 5スキップ（5の枚数分ターンを飛ばす）
  sevenPass: boolean;            // 7渡し（7の枚数分カードを次のプレイヤーへ）
  tenDiscard: boolean;           // 10捨て（10の枚数分カードを捨てる）
  sandstorm: boolean;            // 砂嵐（3の3枚出しで即時革命/最強役）
  miyakoOchi: boolean;           // 都落ち（前大富豪が1位になれなかったら即大貧民）
  gekokujo: boolean;             // 下剋上（大貧民が1位になったら階級完全逆転）
  cardExchange: boolean;         // 階級カード交換（税金）
  prohibitedEndings: {
    joker: boolean;              // ジョーカー上がり禁止（反則負け）
    eight: boolean;              // 8上がり禁止
    two: boolean;                // 2上がり禁止（通常時）
    three: boolean;              // 3上がり禁止（革命時）
  };
  chipsMode?: boolean;           // チップ対戦モード
  preset?: ChipPreset | 'custom';// テンプレプリセット
  initialChips?: number;         // 初期チップ数
  anteType?: AnteType;           // アンティ方式: なし / 固定 / 漸増
  baseAnte?: number;             // 基準アンティ
  escalationStep?: number;       // 漸増時の増分
  bankruptcyRule?: BankruptcyRule; // 破産ルール: 破産脱落 / 借金OK
  chipSettlementType?: 'ranking_transfer' | 'pot_split'; // 精算方式: 順位間移動 / ポット配分
  ante?: number;                 // アンティ（レガシー後方互換）
  transferRate?: number;         // 基準移動レート（定額時）
}

export const DEFAULT_DAIFUGO_CONFIG: DaifugoConfig = {
  eightCut: true,
  revolution: true,
  stairs: true,
  spadeThreeReturn: true,
  suitLock: 'single',
  sequenceLock: false,
  nineEffect: 'none',
  elevenBack: false,
  fiveSkip: false,
  sevenPass: false,
  tenDiscard: false,
  sandstorm: false,
  miyakoOchi: false,
  gekokujo: false,
  cardExchange: false,
  prohibitedEndings: {
    joker: true,
    eight: true,
    two: true,
    three: true,
  },
  chipsMode: false,
  preset: 'standard',
  initialChips: 1000,
  anteType: 'none',
  baseAnte: 0,
  escalationStep: 50,
  bankruptcyRule: 'bust_game_over',
  chipSettlementType: 'ranking_transfer',
  ante: 0,
  transferRate: 100,
};

export function resolveRuleConflicts(config: DaifugoConfig): DaifugoConfig {
  const validSuitLocks: SuitLockType[] = ['none', 'single', 'double', 'geki'];
  const validNineEffects: NineEffectType[] = ['none', 'reverse', 'revolution'];

  const suitLock = validSuitLocks.includes(config.suitLock) ? config.suitLock : 'none';
  const nineEffect = validNineEffects.includes(config.nineEffect) ? config.nineEffect : 'none';

  return {
    ...config,
    suitLock,
    nineEffect,
    prohibitedEndings: {
      ...config.prohibitedEndings,
    },
  };
}
