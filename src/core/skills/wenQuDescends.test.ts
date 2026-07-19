import { describe, expect, it } from 'vitest';
import { MahjongGame } from '../MahjongGame.js';
import { buildPlayerView } from '../playerView.js';
import type { Tile } from '../types.js';
import {
  WEN_QU_DESCENDS_SKILL_ID,
  WEN_QU_XING_Y_ID,
} from './wenQuDescends.js';

let id = 0;
function t(suit: Tile['suit'], rank: number): Tile {
  return { id: `t${++id}`, suit, rank };
}

type GameInternals = MahjongGame & {
  phase: string;
  currentPlayer: number;
  players: { hand: Tile[]; discards: Tile[]; melds: unknown[] }[];
};

describe('wen qu descends skill', () => {
  it('可将万字牌改写为任意万字牌且仍可出牌', () => {
    const game = new MahjongGame();
    game.start(0, [WEN_QU_XING_Y_ID, '', '', '']);

    const internal = game as unknown as GameInternals;
    internal.phase = 'discard';
    internal.currentPlayer = 0;
    internal.players[0].hand = [t('wan', 1), t('tong', 2)];

    expect(game.activateSkill(WEN_QU_DESCENDS_SKILL_ID)).toBe(true);

    const source = internal.players[0].hand.find((tile) => tile.suit === 'wan')!;
    expect(game.resolveSkillPick({ tileId: source.id })).toBe(true);
    expect(game.resolveSkillPick({ tileId: 'wen-qu-wan-9' })).toBe(true);

    const snap = game.getSnapshot();
    expect(snap.phase).toBe('discard');
    expect(snap.skillMode).toBeNull();
    expect(snap.players[0].hand.some((tile) => tile.id === source.id && tile.rank === 9)).toBe(true);
  });

  it('发动后分步弹出选万字与选目标界面', () => {
    const game = new MahjongGame();
    game.start(0, [WEN_QU_XING_Y_ID, '', '', '']);

    const internal = game as unknown as GameInternals;
    internal.phase = 'discard';
    internal.currentPlayer = 0;
    internal.players[0].hand = [t('wan', 3), t('tiao', 1)];

    game.activateSkill(WEN_QU_DESCENDS_SKILL_ID);
    const handView = buildPlayerView(game.getSnapshot(), 0);
    expect(handView.skillActivity?.step).toBe('pick_hand');
    expect(handView.skillActivity?.pickableHandTiles).toHaveLength(1);

    game.resolveSkillPick({ tileId: internal.players[0].hand[0].id });
    const rankView = buildPlayerView(game.getSnapshot(), 0);
    expect(rankView.skillActivity?.step).toBe('pick_wan_rank');
    expect(rankView.skillActivity?.previewTiles).toHaveLength(9);
  });

  it('没有万字牌时无法发动', () => {
    const game = new MahjongGame();
    game.start(0, [WEN_QU_XING_Y_ID, '', '', '']);

    const internal = game as unknown as GameInternals;
    internal.phase = 'discard';
    internal.currentPlayer = 0;
    internal.players[0].hand = [t('tong', 1)];

    expect(game.activateSkill(WEN_QU_DESCENDS_SKILL_ID)).toBe(false);
  });

  it('限定技只能使用三次', () => {
    const game = new MahjongGame();
    game.start(0, [WEN_QU_XING_Y_ID, '', '', '']);

    const internal = game as unknown as GameInternals;
    internal.phase = 'discard';
    internal.currentPlayer = 0;
    internal.skillUses[0] = 3;
    internal.players[0].hand = [t('wan', 1)];

    expect(game.activateSkill(WEN_QU_DESCENDS_SKILL_ID)).toBe(false);
  });
});
