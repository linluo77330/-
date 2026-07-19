import { describe, expect, it } from 'vitest';
import { getDuplicateCharacterIds, hasDuplicateCharacters } from './lobbyRules.js';
import type { SeatInfo } from './protocol.js';

function seat(
  playerIndex: number,
  kind: SeatInfo['kind'],
  characterId: string,
): SeatInfo {
  return {
    playerIndex: playerIndex as SeatInfo['playerIndex'],
    kind,
    name: 'test',
    connected: true,
    ready: true,
    characterId,
  };
}

describe('lobbyRules', () => {
  it('detects duplicate human characters', () => {
    const seats = [
      seat(0, 'human', 'shou_duan_zhe'),
      seat(1, 'human', 'shou_duan_zhe'),
      seat(2, 'bot', ''),
      seat(3, 'empty', ''),
    ];
    expect(hasDuplicateCharacters(seats)).toBe(true);
    expect(getDuplicateCharacterIds(seats)).toEqual(['shou_duan_zhe']);
  });

  it('ignores bots and empty seats', () => {
    const seats = [
      seat(0, 'human', 'shou_duan_zhe'),
      seat(1, 'human', 'hei_pi_ti_yu_sheng'),
      seat(2, 'bot', ''),
      seat(3, 'bot', ''),
    ];
    expect(hasDuplicateCharacters(seats)).toBe(false);
  });
});
