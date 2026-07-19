import { describe, expect, it } from 'vitest';
import { MahjongGame } from './MahjongGame.js';
import type { Tile } from './types.js';

let id = 0;
function t(suit: Tile['suit'], rank: number): Tile {
  return { id: `t${++id}`, suit, rank };
}

type GameInternals = MahjongGame & {
  phase: string;
  players: { hand: Tile[]; discards: Tile[]; melds: { type: string; tiles: Tile[] }[] }[];
  deck: Tile[];
};

describe('concealed kong', () => {
  it('出牌阶段可暗杠四张相同牌并补摸', () => {
    const game = new MahjongGame();
    game.start(0, ['', '', '', '']);

    const internal = game as unknown as GameInternals;
    internal.phase = 'discard';
    internal.players[0].hand = [
      t('tong', 5),
      t('tong', 5),
      t('tong', 5),
      t('tong', 5),
      t('wan', 1),
    ];
    internal.deck = [t('tiao', 9)];

    expect(game.declareConcealedKong({ suit: 'tong', rank: 5 })).toBe(true);

    const after = game.getSnapshot();
    expect(after.players[0].melds).toHaveLength(1);
    expect(after.players[0].melds[0].type).toBe('kong');
    expect(after.players[0].melds[0].tiles).toHaveLength(4);
    expect(after.players[0].hand).toHaveLength(2);
    expect(after.players[0].hand.some((tile) => tile.suit === 'tiao' && tile.rank === 9)).toBe(true);
    expect(after.phase).toBe('discard');
  });
});
