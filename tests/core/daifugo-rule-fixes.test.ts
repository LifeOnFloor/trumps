import { describe, it, expect } from 'vitest';
import { DaifugoPlugin } from '../../src/core/rules/daifugo/index.js';
import type { BaseGameContext } from '../../src/core/types/engine.js';
import { DEFAULT_DAIFUGO_CONFIG } from '../../src/core/rules/daifugo/config.js';
import { isValidPlay } from '../../src/core/rules/daifugo/validator.js';

describe('Daifugo Core Rule Fixes (Sequence Lock Revolution Reversal, Role Cards with Joker, Card Exchange)', () => {
  const plugin = new DaifugoPlugin();

  it('砂嵐（革命）の後に11バックが出された時、連番縛りで次の要求ランクが正しく12（Q）になりQが出せること', () => {
    const config = {
      ...DEFAULT_DAIFUGO_CONFIG,
      sandstorm: true,
      elevenBack: true,
      sequenceLock: true,
    };

    const { context: initCtx, ruleState: initRule } = plugin.init(
      [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' },
      ],
      config
    );

    // Cards
    const three1 = { id: 'S_3', suit: 'spade' as const, rank: 3 as const, isJoker: false as const };
    const three2 = { id: 'H_3', suit: 'heart' as const, rank: 3 as const, isJoker: false as const };
    const three3 = { id: 'D_3', suit: 'diamond' as const, rank: 3 as const, isJoker: false as const };

    const queen1 = { id: 'S_12', suit: 'spade' as const, rank: 12 as const, isJoker: false as const };
    const queen2 = { id: 'H_12', suit: 'heart' as const, rank: 12 as const, isJoker: false as const };
    const jack1 = { id: 'H_11', suit: 'heart' as const, rank: 11 as const, isJoker: false as const };
    const extra1 = { id: 'C_4', suit: 'club' as const, rank: 4 as const, isJoker: false as const };
    const extra2 = { id: 'D_5', suit: 'diamond' as const, rank: 5 as const, isJoker: false as const };
    const extra3 = { id: 'H_6', suit: 'heart' as const, rank: 6 as const, isJoker: false as const };

    let context: BaseGameContext = {
      ...initCtx,
      currentTurnPlayerId: 'p1',
      players: [
        { ...initCtx.players[0]!, hand: [three1, three2, three3, queen1, extra1] },
        { ...initCtx.players[1]!, hand: [jack1, extra2] },
        { ...initCtx.players[2]!, hand: [queen2, extra3] },
      ],
    };
    let ruleState = initRule;

    // 1. p1 plays 3 of three 3s (Sandstorm) -> Triggers Revolution (nextRevolution = true)
    const play1 = plugin.execute(context, ruleState, 'p1', {
      type: 'PLAY',
      cardIds: ['S_3', 'H_3', 'D_3'],
    });
    context = play1.nextContext;
    ruleState = play1.nextRuleState;

    expect(ruleState.isRevolution).toBe(true);
    expect(ruleState.isElevenBack).toBe(false);

    // 2. Everyone passes -> Table cleared, but Revolution is still active
    const pass1 = plugin.execute(context, ruleState, 'p2', { type: 'PASS' });
    context = pass1.nextContext;
    ruleState = pass1.nextRuleState;
    const pass2 = plugin.execute(context, ruleState, 'p3', { type: 'PASS' });
    context = pass2.nextContext;
    ruleState = pass2.nextRuleState;

    expect(ruleState.table.lastPlay).toBeNull();
    expect(ruleState.isRevolution).toBe(true);

    // In Revolution: 12 (Queen) is playable on empty table
    // 3. p1 plays 12 (Single Queen)
    const play12 = plugin.execute(context, ruleState, 'p1', {
      type: 'PLAY',
      cardIds: ['S_12'],
    });
    context = play12.nextContext;
    ruleState = play12.nextRuleState;

    // 4. p2 plays 11 (Jack) on top of 12 (in Revolution, 11 is stronger than 12!)
    // 12 -> 11 triggers sequence lock!
    // 11 triggers 11-back!
    // Since Revolution was true, 11-back cancels Revolution and restores normal mode!
    const play11 = plugin.execute(context, ruleState, 'p2', {
      type: 'PLAY',
      cardIds: ['H_11'],
    });
    context = play11.nextContext;
    ruleState = play11.nextRuleState;

    expect(ruleState.isElevenBack).toBe(true);
    expect(ruleState.table.isSequenceLocked).toBe(true);
    expect(ruleState.table.requiredNextRank).toBe(12);

    const canPlayQ = plugin.canExecute(context, ruleState, 'p3', {
      type: 'PLAY',
      cardIds: ['H_12'],
    });
    expect(canPlayQ).toBe(true);
  });

  it('7とJokerをペアで出した時、Jokerも7として扱われ7渡しが2枚分発動すること', () => {
    const config = {
      ...DEFAULT_DAIFUGO_CONFIG,
      sevenPass: true,
    };

    const { context: initCtx, ruleState: initRule } = plugin.init(
      [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' },
      ],
      config
    );

    const seven = { id: 'S_7', suit: 'spade' as const, rank: 7 as const, isJoker: false as const };
    const joker = { id: 'JOKER_1', isJoker: true as const };
    const extraCard1 = { id: 'H_4', suit: 'heart' as const, rank: 4 as const, isJoker: false as const };
    const extraCard2 = { id: 'D_5', suit: 'diamond' as const, rank: 5 as const, isJoker: false as const };

    const context: BaseGameContext = {
      ...initCtx,
      currentTurnPlayerId: 'p1',
      players: [
        { ...initCtx.players[0]!, hand: [seven, joker, extraCard1, extraCard2] },
        { ...initCtx.players[1]!, hand: [{ id: 'S_9', suit: 'spade' as const, rank: 9 as const, isJoker: false as const }] },
      ],
    };

    const res = plugin.execute(context, initRule, 'p1', {
      type: 'PLAY',
      cardIds: ['S_7', 'JOKER_1'],
    });

    expect(res.nextRuleState.pendingHandAction).not.toBeNull();
    expect(res.nextRuleState.pendingHandAction?.type).toBe('SEVEN_PASS');
    // Joker counts as 7, so count must be 2!
    expect(res.nextRuleState.pendingHandAction?.count).toBe(2);
  });

  it('5とJokerをペアで出した時、5スキップが2人分発動すること', () => {
    const config = {
      ...DEFAULT_DAIFUGO_CONFIG,
      fiveSkip: true,
    };

    const { context: initCtx, ruleState: initRule } = plugin.init(
      [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' },
        { id: 'p4', name: 'Dave' },
      ],
      config
    );

    const card5 = { id: 'S_5', suit: 'spade' as const, rank: 5 as const, isJoker: false as const };
    const joker = { id: 'JOKER_1', isJoker: true as const };

    const context: BaseGameContext = {
      ...initCtx,
      currentTurnPlayerId: 'p1',
      players: [
        { ...initCtx.players[0]!, hand: [card5, joker] },
        { ...initCtx.players[1]!, hand: [{ id: 'S_9', suit: 'spade' as const, rank: 9 as const, isJoker: false as const }] },
        { ...initCtx.players[2]!, hand: [{ id: 'H_9', suit: 'heart' as const, rank: 9 as const, isJoker: false as const }] },
        { ...initCtx.players[3]!, hand: [{ id: 'D_9', suit: 'diamond' as const, rank: 9 as const, isJoker: false as const }] },
      ],
    };

    const res = plugin.execute(context, initRule, 'p1', {
      type: 'PLAY',
      cardIds: ['S_5', 'JOKER_1'],
    });

    // Skip count = 2 -> skips p2 (1), skips p3 (2) -> turn goes to p4!
    expect(res.nextContext.currentTurnPlayerId).toBe('p4');
  });

  it('再戦時、階級カード交換（cardExchange）の情報がruleState.exchangesに格納されること', () => {
    const config = {
      ...DEFAULT_DAIFUGO_CONFIG,
      cardExchange: true,
    };

    const { ruleState } = plugin.init(
      [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' },
      ],
      config,
      { previousRankings: ['p1', 'p2', 'p3'], round: 2 }
    );

    expect(ruleState.exchanges).toBeDefined();
    expect(ruleState.exchanges!.length).toBeGreaterThan(0);
    // Daihinmin (p3) gave cards to Daifugo (p1)
    const p3ToP1 = ruleState.exchanges!.find((e) => e.fromPlayerId === 'p3' && e.toPlayerId === 'p1');
    expect(p3ToP1).toBeDefined();
    expect(p3ToP1!.cards.length).toBe(2);
  });
});
