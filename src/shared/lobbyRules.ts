import type { SeatInfo } from './protocol.js';

type SeatCharacterCheck = Pick<SeatInfo, 'kind' | 'characterId'>;

/** 统计人类玩家中重复选择的角色 id */
export function getDuplicateCharacterIds(seats: SeatCharacterCheck[]): string[] {
  const counts = new Map<string, number>();
  for (const seat of seats) {
    if (seat.kind !== 'human' || !seat.characterId) continue;
    counts.set(seat.characterId, (counts.get(seat.characterId) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
}

export function hasDuplicateCharacters(seats: SeatCharacterCheck[]): boolean {
  return getDuplicateCharacterIds(seats).length > 0;
}
