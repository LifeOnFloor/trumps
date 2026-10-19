import type { PlayerState } from '../../types/engine.js';
import type { DaifugoConfig } from './config.js';

export interface SettleChipsParams {
  readonly players: readonly PlayerState[];
  readonly rankings: readonly string[];
  readonly foulPlayerIds: readonly string[];
  readonly pot?: number;
  readonly config: DaifugoConfig;
}

export interface SettleChipsResult {
  readonly nextPlayers: PlayerState[];
  readonly pot: number;
}

/**
 * Pure function to settle chips with guaranteed total conservation (zero-sum).
 */
export function settleChips(params: SettleChipsParams): SettleChipsResult {
  const { players, rankings, foulPlayerIds, config } = params;
  const currentPot = params.pot ?? 0;

  if (!config.chipsMode) {
    return { nextPlayers: [...players], pot: currentPot };
  }

  const rate = config.transferRate ?? 100;
  const settlementType = config.chipSettlementType ?? 'ranking_transfer';

  // Map to mutable chips tracker
  const chipsMap = new Map<string, number>();
  for (const p of players) {
    chipsMap.set(p.id, p.chips ?? config.initialChips ?? 1000);
  }

  if (settlementType === 'pot_split') {
    let pool = currentPot;

    // Collect foul penalties into the pool
    for (const foulId of foulPlayerIds) {
      const current = chipsMap.get(foulId) ?? 0;
      const penalty = Math.min(current, rate * 2);
      chipsMap.set(foulId, current - penalty);
      pool += penalty;
    }

    // Distribute pool to top rankings
    const winnersCount = rankings.length;
    if (winnersCount > 0 && pool > 0) {
      const firstId = rankings[0]!;
      if (winnersCount === 1) {
        // Only 1 winner takes the whole pool
        chipsMap.set(firstId, (chipsMap.get(firstId) ?? 0) + pool);
        pool = 0;
      } else if (winnersCount === 2 || winnersCount === 3) {
        const secondId = rankings[1]!;
        const firstShare = Math.floor(pool * 0.7);
        const secondShare = pool - firstShare; // Exactly zero-sum

        chipsMap.set(firstId, (chipsMap.get(firstId) ?? 0) + firstShare);
        chipsMap.set(secondId, (chipsMap.get(secondId) ?? 0) + secondShare);
        pool = 0;
      } else {
        // 4 or more players: 60% 1st, 30% 2nd, 10% 3rd
        const secondId = rankings[1]!;
        const thirdId = rankings[2]!;
        const firstShare = Math.floor(pool * 0.6);
        const secondShare = Math.floor(pool * 0.3);
        const thirdShare = pool - firstShare - secondShare; // Remainder to 3rd (zero-sum)

        chipsMap.set(firstId, (chipsMap.get(firstId) ?? 0) + firstShare);
        chipsMap.set(secondId, (chipsMap.get(secondId) ?? 0) + secondShare);
        chipsMap.set(thirdId, (chipsMap.get(thirdId) ?? 0) + thirdShare);
        pool = 0;
      }
    }

    const nextPlayers = players.map((p) => ({
      ...p,
      chips: chipsMap.get(p.id) ?? 0,
    }));

    return { nextPlayers, pot: pool };
  }

  // ranking_transfer mode
  let bonusPool = currentPot;

  // 1. Process foul penalties: transfer penalty to bonusPool (which goes to 1st place)
  for (const foulId of foulPlayerIds) {
    const current = chipsMap.get(foulId) ?? 0;
    const penalty = Math.min(current, rate * 2);
    chipsMap.set(foulId, current - penalty);
    bonusPool += penalty;
  }

  // 2. Transfer between valid finished rankings
  const validRankings = rankings.filter((id) => !foulPlayerIds.includes(id));
  const count = validRankings.length;

  if (count >= 2) {
    const firstId = validRankings[0]!;
    const lastId = validRankings[count - 1]!;

    // Last place pays 2x rate to 1st place
    const lastCurrent = chipsMap.get(lastId) ?? 0;
    const transferToFirst = Math.min(lastCurrent, rate * 2);
    chipsMap.set(lastId, lastCurrent - transferToFirst);
    chipsMap.set(firstId, (chipsMap.get(firstId) ?? 0) + transferToFirst);

    // If 4 or more players, second-to-last pays 1x rate to 2nd place
    if (count >= 4) {
      const secondId = validRankings[1]!;
      const secondLastId = validRankings[count - 2]!;
      const secondLastCurrent = chipsMap.get(secondLastId) ?? 0;
      const transferToSecond = Math.min(secondLastCurrent, rate);
      chipsMap.set(secondLastId, secondLastCurrent - transferToSecond);
      chipsMap.set(secondId, (chipsMap.get(secondId) ?? 0) + transferToSecond);
    }
  }

  // 3. 1st place takes any bonus pool (foul penalties & leftover pot)
  if (validRankings.length > 0 && bonusPool > 0) {
    const firstId = validRankings[0]!;
    chipsMap.set(firstId, (chipsMap.get(firstId) ?? 0) + bonusPool);
    bonusPool = 0;
  }

  const nextPlayers = players.map((p) => ({
    ...p,
    chips: chipsMap.get(p.id) ?? 0,
  }));

  return { nextPlayers, pot: bonusPool };
}
