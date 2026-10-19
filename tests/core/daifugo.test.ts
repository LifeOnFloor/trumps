import { describe, it, expect } from 'vitest';
import { DaifugoPlugin } from '../../src/core/rules/daifugo/index.js';
import type { Card, RegularCard, JokerCard } from '../../src/core/types/card.js';
import type { BaseGameContext } from '../../src/core/types/engine.js';
import type { DaifugoRuleState } from '../../src/core/rules/daifugo/types.js';
import { DEFAULT_DAIFUGO_CONFIG } from '../../src/core/rules/daifugo/config.js';

function card(id: string): Card {
  if (id.startsWith('JOKER')) {
    return { id, isJoker: true } as JokerCard;
  }
  const [suitPrefix, rankStr] = id.split('_');
  const suitMap: Record<string, 'spade' | 'heart' | 'diamond' | 'club'> = {
    S: 'spade',
    H: 'heart',
    D: 'diamond',
    C: 'club',
  };
  const suit = suitMap[suitPrefix!]!;
  const rank = parseInt(rankStr!, 10) as any;
  return { id, isJoker: false, suit, rank } as RegularCard;
}

function createCustomGame(
  playersHandMap: Record<string, string[]>,
  configPartial = {},
  options?: { isRevolution?: boolean; turnPlayerId?: string }
) {
  const plugin = new DaifugoPlugin();
  const initialPlayerIds = Object.keys(playersHandMap);
  const playerIds = [...initialPlayerIds];
  while (playerIds.length < 3) {
    playerIds.push(`dummy_${playerIds.length + 1}`);
  }
  const players = playerIds.map((id) => ({ id, name: `Player ${id}` }));
  const initial = plugin.init(players, configPartial);

  const customPlayers = initial.context.players.map((p) => ({
    ...p,
    hand: (playersHandMap[p.id] ?? []).map(card),
  }));

  const context: BaseGameContext = {
    ...initial.context,
    players: customPlayers,
    currentTurnPlayerId: options?.turnPlayerId ?? initialPlayerIds[0]!,
  };

  const ruleState: DaifugoRuleState = {
    ...initial.ruleState,
    isRevolution: options?.isRevolution ?? false,
  };

  return { plugin, context, ruleState };
}

describe('DaifugoPlugin', () => {
  describe('1. 配布と基本進行', () => {
    it('3〜4人プレイ時、53枚が均等配分されること', () => {
      const plugin = new DaifugoPlugin();
      const { context } = plugin.init([
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' },
        { id: 'p3', name: 'Player 3' },
      ]);

      const totalCards = context.players.reduce((sum, p) => sum + p.hand.length, 0);
      expect(totalCards).toBe(53);
      const handCounts = context.players.map((p) => p.hand.length).sort();
      expect(handCounts).toEqual([17, 18, 18]);
      const jokers = context.players.flatMap((p) => p.hand).filter((c) => c.isJoker);
      expect(jokers).toHaveLength(1);
    });

    it('単騎、ペア、階段（3枚以上）が認識され、弱いカードの提出が弾かれること', () => {
      const { plugin, context, ruleState } = createCustomGame({
        p1: ['S_3', 'H_3', 'D_3', 'S_4', 'S_5'],
        p2: ['S_5', 'H_5', 'S_9', 'S_10', 'S_11'],
        p3: ['S_2'],
      });

      // 単騎: p1 plays S_3
      expect(plugin.canExecute(context, ruleState, 'p1', { type: 'PLAY', cardIds: ['S_3'] })).toBe(true);
      const res1 = plugin.execute(context, ruleState, 'p1', { type: 'PLAY', cardIds: ['S_3'] });

      // p2 tries to play weaker or equal card (S_3) -> invalid
      // p2 plays S_5 -> valid
      expect(plugin.canExecute(res1.nextContext, res1.nextRuleState, 'p2', { type: 'PLAY', cardIds: ['S_5'] })).toBe(true);

      // Pair test
      const { plugin: pairPlugin, context: pairCtx, ruleState: pairRule } = createCustomGame({
        p1: ['S_3', 'H_3'],
        p2: ['S_4', 'H_4'],
      });
      const pairRes1 = pairPlugin.execute(pairCtx, pairRule, 'p1', { type: 'PLAY', cardIds: ['S_3', 'H_3'] });
      // p2 plays higher pair: S_4, H_4 -> valid
      expect(pairPlugin.canExecute(pairRes1.nextContext, pairRes1.nextRuleState, 'p2', { type: 'PLAY', cardIds: ['S_4', 'H_4'] })).toBe(true);

      // Stairs test
      const { plugin: stairPlugin, context: stairCtx, ruleState: stairRule } = createCustomGame({
        p1: ['S_3', 'S_4', 'S_5'],
        p2: ['S_6', 'S_7', 'S_8'],
      });
      const stairRes1 = stairPlugin.execute(stairCtx, stairRule, 'p1', { type: 'PLAY', cardIds: ['S_3', 'S_4', 'S_5'] });
      expect(stairPlugin.canExecute(stairRes1.nextContext, stairRes1.nextRuleState, 'p2', { type: 'PLAY', cardIds: ['S_6', 'S_7', 'S_8'] })).toBe(true);
    });

    it('全員パスで場が流れ、最後のプレイヤーから親として自由に出せること', () => {
      const { plugin, context, ruleState } = createCustomGame({
        p1: ['S_3', 'S_10'],
        p2: ['S_5'],
        p3: ['S_7'],
      });

      // p1 plays S_3
      const s1 = plugin.execute(context, ruleState, 'p1', { type: 'PLAY', cardIds: ['S_3'] });
      // p2 passes
      expect(plugin.canExecute(s1.nextContext, s1.nextRuleState, 'p2', { type: 'PASS' })).toBe(true);
      const s2 = plugin.execute(s1.nextContext, s1.nextRuleState, 'p2', { type: 'PASS' });
      // p3 passes -> table clears, turn goes back to p1
      const s3 = plugin.execute(s2.nextContext, s2.nextRuleState, 'p3', { type: 'PASS' });

      expect(s3.nextRuleState.table.lastPlay).toBeNull();
      expect(s3.nextContext.currentTurnPlayerId).toBe('p1');
      // p1 can now play freely
      expect(plugin.canExecute(s3.nextContext, s3.nextRuleState, 'p1', { type: 'PLAY', cardIds: ['S_10'] })).toBe(true);
    });
  });

  describe('2. 8切り（eightCut）', () => {
    it('true: 8が出された瞬間に場が流れ、出し手のターンが継続すること', () => {
      const { plugin, context, ruleState } = createCustomGame(
        {
          p1: ['S_8', 'S_10'],
          p2: ['S_9'],
        },
        { eightCut: true }
      );

      const res = plugin.execute(context, ruleState, 'p1', { type: 'PLAY', cardIds: ['S_8'] });
      expect(res.nextRuleState.table.lastPlay).toBeNull();
      expect(res.nextContext.currentTurnPlayerId).toBe('p1');
      expect(res.events.some((e) => e.type === 'EIGHT_CUT')).toBe(true);
    });

    it('false: 8を出しても場は流れず、通常の強さ比較のまま次のプレイヤーへ手番が移ること', () => {
      const { plugin, context, ruleState } = createCustomGame(
        {
          p1: ['S_8', 'S_10'],
          p2: ['S_9'],
        },
        { eightCut: false }
      );

      const res = plugin.execute(context, ruleState, 'p1', { type: 'PLAY', cardIds: ['S_8'] });
      expect(res.nextRuleState.table.lastPlay).not.toBeNull();
      expect(res.nextContext.currentTurnPlayerId).toBe('p2');
      expect(res.events.some((e) => e.type === 'EIGHT_CUT')).toBe(false);
    });
  });

  describe('3. 革命（revolution）', () => {
    it('true: 4枚出しで isRevolution が反転し、カードの強さが 3 > 4 > ... > 2 に逆転すること', () => {
      const { plugin, context, ruleState } = createCustomGame(
        {
          p1: ['S_5', 'H_5', 'D_5', 'C_5'],
          p2: ['S_3', 'H_3', 'D_3', 'C_3'],
          p3: ['S_2', 'H_2', 'D_2', 'C_2'],
        },
        { revolution: true }
      );

      const res = plugin.execute(context, ruleState, 'p1', {
        type: 'PLAY',
        cardIds: ['S_5', 'H_5', 'D_5', 'C_5'],
      });
      expect(res.nextRuleState.isRevolution).toBe(true);

      // Now under revolution: 3 is stronger than 5, but 2 is weaker than 5
      // p2 plays 3s (stronger than 5 under revolution) -> valid
      expect(
        plugin.canExecute(res.nextContext, res.nextRuleState, 'p2', {
          type: 'PLAY',
          cardIds: ['S_3', 'H_3', 'D_3', 'C_3'],
        })
      ).toBe(true);

      // p3 plays 2s (weaker than 5 under revolution) -> invalid
      expect(
        plugin.canExecute(res.nextContext, res.nextRuleState, 'p3', {
          type: 'PLAY',
          cardIds: ['S_2', 'H_2', 'D_2', 'C_2'],
        })
      ).toBe(false);
    });

    it('false: 4枚出しを行っても強さが反転しないこと', () => {
      const { plugin, context, ruleState } = createCustomGame(
        {
          p1: ['S_5', 'H_5', 'D_5', 'C_5'],
          p2: ['S_3', 'H_3', 'D_3', 'C_3'],
        },
        { revolution: false }
      );

      const res = plugin.execute(context, ruleState, 'p1', {
        type: 'PLAY',
        cardIds: ['S_5', 'H_5', 'D_5', 'C_5'],
      });
      expect(res.nextRuleState.isRevolution).toBe(false);

      // Without revolution, 3 is weaker than 5 -> p2 cannot play
      expect(
        plugin.canExecute(res.nextContext, res.nextRuleState, 'p2', {
          type: 'PLAY',
          cardIds: ['S_3', 'H_3', 'D_3', 'C_3'],
        })
      ).toBe(false);
    });
  });

  describe('4. スペ3返し（spadeThreeReturn）', () => {
    it('true: ジョーカー単騎に対して♠3を出して場を流せること', () => {
      const { plugin, context, ruleState } = createCustomGame(
        {
          p1: ['JOKER_1'],
          p2: ['S_3', 'H_4'],
        },
        { spadeThreeReturn: true }
      );

      const res1 = plugin.execute(context, ruleState, 'p1', { type: 'PLAY', cardIds: ['JOKER_1'] });
      // p2 can play S_3 against JOKER_1
      expect(
        plugin.canExecute(res1.nextContext, res1.nextRuleState, 'p2', {
          type: 'PLAY',
          cardIds: ['S_3'],
        })
      ).toBe(true);

      const res2 = plugin.execute(res1.nextContext, res1.nextRuleState, 'p2', {
        type: 'PLAY',
        cardIds: ['S_3'],
      });
      // Table is cleared and turn stays with p2
      expect(res2.nextRuleState.table.lastPlay).toBeNull();
      expect(res2.nextContext.currentTurnPlayerId).toBe('p2');
      expect(res2.events.some((e) => e.type === 'SPADE_THREE_RETURN')).toBe(true);
    });

    it('false: ジョーカー単騎に対して♠3を出そうとしてもバリデーションエラーになること', () => {
      const { plugin, context, ruleState } = createCustomGame(
        {
          p1: ['JOKER_1'],
          p2: ['S_3'],
        },
        { spadeThreeReturn: false }
      );

      const res1 = plugin.execute(context, ruleState, 'p1', { type: 'PLAY', cardIds: ['JOKER_1'] });
      // S_3 is weaker than JOKER and spadeThreeReturn is false -> cannot execute
      expect(
        plugin.canExecute(res1.nextContext, res1.nextRuleState, 'p2', {
          type: 'PLAY',
          cardIds: ['S_3'],
        })
      ).toBe(false);
    });
  });

  describe('5. 禁止上がり（prohibitedEndings.joker）', () => {
    it('true: 最後の手札がジョーカー単騎の場合は反則負け（最下位確定）となること', () => {
      const { plugin, context, ruleState } = createCustomGame(
        {
          p1: ['JOKER_1'],
          p2: ['S_4'],
          p3: ['S_5'],
        },
        { prohibitedEndings: { joker: true, eight: true, two: true, three: true } }
      );

      const res = plugin.execute(context, ruleState, 'p1', { type: 'PLAY', cardIds: ['JOKER_1'] });
      expect(res.nextRuleState.foulPlayerIds).toContain('p1');
      const p1State = res.nextContext.players.find((p) => p.id === 'p1');
      expect(p1State?.isFinished).toBe(true);
      expect(p1State?.rankPosition).toBeUndefined();
      expect(res.events.some((e) => e.type === 'FOUL_FINISH')).toBe(true);
    });

    it('false: ジョーカー単騎で上がっても正常に勝ち抜けとなること', () => {
      const { plugin, context, ruleState } = createCustomGame(
        {
          p1: ['JOKER_1'],
          p2: ['S_4'],
          p3: ['S_5'],
        },
        { prohibitedEndings: { joker: false, eight: false, two: false, three: false } }
      );

      const res = plugin.execute(context, ruleState, 'p1', { type: 'PLAY', cardIds: ['JOKER_1'] });
      expect(res.nextRuleState.foulPlayerIds).not.toContain('p1');
      expect(res.nextRuleState.rankings).toContain('p1');
      const p1State = res.nextContext.players.find((p) => p.id === 'p1');
      expect(p1State?.isFinished).toBe(true);
      expect(p1State?.rankPosition).toBe(1);
      expect(res.events.some((e) => e.type === 'PLAYER_FINISHED')).toBe(true);
    });
  });

  describe('6. 情報隠蔽（Sanitization）', () => {
    it('sanitizeForPlayer 実行時、他プレイヤーの手札配列が不可視化され、手札枚数情報のみが取得できること', () => {
      const plugin = new DaifugoPlugin();
      const { context, ruleState } = plugin.init([
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' },
      ]);

      const sanitizedForP1 = plugin.sanitizeForPlayer(context, ruleState, 'p1');

      // Viewer p1 has full hand
      const p1Sanitized = sanitizedForP1.context.players.find((p) => p.id === 'p1')!;
      expect(p1Sanitized.hand).toBeDefined();
      expect(p1Sanitized.hand?.length).toBe(p1Sanitized.handCount);

      // Other players' hands are obscured (undefined) but handCount is available
      const p2Sanitized = sanitizedForP1.context.players.find((p) => p.id === 'p2')!;
      expect(p2Sanitized.hand).toBeUndefined();
      expect(typeof p2Sanitized.handCount).toBe('number');
      expect(p2Sanitized.handCount).toBeGreaterThan(0);

      const p3Sanitized = sanitizedForP1.context.players.find((p) => p.id === 'p3')!;
      expect(p3Sanitized.hand).toBeUndefined();
      expect(typeof p3Sanitized.handCount).toBe('number');
      expect(p3Sanitized.handCount).toBeGreaterThan(0);
    });
  });

  describe('7. チップ対戦モード（chipsMode）', () => {
    it('chipsMode: true の場合、各プレイヤーに初期チップが付与され、ゲーム終了時に順位精算されること', () => {
      const { plugin, context, ruleState } = createCustomGame(
        {
          p1: ['S_3'],
          p2: ['S_4'],
          p3: ['S_5'],
        },
        { chipsMode: true, initialChips: 1000 }
      );

      expect(context.players[0]!.chips).toBe(1000);
      expect(context.players[1]!.chips).toBe(1000);

      // p1 plays S_3 and finishes (1st place)
      const res1 = plugin.execute(context, ruleState, 'p1', { type: 'PLAY', cardIds: ['S_3'] });
      // p2 plays S_4 and finishes (2nd place)
      const res2 = plugin.execute(res1.nextContext, res1.nextRuleState, 'p2', { type: 'PLAY', cardIds: ['S_4'] });

      // Game is over (only p3 remains, 3rd place)
      expect(res2.nextContext.isGameOver).toBe(true);
      const p1Final = res2.nextContext.players.find((p) => p.id === 'p1')!;
      const p3Final = res2.nextContext.players.find((p) => p.id === 'p3')!;
      // 1st place should gain chips, 3rd place should lose chips
      expect(p1Final.chips).toBe(1200);
      expect(p3Final.chips).toBe(800);
    });
  });

  describe('8. 途中離脱・降伏（SURRENDER）', () => {
    it('4人ゲームでプレイヤーがSURRENDERを実行すると即座に脱落し、手番が次のプレイヤーへ安全に移行すること', () => {
      const { plugin, context, ruleState } = createCustomGame({
        p1: ['S_3', 'H_3'],
        p2: ['S_4'],
        p3: ['S_5'],
        p4: ['S_6'],
      });

      // p1 surrenders during their turn
      expect(plugin.canExecute(context, ruleState, 'p1', { type: 'SURRENDER' })).toBe(true);
      const res = plugin.execute(context, ruleState, 'p1', { type: 'SURRENDER' });

      const p1 = res.nextContext.players.find((p) => p.id === 'p1')!;
      expect(p1.isFinished).toBe(true);
      expect(p1.hand).toHaveLength(0);
      expect(res.nextRuleState.foulPlayerIds).toContain('p1');
      expect(res.events.some((e) => e.type === 'PLAYER_SURRENDERED')).toBe(true);

      // Remaining 3 players >= minPlayers, so game continues and turn moves to p2
      expect(res.nextContext.isGameOver).toBe(false);
      expect(res.nextContext.currentTurnPlayerId).toBe('p2');
    });

    it('3人ゲームで1人が脱落した場合、残り2人で大富豪が成立しないため即座にGAME_OVER（人数不足終了）となること', () => {
      const { plugin, context, ruleState } = createCustomGame({
        p1: ['S_3'],
        p2: ['S_4'],
        p3: ['S_5'],
      });

      // p1 surrenders -> only 2 players left (< minPlayers 3) -> Game Over!
      const res1 = plugin.execute(context, ruleState, 'p1', { type: 'SURRENDER' });
      expect(res1.nextContext.isGameOver).toBe(true);
      expect(res1.events.some((e) => e.type === 'GAME_OVER_INSUFFICIENT_PLAYERS')).toBe(true);
    });
  });
});
