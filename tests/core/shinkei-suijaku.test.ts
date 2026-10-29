import { describe, it, expect } from 'vitest';
import type { RegularCard } from '../../src/core/types/card.js';
import { ShinkeiSuijakuPlugin, DEFAULT_SHINKEI_SUIJAKU_CONFIG } from '../../src/core/rules/shinkei-suijaku/index.js';

describe('ShinkeiSuijaku (Concentration/Memory) Core Domain', () => {
  const plugin = new ShinkeiSuijakuPlugin();

  const createDeterministicCards = (): RegularCard[] => {
    const suits = ['spade', 'heart', 'diamond', 'club'] as const;
    const cards: RegularCard[] = [];
    for (let r = 1; r <= 13; r++) {
      for (const s of suits) {
        cards.push({ id: `${s}_${r}`, isJoker: false, suit: s, rank: r as any });
      }
    }
    return cards;
  };

  it('1人プレイおよび複数人（2〜6人）で正常に初期化できること', () => {
    const single = plugin.init([{ id: 'p1', name: 'Alice' }]);
    expect(single.context.players.length).toBe(1);
    expect(single.ruleState.cards.length).toBe(52);
    expect(single.context.currentTurnPlayerId).toBe('p1');
    expect(single.context.isGameOver).toBe(false);

    const multi = plugin.init([
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
      { id: 'p3', name: 'Charlie' },
    ]);
    expect(multi.context.players.length).toBe(3);
    expect(multi.context.currentTurnPlayerId).toBe('p1');
    expect(multi.ruleState.cards.every((c) => !c.isFlipped && !c.isTaken)).toBe(true);
  });

  it('プレイヤー数が範囲外（0人または7人以上）の場合は例外をスローすること', () => {
    expect(() => plugin.init([])).toThrow();
    expect(() =>
      plugin.init([
        { id: '1', name: '1' },
        { id: '2', name: '2' },
        { id: '3', name: '3' },
        { id: '4', name: '4' },
        { id: '5', name: '5' },
        { id: '6', name: '6' },
        { id: '7', name: '7' },
      ])
    ).toThrow();
  });

  it('1枚目をめくると表向きになり、firstFlippedIndex に記録されること', () => {
    const { context, ruleState } = plugin.init([{ id: 'p1', name: 'Alice' }]);
    const canFlip = plugin.canExecute(context, ruleState, 'p1', { type: 'FLIP', cardIndex: 5 });
    expect(canFlip).toBe(true);

    const result = plugin.execute(context, ruleState, 'p1', { type: 'FLIP', cardIndex: 5 });
    expect(result.nextRuleState.firstFlippedIndex).toBe(5);
    expect(result.nextRuleState.secondFlippedIndex).toBeNull();
    expect(result.nextRuleState.cards[5]?.isFlipped).toBe(true);
  });

  it('手番でないプレイヤーのめくり操作は拒否されること', () => {
    const { context, ruleState } = plugin.init([
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
    ]);
    expect(plugin.canExecute(context, ruleState, 'p2', { type: 'FLIP', cardIndex: 0 })).toBe(false);
  });

  it('同じカードを2回めくることはできないこと', () => {
    const { context, ruleState } = plugin.init([{ id: 'p1', name: 'Alice' }]);
    const step1 = plugin.execute(context, ruleState, 'p1', { type: 'FLIP', cardIndex: 0 });
    expect(plugin.canExecute(step1.nextContext, step1.nextRuleState, 'p1', { type: 'FLIP', cardIndex: 0 })).toBe(false);
  });

  it('同じランクの2枚をめくるとペア獲得となり、連続手番になること', () => {
    // カスタムデックでカード順を固定: 0と1が同じランク
    const customCards: RegularCard[] = [
      { id: 's7', isJoker: false, suit: 'spade', rank: 7 },
      { id: 'h7', isJoker: false, suit: 'heart', rank: 7 },
      ...createDeterministicCards().slice(2),
    ];
    const { context, ruleState } = plugin.init(
      [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      DEFAULT_SHINKEI_SUIJAKU_CONFIG,
      { customDeck: customCards }
    );

    const step1 = plugin.execute(context, ruleState, 'p1', { type: 'FLIP', cardIndex: 0 });
    const step2 = plugin.execute(step1.nextContext, step1.nextRuleState, 'p1', { type: 'FLIP', cardIndex: 1 });

    expect(step2.nextRuleState.cards[0]?.isTaken).toBe(true);
    expect(step2.nextRuleState.cards[1]?.isTaken).toBe(true);
    expect(step2.nextRuleState.playerScores['p1']).toBe(1);
    expect(step2.nextContext.currentTurnPlayerId).toBe('p1'); // 連続手番
    expect(step2.events.some((e) => e.type === 'MATCH_SUCCESS')).toBe(true);
  });

  it('異なるランクの2枚をめくるとミスとなり、NEXT_TURNで裏返って次手番へ移行すること', () => {
    const customCards: RegularCard[] = [
      { id: 's7', isJoker: false, suit: 'spade', rank: 7 },
      { id: 'h8', isJoker: false, suit: 'heart', rank: 8 },
      ...createDeterministicCards().slice(2),
    ];
    const { context, ruleState } = plugin.init(
      [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      DEFAULT_SHINKEI_SUIJAKU_CONFIG,
      { customDeck: customCards }
    );

    const step1 = plugin.execute(context, ruleState, 'p1', { type: 'FLIP', cardIndex: 0 });
    const step2 = plugin.execute(step1.nextContext, step1.nextRuleState, 'p1', { type: 'FLIP', cardIndex: 1 });

    expect(step2.nextRuleState.lastMatchResult).toBe('miss');
    expect(step2.nextRuleState.cards[0]?.isFlipped).toBe(true);
    expect(step2.nextRuleState.cards[1]?.isFlipped).toBe(true);
    expect(step2.nextRuleState.cards[0]?.isTaken).toBe(false);

    // NEXT_TURN で裏に戻り、手番が Bob へ
    const step3 = plugin.execute(step2.nextContext, step2.nextRuleState, 'p1', { type: 'NEXT_TURN' });
    expect(step3.nextRuleState.cards[0]?.isFlipped).toBe(false);
    expect(step3.nextRuleState.cards[1]?.isFlipped).toBe(false);
    expect(step3.nextContext.currentTurnPlayerId).toBe('p2');
  });

  it('全ペアが取られたら isGameOver となり最多得点者が勝者になること', () => {
    // 4枚（2ペア）のミニゲーム動作検証用カスタムデック
    const customCards: RegularCard[] = [
      { id: 's1', isJoker: false, suit: 'spade', rank: 1 },
      { id: 'h1', isJoker: false, suit: 'heart', rank: 1 },
      { id: 's2', isJoker: false, suit: 'spade', rank: 2 },
      { id: 'h2', isJoker: false, suit: 'heart', rank: 2 },
    ];
    const { context, ruleState } = plugin.init(
      [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      DEFAULT_SHINKEI_SUIJAKU_CONFIG,
      { customDeck: customCards }
    );

    // Alice がペア1 (0, 1) を取る
    const s1 = plugin.execute(context, ruleState, 'p1', { type: 'FLIP', cardIndex: 0 });
    const s2 = plugin.execute(s1.nextContext, s1.nextRuleState, 'p1', { type: 'FLIP', cardIndex: 1 });
    expect(s2.nextContext.isGameOver).toBe(false);

    // Alice がペア2 (2, 3) を取る -> 全て取られて終了
    const s3 = plugin.execute(s2.nextContext, s2.nextRuleState, 'p1', { type: 'FLIP', cardIndex: 2 });
    const s4 = plugin.execute(s3.nextContext, s3.nextRuleState, 'p1', { type: 'FLIP', cardIndex: 3 });

    expect(s4.nextContext.isGameOver).toBe(true);
    expect(s4.nextContext.winnerPlayerIds).toEqual(['p1']);
  });

  it('sanitizeForPlayer で伏せられているカード情報が隠蔽（null）されること（情報隠蔽の義務）', () => {
    const { context, ruleState } = plugin.init([
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
    ]);

    // 0番をめくる
    const flippedState = plugin.execute(context, ruleState, 'p1', { type: 'FLIP', cardIndex: 0 });
    const sanitized = plugin.sanitizeForPlayer(flippedState.nextContext, flippedState.nextRuleState, 'p2');

    // 0番（めくられている）は見える
    expect(sanitized.ruleState.cards[0]?.isFlipped).toBe(true);
    expect(sanitized.ruleState.cards[0]?.card).not.toBeNull();

    // 1番（伏せられている）はカード情報が null で隠蔽されている
    expect(sanitized.ruleState.cards[1]?.isFlipped).toBe(false);
    expect(sanitized.ruleState.cards[1]?.card).toBeNull();
  });
});
