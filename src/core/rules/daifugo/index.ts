import type { Card } from '../../types/card.js';
import type {
  BaseGameContext,
  CardGamePlugin,
  GameEvent,
  PlayerState,
  SanitizedBaseGameContext,
  SanitizedPlayerState,
  SanitizedState,
} from '../../types/engine.js';
import { createDeck, dealHands, shuffleDeck } from '../../utils/deck.js';
import { calculateAnte } from '../../types/chips.js';
import type { DaifugoConfig } from './config.js';
import { DEFAULT_DAIFUGO_CONFIG } from './config.js';
import { executeTaxCardExchange } from './exchange.js';
import { settleChips } from './settlement.js';
import type { DaifugoAction, DaifugoRuleState, PendingHandAction, PlayMeld } from './types.js';
import {
  checkSequenceLock,
  checkSuitLock,
  countFive,
  countSeven,
  countTen,
  hasEight,
  hasEleven,
  hasNine,
  isProhibitedEnding,
  isSandstorm,
  isSingleJoker,
  isSpadeThree,
  isValidPlay,
} from './validator.js';

export class DaifugoPlugin
  implements CardGamePlugin<DaifugoConfig, DaifugoRuleState, DaifugoAction>
{
  readonly id = 'daifugo';
  readonly name = 'Daifugo';
  readonly minPlayers = 3;
  readonly maxPlayers = 8;
  readonly hasChips = false;
  readonly defaultConfig: DaifugoConfig = DEFAULT_DAIFUGO_CONFIG;

  init(
    players: readonly { id: string; name: string; chips?: number }[],
    config?: Partial<DaifugoConfig>,
    options?: { previousRankings?: readonly string[] }
  ): { context: BaseGameContext; ruleState: DaifugoRuleState } {
    if (players.length < this.minPlayers || players.length > this.maxPlayers) {
      throw new Error(`Player count must be between ${this.minPlayers} and ${this.maxPlayers}`);
    }

    const mergedConfig: DaifugoConfig = {
      ...this.defaultConfig,
      ...config,
      prohibitedEndings: {
        ...this.defaultConfig.prohibitedEndings,
        ...(config?.prohibitedEndings ?? {}),
      },
    };

    // 53 cards with 1 joker
    const deck = shuffleDeck(createDeck({ jokerCount: 1 }));
    const hands = dealHands(deck, players.length);

    let initialPlayers: PlayerState[] = players.map((p, idx) => ({
      id: p.id,
      name: p.name,
      hand: hands[idx] ?? [],
      isFinished: false,
      chips: mergedConfig.chipsMode ? (p.chips ?? mergedConfig.initialChips ?? 1000) : undefined,
    }));

    let initialPot = 0;
    if (mergedConfig.chipsMode) {
      const anteConfig = {
        ...mergedConfig,
        anteType: mergedConfig.anteType ?? (mergedConfig.ante ? 'fixed' : 'none'),
        baseAnte: mergedConfig.baseAnte ?? mergedConfig.ante ?? 0,
      };
      const anteAmount = calculateAnte(anteConfig as any, options?.previousRankings ? 1 : 0);
      const allowDebt = mergedConfig.bankruptcyRule === 'allow_debt';

      if (anteAmount > 0) {
        initialPlayers = initialPlayers.map((p) => {
          if (p.chips === undefined) return p;
          const paid = allowDebt ? anteAmount : Math.min(Math.max(0, p.chips), anteAmount);
          initialPot += paid;
          return {
            ...p,
            chips: p.chips - paid,
          };
        });
      }
    }

    // If previousRankings exists and cardExchange is enabled, execute tax card exchange
    if (mergedConfig.cardExchange && options?.previousRankings && options.previousRankings.length > 0) {
      const { nextPlayers } = executeTaxCardExchange(initialPlayers, options.previousRankings);
      initialPlayers = nextPlayers;
    }

    // Find starting player: whoever has D_3, or fallback to player 0 (or previous Daihinmin)
    let startIndex = 0;
    const d3Index = initialPlayers.findIndex((p) => p.hand.some((c) => c.id === 'D_3'));
    if (d3Index !== -1) {
      startIndex = d3Index;
    } else if (options?.previousRankings && options.previousRankings.length > 0) {
      const daihinminId = options.previousRankings[options.previousRankings.length - 1];
      const daihinminIndex = initialPlayers.findIndex((p) => p.id === daihinminId);
      if (daihinminIndex !== -1) {
        startIndex = daihinminIndex;
      }
    }

    const context: BaseGameContext = {
      gameId: `daifugo_${Date.now()}`,
      players: initialPlayers,
      currentTurnPlayerId: initialPlayers[startIndex]!.id,
      isGameOver: false,
      winnerPlayerIds: [],
    };

    const ruleState: DaifugoRuleState = {
      config: mergedConfig,
      isRevolution: false,
      isElevenBack: false,
      turnDirection: 1,
      isSequenceLocked: false,
      isGekokujo: false,
      previousRankings: options?.previousRankings,
      pendingHandAction: null,
      table: {
        lastPlay: null,
        lockedSuits: null,
        isSequenceLocked: false,
        requiredNextRank: null,
        passedPlayerIds: [],
      },
      rankings: [],
      foulPlayerIds: [],
      pot: initialPot,
    };

    return { context, ruleState };
  }

  canExecute(
    context: Readonly<BaseGameContext>,
    ruleState: Readonly<DaifugoRuleState>,
    playerId: string,
    action: DaifugoAction
  ): boolean {
    if (context.isGameOver) return false;

    const player = context.players.find((p) => p.id === playerId);
    if (!player || player.isFinished) return false;

    if (action.type === 'SURRENDER') return true;

    if (context.currentTurnPlayerId !== playerId) return false;

    // Handle pending hand actions (7-pass or 10-discard)
    if (ruleState.pendingHandAction) {
      if (ruleState.pendingHandAction.playerId !== playerId) return false;
      const handCardMap = new Map(player.hand.map((c) => [c.id, c]));

      if (ruleState.pendingHandAction.type === 'SEVEN_PASS') {
        if (action.type !== 'PASS_CARDS') return false;
        const requiredCount = Math.min(ruleState.pendingHandAction.count, player.hand.length);
        if (action.cardIds.length !== requiredCount) return false;
        return action.cardIds.every((id) => handCardMap.has(id));
      }

      if (ruleState.pendingHandAction.type === 'TEN_DISCARD') {
        if (action.type !== 'DISCARD_CARDS') return false;
        if (action.cardIds.length > ruleState.pendingHandAction.count) return false;
        return action.cardIds.every((id) => handCardMap.has(id));
      }

      return false;
    }

    if (action.type === 'PASS') {
      // Cannot pass if table is empty
      if (!ruleState.table.lastPlay) return false;
      return true;
    }

    if (action.type === 'PLAY') {
      if (action.cardIds.length === 0) return false;
      // All cardIds must be present in player's hand
      const handCardMap = new Map(player.hand.map((c) => [c.id, c]));
      const cardsToPlay: Card[] = [];
      for (const cardId of action.cardIds) {
        const card = handCardMap.get(cardId);
        if (!card) return false;
        cardsToPlay.push(card);
      }

      const isEffectiveRev = ruleState.isRevolution !== ruleState.isElevenBack;
      const { valid } = isValidPlay(
        cardsToPlay,
        ruleState.table,
        isEffectiveRev,
        ruleState.config
      );
      return valid;
    }

    return false;
  }

  execute(
    context: Readonly<BaseGameContext>,
    ruleState: Readonly<DaifugoRuleState>,
    playerId: string,
    action: DaifugoAction
  ): {
    nextContext: BaseGameContext;
    nextRuleState: DaifugoRuleState;
    events: GameEvent[];
  } {
    if (!this.canExecute(context, ruleState, playerId, action)) {
      throw new Error(`Action ${action.type} cannot be executed by player ${playerId}`);
    }

    const events: GameEvent[] = [];
    const playerIndex = context.players.findIndex((p) => p.id === playerId);
    const player = context.players[playerIndex]!;

    let nextPlayers = [...context.players];
    let nextTable = { ...ruleState.table };
    let nextRevolution = ruleState.isRevolution;
    let nextElevenBack = ruleState.isElevenBack;
    let nextTurnDirection = ruleState.turnDirection;
    let nextGekokujo = ruleState.isGekokujo;
    let nextPendingHandAction: PendingHandAction | null = ruleState.pendingHandAction;
    let skipCount = 0;
    let nextRankings = [...ruleState.rankings];
    let nextFoulPlayers = [...ruleState.foulPlayerIds];
    let nextTurnPlayerId: string | null = null;
    let nextPot = ruleState.pot ?? 0;

    if (action.type === 'SURRENDER') {
      events.push({ type: 'PLAYER_SURRENDERED', payload: { playerId } });
      nextFoulPlayers.push(playerId);
      const totalPlayers = nextPlayers.length;

      nextPlayers = nextPlayers.map((p) =>
        p.id === playerId
          ? { ...p, hand: [], isFinished: true, rankPosition: totalPlayers }
          : p
      );

      if (nextPendingHandAction && nextPendingHandAction.playerId === playerId) {
        nextPendingHandAction = null;
      }

      if (nextTable.lastPlay?.playerId === playerId) {
        events.push({ type: 'TABLE_CLEARED' });
        nextElevenBack = false;
        nextTable = {
          lastPlay: null,
          lockedSuits: null,
          isSequenceLocked: false,
          requiredNextRank: null,
          passedPlayerIds: [],
        };
      }

      if (context.currentTurnPlayerId === playerId) {
        nextTurnPlayerId = this.findNextActivePlayerId(nextPlayers, playerId, nextTurnDirection, 0);
      } else {
        nextTurnPlayerId = context.currentTurnPlayerId;
      }
    } else if (action.type === 'PASS_CARDS') {
      const pending = ruleState.pendingHandAction;
      if (!pending || pending.type !== 'SEVEN_PASS') {
        throw new Error('No pending seven pass action');
      }
      const cardsToPass = action.cardIds.map((id) => player.hand.find((c) => c.id === id)!);
      const remainingHand = player.hand.filter((c) => !action.cardIds.includes(c.id));

      nextPlayers = nextPlayers.map((p) => {
        if (p.id === playerId) {
          return { ...p, hand: remainingHand };
        }
        if (p.id === pending.targetPlayerId) {
          return { ...p, hand: [...p.hand, ...cardsToPass] };
        }
        return p;
      });

      events.push({
        type: 'CARDS_PASSED',
        payload: { from: playerId, to: pending.targetPlayerId, cards: cardsToPass },
      });

      if (remainingHand.length === 0) {
        const finishRes = this.recordPlayerFinish(
          playerId,
          nextPlayers,
          nextRankings,
          nextFoulPlayers,
          ruleState.config,
          ruleState.previousRankings
        );
        nextPlayers = finishRes.players;
        nextRankings = finishRes.rankings;
        nextFoulPlayers = finishRes.foulPlayers;
        if (finishRes.isGekokujo) nextGekokujo = true;
        events.push(...finishRes.events);
      }

      nextPendingHandAction = null;
      nextTurnPlayerId = pending.targetPlayerId;
    } else if (action.type === 'DISCARD_CARDS') {
      const pending = ruleState.pendingHandAction;
      if (!pending || pending.type !== 'TEN_DISCARD') {
        throw new Error('No pending ten discard action');
      }
      const discardedCards = action.cardIds.map((id) => player.hand.find((c) => c.id === id)!);
      const remainingHand = player.hand.filter((c) => !action.cardIds.includes(c.id));

      nextPlayers = nextPlayers.map((p) =>
        p.id === playerId ? { ...p, hand: remainingHand } : p
      );

      events.push({
        type: 'CARDS_DISCARDED',
        payload: { playerId, cards: discardedCards },
      });

      if (remainingHand.length === 0) {
        const finishRes = this.recordPlayerFinish(
          playerId,
          nextPlayers,
          nextRankings,
          nextFoulPlayers,
          ruleState.config,
          ruleState.previousRankings
        );
        nextPlayers = finishRes.players;
        nextRankings = finishRes.rankings;
        nextFoulPlayers = finishRes.foulPlayers;
        if (finishRes.isGekokujo) nextGekokujo = true;
        events.push(...finishRes.events);
      }

      nextPendingHandAction = null;
      nextTurnPlayerId = this.findNextActivePlayerId(nextPlayers, playerId, nextTurnDirection, 0);
    } else if (action.type === 'PASS') {
      events.push({ type: 'PLAYER_PASSED', payload: { playerId } });
      const nextPassed = [...nextTable.passedPlayerIds, playerId];

      // Check if all active players except lastPlay.playerId passed
      const activePlayers = nextPlayers.filter((p) => !p.isFinished);
      const lastPlayPlayerId = nextTable.lastPlay?.playerId;

      const otherActivePlayers = activePlayers.filter((p) => p.id !== lastPlayPlayerId);
      const allOthersPassed = otherActivePlayers.every((p) => nextPassed.includes(p.id));

      if (allOthersPassed) {
        // Table cleared!
        events.push({ type: 'TABLE_CLEARED' });
        nextElevenBack = false;
        nextTable = {
          lastPlay: null,
          lockedSuits: null,
          isSequenceLocked: false,
          requiredNextRank: null,
          passedPlayerIds: [],
        };
        // Next turn is lastPlay player, or if finished, the next active player from them
        const lastPlayerObj = nextPlayers.find((p) => p.id === lastPlayPlayerId);
        if (lastPlayerObj && !lastPlayerObj.isFinished) {
          nextTurnPlayerId = lastPlayPlayerId!;
        } else {
          nextTurnPlayerId = this.findNextActivePlayerId(nextPlayers, lastPlayPlayerId ?? playerId, nextTurnDirection);
        }
      } else {
        nextTable = {
          ...nextTable,
          passedPlayerIds: nextPassed,
        };
        nextTurnPlayerId = this.findNextActivePlayerId(nextPlayers, playerId, nextTurnDirection);
      }
    } else {
      // PLAY
      const playedCards = action.cardIds.map((id) => player.hand.find((c) => c.id === id)!);
      const remainingHand = player.hand.filter((c) => !action.cardIds.includes(c.id));

      events.push({ type: 'CARDS_PLAYED', payload: { playerId, cards: playedCards } });

      const isEffectiveRevBefore = ruleState.isRevolution !== ruleState.isElevenBack;
      const { meld } = isValidPlay(
        playedCards,
        ruleState.table,
        isEffectiveRevBefore,
        ruleState.config
      );
      const currentMeld: PlayMeld = {
        ...meld!,
        playerId,
      };

      // Check Sandstorm (3 of three 3s)
      if (isSandstorm(playedCards, ruleState.config)) {
        events.push({ type: 'SANDSTORM', payload: { playerId } });
        if (ruleState.config.revolution) {
          nextRevolution = !nextRevolution;
          events.push({ type: 'REVOLUTION', payload: { isRevolution: nextRevolution } });
        }
      }

      // Check Spade 3 return
      const isSp3Return =
        ruleState.config.spadeThreeReturn &&
        ruleState.table.lastPlay &&
        isSingleJoker(ruleState.table.lastPlay) &&
        playedCards.length === 1 &&
        isSpadeThree(playedCards[0]!);

      // Check Revolution: 4 cards or more
      if (ruleState.config.revolution && playedCards.length >= 4 && !isSandstorm(playedCards, ruleState.config)) {
        nextRevolution = !nextRevolution;
        events.push({ type: 'REVOLUTION', payload: { isRevolution: nextRevolution } });
      }

      // Check 11-back
      if (ruleState.config.elevenBack && hasEleven(playedCards)) {
        nextElevenBack = !nextElevenBack;
        events.push({ type: 'ELEVEN_BACK', payload: { isElevenBack: nextElevenBack } });
      }

      // Check 9 effects
      if (ruleState.config.nineEffect === 'reverse' && hasNine(playedCards)) {
        nextTurnDirection = (nextTurnDirection * -1) as 1 | -1;
        events.push({ type: 'NINE_REVERSE', payload: { turnDirection: nextTurnDirection } });
      } else if (ruleState.config.nineEffect === 'revolution' && hasNine(playedCards)) {
        nextElevenBack = !nextElevenBack;
        events.push({ type: 'NINE_REVOLUTION', payload: { isRevolution: nextElevenBack } });
      }

      // Check 5-skip
      if (ruleState.config.fiveSkip) {
        const fives = countFive(playedCards);
        if (fives > 0) {
          skipCount = fives;
          events.push({ type: 'FIVE_SKIP', payload: { skipCount } });
        }
      }

      // Check Eight Cut
      const isEightCut = ruleState.config.eightCut && hasEight(playedCards);

      // Check finish (empty hand)
      let playerFinished = false;
      let playerFoul = false;
      if (remainingHand.length === 0) {
        playerFinished = true;
        const isEffectiveRevCurrent = nextRevolution !== nextElevenBack;
        if (isProhibitedEnding(playedCards, isEffectiveRevCurrent, ruleState.config)) {
          playerFoul = true;
          nextFoulPlayers.push(playerId);
          events.push({ type: 'FOUL_FINISH', payload: { playerId } });
        } else {
          nextPlayers = nextPlayers.map((p, idx) =>
            idx === playerIndex ? { ...p, hand: remainingHand } : p
          );
          const finishRes = this.recordPlayerFinish(
            playerId,
            nextPlayers,
            nextRankings,
            nextFoulPlayers,
            ruleState.config,
            ruleState.previousRankings
          );
          nextPlayers = finishRes.players;
          nextRankings = finishRes.rankings;
          nextFoulPlayers = finishRes.foulPlayers;
          if (finishRes.isGekokujo) nextGekokujo = true;
          events.push(...finishRes.events);
        }
      }

      if (!playerFinished || playerFoul) {
        nextPlayers = nextPlayers.map((p, idx) =>
          idx === playerIndex
            ? {
                ...p,
                hand: remainingHand,
                isFinished: playerFinished,
                rankPosition: undefined,
              }
            : p
        );
      }

      // Determine table state and next turn
      if (isSp3Return || isEightCut) {
        if (isEightCut) {
          events.push({ type: 'EIGHT_CUT', payload: { playerId } });
        }
        if (isSp3Return) {
          events.push({ type: 'SPADE_THREE_RETURN', payload: { playerId } });
        }
        events.push({ type: 'TABLE_CLEARED' });
        nextElevenBack = false;
        nextTable = {
          lastPlay: null,
          lockedSuits: null,
          isSequenceLocked: false,
          requiredNextRank: null,
          passedPlayerIds: [],
        };
        // Turn stays with player if not finished
        if (!playerFinished) {
          nextTurnPlayerId = playerId;
        } else {
          nextTurnPlayerId = this.findNextActivePlayerId(nextPlayers, playerId, nextTurnDirection, 0);
        }
      } else {
        const lockedSuits = checkSuitLock(
          currentMeld,
          ruleState.table.lastPlay,
          ruleState.table.lockedSuits,
          isEffectiveRevBefore,
          ruleState.config
        );
        if (!ruleState.table.lockedSuits && lockedSuits) {
          events.push({ type: 'SUIT_LOCKED', payload: { suits: lockedSuits } });
        }

        const seqLock = checkSequenceLock(
          currentMeld,
          ruleState.table.lastPlay,
          ruleState.table.isSequenceLocked,
          isEffectiveRevBefore,
          ruleState.config
        );
        if (!ruleState.table.isSequenceLocked && seqLock.isSequenceLocked) {
          events.push({ type: 'SEQUENCE_LOCKED' });
        }

        nextTable = {
          lastPlay: currentMeld,
          lockedSuits,
          isSequenceLocked: seqLock.isSequenceLocked,
          requiredNextRank: seqLock.requiredNextRank,
          passedPlayerIds: [],
        };
        nextTurnPlayerId = this.findNextActivePlayerId(nextPlayers, playerId, nextTurnDirection, skipCount);

        // Check 7-pass or 10-discard triggers
        if (!playerFinished && remainingHand.length > 0) {
          if (ruleState.config.sevenPass && countSeven(playedCards) > 0) {
            const count = Math.min(countSeven(playedCards), remainingHand.length);
            const targetPlayerId = this.findNextActivePlayerId(nextPlayers, playerId, nextTurnDirection, 0);
            if (targetPlayerId) {
              nextPendingHandAction = {
                type: 'SEVEN_PASS',
                playerId,
                targetPlayerId,
                count,
              };
              nextTurnPlayerId = playerId;
            }
          } else if (ruleState.config.tenDiscard && countTen(playedCards) > 0) {
            const count = Math.min(countTen(playedCards), remainingHand.length);
            nextPendingHandAction = {
              type: 'TEN_DISCARD',
              playerId,
              count,
            };
            nextTurnPlayerId = playerId;
          }
        }
      }
    }

    // Check game over
    const activeRemaining = nextPlayers.filter((p) => !p.isFinished);
    let isGameOver = context.isGameOver;

    const isInsufficientPlayers =
      action.type === 'SURRENDER' && activeRemaining.length < this.minPlayers;

    if (activeRemaining.length <= 1 || isInsufficientPlayers) {
      isGameOver = true;
      if (isInsufficientPlayers) {
        events.push({
          type: 'GAME_OVER_INSUFFICIENT_PLAYERS',
          payload: { message: '人数不足のためゲームを終了しました' },
        });
      }

      const sortedRemaining = [...activeRemaining].sort(
        (a, b) => a.hand.length - b.hand.length
      );
      for (const remaining of sortedRemaining) {
        if (!nextRankings.includes(remaining.id)) {
          nextRankings.push(remaining.id);
        }
      }

      nextPlayers = nextPlayers.map((p) => {
        const rankIdx = nextRankings.indexOf(p.id);
        if (rankIdx !== -1 && !p.isFinished) {
          return { ...p, isFinished: true, rankPosition: rankIdx + 1 };
        }
        return p;
      });

      nextTurnPlayerId = null;

      // Settle chips if chipsMode is enabled
      if (ruleState.config.chipsMode) {
        const settlement = settleChips({
          players: nextPlayers,
          rankings: nextRankings,
          foulPlayerIds: nextFoulPlayers,
          pot: ruleState.pot,
          config: ruleState.config,
        });
        nextPlayers = settlement.nextPlayers;
        nextPot = settlement.pot;
      }

      if (nextGekokujo) {
        nextRankings = [...nextRankings].reverse();
      }

      events.push({
        type: 'GAME_OVER',
        payload: {
          rankings: [...nextRankings, ...nextFoulPlayers],
          foulPlayerIds: nextFoulPlayers,
        },
      });
    }

    const nextContext: BaseGameContext = {
      gameId: context.gameId,
      players: nextPlayers,
      currentTurnPlayerId: nextTurnPlayerId,
      isGameOver,
      winnerPlayerIds: [...nextRankings, ...nextFoulPlayers],
    };

    const nextRuleState: DaifugoRuleState = {
      config: ruleState.config,
      isRevolution: nextRevolution,
      isElevenBack: nextElevenBack,
      turnDirection: nextTurnDirection,
      isSequenceLocked: nextTable.isSequenceLocked,
      isGekokujo: nextGekokujo,
      previousRankings: ruleState.previousRankings,
      pendingHandAction: nextPendingHandAction,
      table: nextTable,
      rankings: nextRankings,
      foulPlayerIds: nextFoulPlayers,
      pot: isGameOver ? nextPot : ruleState.pot,
    };

    return { nextContext, nextRuleState, events };
  }

  sanitizeForPlayer(
    context: Readonly<BaseGameContext>,
    ruleState: Readonly<DaifugoRuleState>,
    viewerPlayerId: string
  ): SanitizedState<DaifugoRuleState> {
    const sanitizedPlayers: SanitizedPlayerState[] = context.players.map((p) => {
      const isViewer = p.id === viewerPlayerId;
      return {
        id: p.id,
        name: p.name,
        handCount: p.hand.length,
        hand: isViewer ? p.hand : undefined,
        isFinished: p.isFinished,
        rankPosition: p.rankPosition,
        chips: p.chips,
      };
    });

    const sanitizedContext: SanitizedBaseGameContext = {
      gameId: context.gameId,
      players: sanitizedPlayers,
      currentTurnPlayerId: context.currentTurnPlayerId,
      isGameOver: context.isGameOver,
      winnerPlayerIds: context.winnerPlayerIds,
    };

    return {
      context: sanitizedContext,
      ruleState,
    };
  }

  private recordPlayerFinish(
    playerId: string,
    players: readonly PlayerState[],
    rankings: readonly string[],
    foulPlayers: readonly string[],
    config: DaifugoConfig,
    previousRankings?: readonly string[]
  ): {
    players: PlayerState[];
    rankings: string[];
    foulPlayers: string[];
    isGekokujo: boolean;
    events: GameEvent[];
  } {
    let nextPlayers = [...players];
    let nextRankings = [...rankings];
    let nextFoulPlayers = [...foulPlayers];
    let nextGekokujo = false;
    const events: GameEvent[] = [];

    if (nextRankings.length === 0) {
      if (config.gekokujo && previousRankings && previousRankings.length > 0) {
        const prevDaihinmin = previousRankings[previousRankings.length - 1];
        if (playerId === prevDaihinmin) {
          nextGekokujo = true;
          events.push({ type: 'GEKOKUJO', payload: { playerId } });
        }
      }

      if (config.miyakoOchi && previousRankings && previousRankings.length > 0) {
        const prevDaifugo = previousRankings[0];
        if (prevDaifugo && prevDaifugo !== playerId) {
          events.push({ type: 'MIYAKO_OCHI', payload: { playerId: prevDaifugo } });
          const totalPlayers = nextPlayers.length;
          nextPlayers = nextPlayers.map((p) =>
            p.id === prevDaifugo
              ? { ...p, hand: [], isFinished: true, rankPosition: totalPlayers }
              : p
          );
          nextFoulPlayers.push(prevDaifugo);
        }
      }
    }

    nextRankings.push(playerId);
    events.push({
      type: 'PLAYER_FINISHED',
      payload: { playerId, rank: nextRankings.length },
    });

    nextPlayers = nextPlayers.map((p) =>
      p.id === playerId
        ? { ...p, isFinished: true, rankPosition: nextRankings.length }
        : p
    );

    return {
      players: nextPlayers,
      rankings: nextRankings,
      foulPlayers: nextFoulPlayers,
      isGekokujo: nextGekokujo,
      events,
    };
  }

  private findNextActivePlayerId(
    players: readonly PlayerState[],
    fromPlayerId: string,
    direction: 1 | -1 = 1,
    skipCount: number = 0
  ): string | null {
    const total = players.length;
    const startIndex = players.findIndex((p) => p.id === fromPlayerId);
    if (startIndex === -1) return null;

    let skipped = 0;
    for (let i = 1; i <= total * 2; i++) {
      const nextIdx = (startIndex + i * direction + total * 100) % total;
      const candidate = players[nextIdx]!;
      if (!candidate.isFinished) {
        if (skipped < skipCount) {
          skipped++;
          continue;
        }
        return candidate.id;
      }
    }
    return null;
  }
}
