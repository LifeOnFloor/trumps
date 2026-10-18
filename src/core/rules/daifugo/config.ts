export interface DaifugoConfig {
  eightCut: boolean;           // 8切り
  revolution: boolean;         // 革命（4枚出し / 4枚以上の階段出し）
  stairs: boolean;             // 階段（3枚以上の連続スート出し）
  spadeThreeReturn: boolean;   // スペ3返し（ジョーカー単騎に対して♠3を出せる）
  suitLock: 'none' | 'single'; // 縛り（直前と同スートで縛り発生）
  prohibitedEndings: {
    joker: boolean;            // ジョーカー上がり禁止（反則負け）
    eight: boolean;            // 8上がり禁止
    two: boolean;              // 2上がり禁止（通常時）
    three: boolean;            // 3上がり禁止（革命時）
  };
  chipsMode?: boolean;         // チップ対戦モード
  initialChips?: number;       // 初期チップ数
}

export const DEFAULT_DAIFUGO_CONFIG: DaifugoConfig = {
  eightCut: true,
  revolution: true,
  stairs: true,
  spadeThreeReturn: true,
  suitLock: 'single',
  prohibitedEndings: {
    joker: true,
    eight: true,
    two: true,
    three: true,
  },
  chipsMode: false,
  initialChips: 1000,
};
