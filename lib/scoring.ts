import { PlayerEntry } from "./types";

/**
 * Computes the score for a single prediction against official standings.
 * - 3 points for an exact position match
 * - 1 point for a position off by exactly one
 * - 0 points otherwise, including players absent from official standings
 *
 * Returns a non-negative integer.
 */
export function computeScore(
  rankedList: PlayerEntry[],
  officialStandings: PlayerEntry[],
): number {
  const officialRankById: { [playerId: string]: number } = {};
  for (const entry of officialStandings) {
    officialRankById[entry.id] = entry.rank;
  }

  let total = 0;
  for (const entry of rankedList) {
    const officialRank = officialRankById[entry.id];
    if (officialRank === undefined) continue;

    const offset = Math.abs(entry.rank - officialRank);
    if (offset === 0) {
      total += 3;
    } else if (offset === 1) {
      total += 1;
    }
  }

  return total;
}
