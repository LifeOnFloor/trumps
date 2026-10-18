export type GameCategory =
  | 'climbing'     // ゴーアウト・大富豪系
  | 'trickTaking'  // トリックテイキング系
  | 'casino'       // カジノ・ポーカー系
  | 'matching'     // ペア・ラミー系
  | 'solitaire'    // 1人用・ソリティア系
  | 'party';       // パーティー・スピード系

export interface GameMetadata {
  readonly id: string;
  readonly name: { readonly ja: string; readonly en: string };
  readonly subtitle: string;
  readonly category: GameCategory;
  readonly players: { readonly min: number; readonly max: number };
  readonly hasChips: boolean;
  readonly isPlayable: boolean;
  readonly tags: readonly string[];
  readonly description: { readonly ja: string; readonly en: string };
  readonly rulesSummary: { readonly ja: string; readonly en: string };
  readonly icon: string;
}

export interface CatalogFilterOptions {
  query?: string;
  category?: GameCategory | 'all';
  playerCount?: number | 'all';
  chipsOnly?: boolean;
  language?: 'ja' | 'en';
}
