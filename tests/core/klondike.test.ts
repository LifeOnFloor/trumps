import { describe, it, expect } from 'vitest';
import { KlondikePlugin } from '../../src/core/rules/klondike/index.js';
import type { RegularCard } from '../../src/core/types/card.js';

describe('Klondike Solitaire Core Logic (Spec-Driven)', () => {
  const plugin = new KlondikePlugin();

  describe('1. 初期配置（Deal & Layout）', () => {
    it('52枚のカードが 7列のTableau(28枚), Stock(24枚), Waste(0枚), Foundations(0枚) に正確に配置されること', () => {
      const { context, ruleState } = plugin.init([{ id: 'player1', name: 'Solitaire Player' }]);

      expect(context.players).toHaveLength(1);
      expect(context.isGameOver).toBe(false);

      // Tableau: 7 columns, with 1 to 7 cards
      expect(ruleState.tableaus).toHaveLength(7);
      for (let i = 0; i < 7; i++) {
        const col = ruleState.tableaus[i]!;
        expect(col).toHaveLength(i + 1);
        // Only top card is face-up
        for (let j = 0; j < col.length; j++) {
          if (j === col.length - 1) {
            expect(col[j]!.isFaceUp).toBe(true);
          } else {
            expect(col[j]!.isFaceUp).toBe(false);
          }
        }
      }

      // Stock: 52 - 28 = 24
      expect(ruleState.stock).toHaveLength(24);
      expect(ruleState.waste).toHaveLength(0);

      // Foundations: 4 empty piles
      expect(ruleState.foundations.spade).toHaveLength(0);
      expect(ruleState.foundations.heart).toHaveLength(0);
      expect(ruleState.foundations.diamond).toHaveLength(0);
      expect(ruleState.foundations.club).toHaveLength(0);
    });
  });

  describe('2. 山札操作（DRAW & RECYCLE）', () => {
    it('DRAW アクションで stock から waste へカードが移動し、表向きになること', () => {
      const initial = plugin.init([{ id: 'player1', name: 'Player' }]);
      const initialStockCount = initial.ruleState.stock.length;

      expect(plugin.canExecute(initial.context, initial.ruleState, 'player1', { type: 'DRAW' })).toBe(true);

      const res = plugin.execute(initial.context, initial.ruleState, 'player1', { type: 'DRAW' });
      expect(res.nextRuleState.stock).toHaveLength(initialStockCount - 1);
      expect(res.nextRuleState.waste).toHaveLength(1);
      expect(res.events.some((e) => e.type === 'STOCK_DRAWN')).toBe(true);
    });

    it('stock が空のとき、RECYCLE_WASTE で waste のカードが stock に戻ること', () => {
      const initial = plugin.init([{ id: 'player1', name: 'Player' }]);
      // Force empty stock and 3 cards in waste
      const customRuleState = {
        ...initial.ruleState,
        stock: [],
        waste: [
          { id: 'S_1', suit: 'spade', rank: 1, isJoker: false } as RegularCard,
          { id: 'H_2', suit: 'heart', rank: 2, isJoker: false } as RegularCard,
        ],
      };

      expect(plugin.canExecute(initial.context, customRuleState, 'player1', { type: 'RECYCLE_WASTE' })).toBe(true);

      const res = plugin.execute(initial.context, customRuleState, 'player1', { type: 'RECYCLE_WASTE' });
      expect(res.nextRuleState.stock).toHaveLength(2);
      expect(res.nextRuleState.waste).toHaveLength(0);
      expect(res.events.some((e) => e.type === 'WASTE_RECYCLED')).toBe(true);
    });
  });

  describe('3. 場札移動（Tableau Stacking）', () => {
    it('赤黒交互・ランク-1 の組み合わせでカードを移動でき、移動元の裏向きカードがめくられること', () => {
      const initial = plugin.init([{ id: 'player1', name: 'Player' }]);

      // Setup Col 0: [S_8(face-up)]
      // Setup Col 1: [D_10(face-down), H_7(face-up)]
      const customRuleState = {
        ...initial.ruleState,
        tableaus: [
          [{ card: { id: 'S_8', suit: 'spade', rank: 8, isJoker: false } as RegularCard, isFaceUp: true }],
          [
            { card: { id: 'D_10', suit: 'diamond', rank: 10, isJoker: false } as RegularCard, isFaceUp: false },
            { card: { id: 'H_7', suit: 'heart', rank: 7, isJoker: false } as RegularCard, isFaceUp: true },
          ],
          [],
          [],
          [],
          [],
          [],
        ],
      };

      // Moving H_7 (Red 7) onto S_8 (Black 8) is valid
      const canMove = plugin.canExecute(initial.context, customRuleState, 'player1', {
        type: 'MOVE_TABLEAU_TO_TABLEAU',
        fromTableauIndex: 1,
        cardIndex: 1,
        toTableauIndex: 0,
      });
      expect(canMove).toBe(true);

      const res = plugin.execute(initial.context, customRuleState, 'player1', {
        type: 'MOVE_TABLEAU_TO_TABLEAU',
        fromTableauIndex: 1,
        cardIndex: 1,
        toTableauIndex: 0,
      });

      // Target Col 0 now has [S_8, H_7]
      expect(res.nextRuleState.tableaus[0]).toHaveLength(2);
      expect(res.nextRuleState.tableaus[0]![1]!.card.id).toBe('H_7');

      // Origin Col 1 now has D_10 automatically flipped face-up!
      expect(res.nextRuleState.tableaus[1]).toHaveLength(1);
      expect(res.nextRuleState.tableaus[1]![0]!.card.id).toBe('D_10');
      expect(res.nextRuleState.tableaus[1]![0]!.isFaceUp).toBe(true);
    });

    it('空の列には King(13) のみが配置可能であること', () => {
      const initial = plugin.init([{ id: 'player1', name: 'Player' }]);

      const customRuleState = {
        ...initial.ruleState,
        tableaus: [
          [{ card: { id: 'C_13', suit: 'club', rank: 13, isJoker: false } as RegularCard, isFaceUp: true }],
          [{ card: { id: 'C_12', suit: 'club', rank: 12, isJoker: false } as RegularCard, isFaceUp: true }],
          [], // Empty col 2
          [],
          [],
          [],
          [],
        ],
      };

      // Moving King (rank 13) to empty col 2 is allowed
      expect(
        plugin.canExecute(initial.context, customRuleState, 'player1', {
          type: 'MOVE_TABLEAU_TO_TABLEAU',
          fromTableauIndex: 0,
          cardIndex: 0,
          toTableauIndex: 2,
        })
      ).toBe(true);

      // Moving Queen (rank 12) to empty col 2 is forbidden
      expect(
        plugin.canExecute(initial.context, customRuleState, 'player1', {
          type: 'MOVE_TABLEAU_TO_TABLEAU',
          fromTableauIndex: 1,
          cardIndex: 0,
          toTableauIndex: 2,
        })
      ).toBe(false);
    });
  });

  describe('4. 組札移動（Foundation Stacking）', () => {
    it('空の組札には Ace(1) のみが置け、順に同スート昇順で重ねられること', () => {
      const initial = plugin.init([{ id: 'player1', name: 'Player' }]);

      const customRuleState = {
        ...initial.ruleState,
        waste: [{ id: 'S_1', suit: 'spade', rank: 1, isJoker: false } as RegularCard],
        tableaus: [
          [{ card: { id: 'S_2', suit: 'spade', rank: 2, isJoker: false } as RegularCard, isFaceUp: true }],
          [{ card: { id: 'H_2', suit: 'heart', rank: 2, isJoker: false } as RegularCard, isFaceUp: true }],
          [],
          [],
          [],
          [],
          [],
        ],
      };

      // 1. Move S_1 (Ace of Spade) from waste to foundation
      expect(
        plugin.canExecute(initial.context, customRuleState, 'player1', {
          type: 'MOVE_WASTE_TO_FOUNDATION',
        })
      ).toBe(true);

      const res1 = plugin.execute(initial.context, customRuleState, 'player1', {
        type: 'MOVE_WASTE_TO_FOUNDATION',
      });
      expect(res1.nextRuleState.foundations.spade).toHaveLength(1);
      expect(res1.nextRuleState.waste).toHaveLength(0);

      // 2. Now S_2 from Tableau col 0 can be moved to spade foundation
      expect(
        plugin.canExecute(res1.nextContext, res1.nextRuleState, 'player1', {
          type: 'MOVE_TABLEAU_TO_FOUNDATION',
          tableauIndex: 0,
        })
      ).toBe(true);

      // But H_2 (heart) cannot be moved onto spade foundation
      expect(
        plugin.canExecute(res1.nextContext, res1.nextRuleState, 'player1', {
          type: 'MOVE_TABLEAU_TO_FOUNDATION',
          tableauIndex: 1,
        })
      ).toBe(false);
    });
  });

  describe('5. 情報隠蔽（Sanitization）', () => {
    it('sanitizeForPlayer 実行時、裏向きの場札カードの詳細情報が隠蔽されること', () => {
      const initial = plugin.init([{ id: 'player1', name: 'Player' }]);
      const sanitized = plugin.sanitizeForPlayer(initial.context, initial.ruleState, 'player1');

      // Col 6 has 7 cards: first 6 are face-down, 7th is face-up
      const col6 = sanitized.ruleState.tableaus[6]!;
      expect(col6).toHaveLength(7);

      for (let i = 0; i < 6; i++) {
        expect(col6[i]!.isFaceUp).toBe(false);
        // Face down card rank/suit must be hidden (or obscured)
        expect(col6[i]!.card.id).toBe('HIDDEN');
      }
      expect(col6[6]!.isFaceUp).toBe(true);
      expect(col6[6]!.card.id).not.toBe('HIDDEN');
    });
  });

  describe('6. 勝利判定（Game Completion）', () => {
    it('全スートの組札に 13枚（合計52枚）積み上がったとき、isGameOver: true となること', () => {
      const initial = plugin.init([{ id: 'player1', name: 'Player' }]);

      const makeSuit13 = (suit: 'spade' | 'heart' | 'diamond' | 'club') =>
        Array.from({ length: 13 }, (_, i) => ({
          id: `${suit}_${i + 1}`,
          suit,
          rank: (i + 1) as any,
          isJoker: false as const,
        }));

      // 51 cards on foundation, 1 card on tableau ready to move to foundation
      const customRuleState = {
        ...initial.ruleState,
        foundations: {
          spade: makeSuit13('spade'),
          heart: makeSuit13('heart'),
          diamond: makeSuit13('diamond'),
          club: makeSuit13('club').slice(0, 12), // 12 clubs
        },
        tableaus: [
          [{ card: { id: 'C_13', suit: 'club', rank: 13, isJoker: false } as RegularCard, isFaceUp: true }],
          [],
          [],
          [],
          [],
          [],
          [],
        ],
      };

      const res = plugin.execute(initial.context, customRuleState as any, 'player1', {
        type: 'MOVE_TABLEAU_TO_FOUNDATION',
        tableauIndex: 0,
      });

      expect(res.nextRuleState.foundations.club).toHaveLength(13);
      expect(res.nextContext.isGameOver).toBe(true);
      expect(res.nextContext.winnerPlayerIds).toEqual(['player1']);
      expect(res.events.some((e) => e.type === 'GAME_CLEARED')).toBe(true);
    });
  });
});
