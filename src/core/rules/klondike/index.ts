import type { Card, RegularCard, Suit } from '../../types/card.js';
import type {
  BaseGameContext,
  CardGamePlugin,
  GameEvent,
  SanitizedBaseGameContext,
  SanitizedPlayerState,
  SanitizedState,
} from '../../types/engine.js';
import { createDeck, shuffleDeck } from '../../utils/deck.js';
import type {
  FoundationPiles,
  KlondikeAction,
  KlondikeCard,
  KlondikeConfig,
  KlondikeRuleState,
} from './types.js';
import { canStackOnFoundation, canStackOnTableau } from './validator.js';

export const DEFAULT_KLONDIKE_CONFIG: KlondikeConfig = {
  drawCount: 1,
};

export class KlondikePlugin
  implements CardGamePlugin<KlondikeConfig, KlondikeRuleState, KlondikeAction>
{
  readonly id = 'klondike';
  readonly name = 'Klondike Solitaire';
  readonly minPlayers = 1;
  readonly maxPlayers = 1;
  readonly hasChips = false;
  readonly defaultConfig: KlondikeConfig = DEFAULT_KLONDIKE_CONFIG;

  init(
    players: readonly { id: string; name: string }[],
    config?: Partial<KlondikeConfig>,
    options?: { customDeck?: readonly RegularCard[] }
  ): { context: BaseGameContext; ruleState: KlondikeRuleState } {
    if (players.length !== 1) {
      throw new Error('Klondike Solitaire requires exactly 1 player');
    }

    const mergedConfig: KlondikeConfig = {
      ...this.defaultConfig,
      ...config,
    };

    // 52 cards (no jokers)
    const deck: RegularCard[] =
      options?.customDeck ? [...options.customDeck] : (shuffleDeck(createDeck({ jokerCount: 0 })) as RegularCard[]);

    let deckIndex = 0;
    const tableaus: KlondikeCard[][] = [];

    // Distribute 28 cards into 7 tableau columns (col 0: 1 card ... col 6: 7 cards)
    for (let col = 0; col < 7; col++) {
      const colCards: KlondikeCard[] = [];
      for (let row = 0; row <= col; row++) {
        const card = deck[deckIndex++]!;
        const isFaceUp = row === col; // Only the top card is face-up initially
        colCards.push({ card, isFaceUp });
      }
      tableaus.push(colCards);
    }

    // Remaining 24 cards go into the stock pile
    const stock: RegularCard[] = deck.slice(deckIndex);

    const ruleState: KlondikeRuleState = {
      stock,
      waste: [],
      foundations: {
        spade: [],
        heart: [],
        diamond: [],
        club: [],
      },
      tableaus,
      drawCount: mergedConfig.drawCount,
      moveCount: 0,
    };

    const context: BaseGameContext = {
      gameId: `klondike_${Date.now()}`,
      players: [
        {
          id: players[0]!.id,
          name: players[0]!.name,
          hand: [],
          isFinished: false,
        },
      ],
      currentTurnPlayerId: players[0]!.id,
      isGameOver: false,
      winnerPlayerIds: [],
    };

    return { context, ruleState };
  }

  canExecute(
    context: Readonly<BaseGameContext>,
    ruleState: Readonly<KlondikeRuleState>,
    playerId: string,
    action: KlondikeAction
  ): boolean {
    if (context.isGameOver) return false;
    if (context.players[0]?.id !== playerId) return false;

    switch (action.type) {
      case 'DRAW':
        return ruleState.stock.length > 0;

      case 'RECYCLE_WASTE':
        return ruleState.stock.length === 0 && ruleState.waste.length > 0;

      case 'MOVE_WASTE_TO_TABLEAU': {
        if (ruleState.waste.length === 0) return false;
        if (action.tableauIndex < 0 || action.tableauIndex >= 7) return false;
        const wasteCard = ruleState.waste[ruleState.waste.length - 1]!;
        const targetCol = ruleState.tableaus[action.tableauIndex]!;
        const targetTop = targetCol.length > 0 ? targetCol[targetCol.length - 1]!.card : null;
        return canStackOnTableau(wasteCard, targetTop);
      }

      case 'MOVE_WASTE_TO_FOUNDATION': {
        if (ruleState.waste.length === 0) return false;
        const wasteCard = ruleState.waste[ruleState.waste.length - 1]!;
        const foundationPile = ruleState.foundations[wasteCard.suit];
        const foundationTop =
          foundationPile.length > 0 ? foundationPile[foundationPile.length - 1]! : null;
        return canStackOnFoundation(wasteCard, foundationTop);
      }

      case 'MOVE_TABLEAU_TO_TABLEAU': {
        const { fromTableauIndex, cardIndex, toTableauIndex } = action;
        if (fromTableauIndex === toTableauIndex) return false;
        if (fromTableauIndex < 0 || fromTableauIndex >= 7) return false;
        if (toTableauIndex < 0 || toTableauIndex >= 7) return false;

        const fromCol = ruleState.tableaus[fromTableauIndex]!;
        if (cardIndex < 0 || cardIndex >= fromCol.length) return false;

        const movingCardInfo = fromCol[cardIndex]!;
        if (!movingCardInfo.isFaceUp) return false;

        const targetCol = ruleState.tableaus[toTableauIndex]!;
        const targetTop = targetCol.length > 0 ? targetCol[targetCol.length - 1]!.card : null;

        return canStackOnTableau(movingCardInfo.card, targetTop);
      }

      case 'MOVE_TABLEAU_TO_FOUNDATION': {
        const { tableauIndex } = action;
        if (tableauIndex < 0 || tableauIndex >= 7) return false;
        const col = ruleState.tableaus[tableauIndex]!;
        if (col.length === 0) return false;

        const topCardInfo = col[col.length - 1]!;
        if (!topCardInfo.isFaceUp) return false;

        const foundationPile = ruleState.foundations[topCardInfo.card.suit];
        const foundationTop =
          foundationPile.length > 0 ? foundationPile[foundationPile.length - 1]! : null;

        return canStackOnFoundation(topCardInfo.card, foundationTop);
      }

      case 'MOVE_FOUNDATION_TO_TABLEAU': {
        const { suit, toTableauIndex } = action;
        if (toTableauIndex < 0 || toTableauIndex >= 7) return false;
        const foundationPile = ruleState.foundations[suit];
        if (foundationPile.length === 0) return false;

        const movingCard = foundationPile[foundationPile.length - 1]!;
        const targetCol = ruleState.tableaus[toTableauIndex]!;
        const targetTop = targetCol.length > 0 ? targetCol[targetCol.length - 1]!.card : null;

        return canStackOnTableau(movingCard, targetTop);
      }

      case 'AUTO_MOVE': {
        // Can auto move if matching card can move to foundation or tableau
        return this.findAutoMove(ruleState, action.cardId) !== null;
      }

      default:
        return false;
    }
  }

  execute(
    context: Readonly<BaseGameContext>,
    ruleState: Readonly<KlondikeRuleState>,
    playerId: string,
    action: KlondikeAction
  ): { nextContext: BaseGameContext; nextRuleState: KlondikeRuleState; events: GameEvent[] } {
    if (!this.canExecute(context, ruleState, playerId, action)) {
      throw new Error(`Invalid action: ${action.type}`);
    }

    const events: GameEvent[] = [];
    let nextRuleState: KlondikeRuleState = { ...ruleState, moveCount: ruleState.moveCount + 1 };

    switch (action.type) {
      case 'DRAW': {
        const drawNum = Math.min(ruleState.drawCount, ruleState.stock.length);
        const drawnCards = ruleState.stock.slice(-drawNum).reverse();
        nextRuleState = {
          ...nextRuleState,
          stock: ruleState.stock.slice(0, -drawNum),
          waste: [...ruleState.waste, ...drawnCards],
        };
        events.push({ type: 'STOCK_DRAWN', payload: { count: drawNum } });
        break;
      }

      case 'RECYCLE_WASTE': {
        nextRuleState = {
          ...nextRuleState,
          stock: [...ruleState.waste].reverse(),
          waste: [],
        };
        events.push({ type: 'WASTE_RECYCLED', payload: { count: ruleState.waste.length } });
        break;
      }

      case 'MOVE_WASTE_TO_TABLEAU': {
        const wasteCard = ruleState.waste[ruleState.waste.length - 1]!;
        const nextTableaus = ruleState.tableaus.map((col, idx) => {
          if (idx !== action.tableauIndex) return col;
          return [...col, { card: wasteCard, isFaceUp: true }];
        });
        nextRuleState = {
          ...nextRuleState,
          waste: ruleState.waste.slice(0, -1),
          tableaus: nextTableaus,
        };
        events.push({
          type: 'CARD_MOVED',
          payload: { from: 'waste', to: `tableau_${action.tableauIndex}`, card: wasteCard },
        });
        break;
      }

      case 'MOVE_WASTE_TO_FOUNDATION': {
        const wasteCard = ruleState.waste[ruleState.waste.length - 1]!;
        const nextFoundations = {
          ...ruleState.foundations,
          [wasteCard.suit]: [...ruleState.foundations[wasteCard.suit], wasteCard],
        };
        nextRuleState = {
          ...nextRuleState,
          waste: ruleState.waste.slice(0, -1),
          foundations: nextFoundations,
        };
        events.push({
          type: 'CARD_MOVED',
          payload: { from: 'waste', to: `foundation_${wasteCard.suit}`, card: wasteCard },
        });
        break;
      }

      case 'MOVE_TABLEAU_TO_TABLEAU': {
        const { fromTableauIndex, cardIndex, toTableauIndex } = action;
        const fromCol = ruleState.tableaus[fromTableauIndex]!;
        const movingCards = fromCol.slice(cardIndex);
        const remainingFromCol = fromCol.slice(0, cardIndex);

        // Auto flip top card if now exposed
        const nextFromCol = remainingFromCol.map((c, i) =>
          i === remainingFromCol.length - 1 ? { ...c, isFaceUp: true } : c
        );

        const nextTableaus = ruleState.tableaus.map((col, idx) => {
          if (idx === fromTableauIndex) return nextFromCol;
          if (idx === toTableauIndex) return [...col, ...movingCards];
          return col;
        });

        nextRuleState = {
          ...nextRuleState,
          tableaus: nextTableaus,
        };

        events.push({
          type: 'CARD_MOVED',
          payload: {
            from: `tableau_${fromTableauIndex}`,
            to: `tableau_${toTableauIndex}`,
            count: movingCards.length,
          },
        });
        break;
      }

      case 'MOVE_TABLEAU_TO_FOUNDATION': {
        const { tableauIndex } = action;
        const col = ruleState.tableaus[tableauIndex]!;
        const movingCardInfo = col[col.length - 1]!;
        const remainingCol = col.slice(0, -1);

        // Auto flip top card if now exposed
        const nextCol = remainingCol.map((c, i) =>
          i === remainingCol.length - 1 ? { ...c, isFaceUp: true } : c
        );

        const nextTableaus = ruleState.tableaus.map((c, idx) =>
          idx === tableauIndex ? nextCol : c
        );

        const nextFoundations = {
          ...ruleState.foundations,
          [movingCardInfo.card.suit]: [
            ...ruleState.foundations[movingCardInfo.card.suit],
            movingCardInfo.card,
          ],
        };

        nextRuleState = {
          ...nextRuleState,
          tableaus: nextTableaus,
          foundations: nextFoundations,
        };

        events.push({
          type: 'CARD_MOVED',
          payload: {
            from: `tableau_${tableauIndex}`,
            to: `foundation_${movingCardInfo.card.suit}`,
            card: movingCardInfo.card,
          },
        });
        break;
      }

      case 'MOVE_FOUNDATION_TO_TABLEAU': {
        const { suit, toTableauIndex } = action;
        const foundationPile = ruleState.foundations[suit];
        const movingCard = foundationPile[foundationPile.length - 1]!;

        const nextFoundations = {
          ...ruleState.foundations,
          [suit]: foundationPile.slice(0, -1),
        };

        const nextTableaus = ruleState.tableaus.map((col, idx) => {
          if (idx !== toTableauIndex) return col;
          return [...col, { card: movingCard, isFaceUp: true }];
        });

        nextRuleState = {
          ...nextRuleState,
          foundations: nextFoundations,
          tableaus: nextTableaus,
        };

        events.push({
          type: 'CARD_MOVED',
          payload: {
            from: `foundation_${suit}`,
            to: `tableau_${toTableauIndex}`,
            card: movingCard,
          },
        });
        break;
      }

      case 'AUTO_MOVE': {
        const autoMoveAction = this.findAutoMove(ruleState, action.cardId);
        if (autoMoveAction) {
          return this.execute(context, ruleState, playerId, autoMoveAction);
        }
        break;
      }
    }

    // Check Victory Condition: all 4 foundations have 13 cards (52 total)
    const totalFoundations =
      nextRuleState.foundations.spade.length +
      nextRuleState.foundations.heart.length +
      nextRuleState.foundations.diamond.length +
      nextRuleState.foundations.club.length;

    const isCleared = totalFoundations === 52;
    let nextContext = context;

    if (isCleared) {
      events.push({ type: 'GAME_CLEARED', payload: { moves: nextRuleState.moveCount } });
      nextContext = {
        ...context,
        isGameOver: true,
        winnerPlayerIds: [playerId],
      };
    }

    return { nextContext, nextRuleState, events };
  }

  sanitizeForPlayer(
    context: Readonly<BaseGameContext>,
    ruleState: Readonly<KlondikeRuleState>,
    _viewerPlayerId: string
  ): SanitizedState<KlondikeRuleState> {
    // Obscure face-down cards in tableau so their suit/rank cannot be inspected by cheating
    const sanitizedTableaus = ruleState.tableaus.map((col) =>
      col.map((cardInfo) => {
        if (cardInfo.isFaceUp) return cardInfo;
        return {
          card: {
            id: 'HIDDEN',
            suit: 'spade',
            rank: 1,
            isJoker: false,
          } as RegularCard,
          isFaceUp: false,
        };
      })
    );

    const sanitizedRuleState: KlondikeRuleState = {
      ...ruleState,
      tableaus: sanitizedTableaus,
      // Stock cards are also kept face-down
      stock: ruleState.stock.map(
        () =>
          ({
            id: 'HIDDEN',
            suit: 'spade',
            rank: 1,
            isJoker: false,
          } as RegularCard)
      ),
    };

    const sanitizedContext: SanitizedBaseGameContext = {
      gameId: context.gameId,
      players: context.players.map((p) => ({
        id: p.id,
        name: p.name,
        handCount: 0,
        isFinished: p.isFinished,
      })),
      currentTurnPlayerId: context.currentTurnPlayerId,
      isGameOver: context.isGameOver,
      winnerPlayerIds: context.winnerPlayerIds,
    };

    return {
      context: sanitizedContext,
      ruleState: sanitizedRuleState,
    };
  }

  private findAutoMove(ruleState: KlondikeRuleState, cardId: string): KlondikeAction | null {
    // 1. Check if it's the top of waste
    if (ruleState.waste.length > 0 && ruleState.waste[ruleState.waste.length - 1]!.id === cardId) {
      const card = ruleState.waste[ruleState.waste.length - 1]!;
      // Try foundation first
      const foundationPile = ruleState.foundations[card.suit];
      const foundationTop =
        foundationPile.length > 0 ? foundationPile[foundationPile.length - 1]! : null;
      if (canStackOnFoundation(card, foundationTop)) {
        return { type: 'MOVE_WASTE_TO_FOUNDATION' };
      }
      // Try tableaus
      for (let t = 0; t < 7; t++) {
        const col = ruleState.tableaus[t]!;
        const colTop = col.length > 0 ? col[col.length - 1]!.card : null;
        if (canStackOnTableau(card, colTop)) {
          return { type: 'MOVE_WASTE_TO_TABLEAU', tableauIndex: t };
        }
      }
    }

    // 2. Check if it's on a tableau
    for (let f = 0; f < 7; f++) {
      const col = ruleState.tableaus[f]!;
      const cardIdx = col.findIndex((c) => c.card.id === cardId && c.isFaceUp);
      if (cardIdx !== -1) {
        const cardInfo = col[cardIdx]!;
        // If it's the topmost card in column, check foundation first
        if (cardIdx === col.length - 1) {
          const foundationPile = ruleState.foundations[cardInfo.card.suit];
          const foundationTop =
            foundationPile.length > 0 ? foundationPile[foundationPile.length - 1]! : null;
          if (canStackOnFoundation(cardInfo.card, foundationTop)) {
            return { type: 'MOVE_TABLEAU_TO_FOUNDATION', tableauIndex: f };
          }
        }
        // Try other tableaus
        for (let t = 0; t < 7; t++) {
          if (t === f) continue;
          const targetCol = ruleState.tableaus[t]!;
          const targetTop = targetCol.length > 0 ? targetCol[targetCol.length - 1]!.card : null;
          if (canStackOnTableau(cardInfo.card, targetTop)) {
            return {
              type: 'MOVE_TABLEAU_TO_TABLEAU',
              fromTableauIndex: f,
              cardIndex: cardIdx,
              toTableauIndex: t,
            };
          }
        }
      }
    }

    return null;
  }
}
