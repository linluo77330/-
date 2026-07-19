import { describe, expect, it } from 'vitest';
import { MahjongGame } from '../MahjongGame.js';
import { buildPlayerView } from '../playerView.js';
import type { Tile } from '../types.js';
import {
  BORROW_TILE_SKILL_ID,
  JIE_DONG_XI_ZHI_REN_ID,
  resetBorrowTileTurnUsage,
} from './borrowTile.js';

let id = 0;
function t(suit: Tile['suit'], rank: number): Tile {
  return { id: `t${++id}`, suit, rank };
}

type GameInternals = MahjongGame & {
  phase: string;
  currentPlayer: number;
  players: { hand: Tile[]; discards: Tile[]; melds: unknown[] }[];
  skillUses: number[];
};

describe('borrow tile skill', () => {
  it('选手牌与目标后互换，发动者仍可正常出牌', () => {
    const game = new MahjongGame();
    game.start(0, [JIE_DONG_XI_ZHI_REN_ID, '', '', '']);

    const internal = game as unknown as GameInternals;
    internal.phase = 'discard';
    internal.currentPlayer = 0;
    internal.players[0].hand = [t('wan', 5), t('tong', 1)];
    internal.players[1].hand = [t('tiao', 3)];

    expect(game.activateSkill(BORROW_TILE_SKILL_ID)).toBe(true);

    const offered = internal.players[0].hand[0];
    expect(game.resolveSkillPick({ tileId: offered.id })).toBe(true);

    const view = buildPlayerView(game.getSnapshot(), 0);
    expect(view.skillActivity?.step).toBe('pick_target');

    expect(game.resolveSkillPick({ targetPlayer: 1 })).toBe(true);

    const snap = game.getSnapshot();
    expect(snap.phase).toBe('discard');
    expect(snap.skillMode).toBeNull();
    expect(snap.skillUses[0]).toBe(1);
    expect(snap.players[0].hand.some((tile) => tile.suit === 'tiao' && tile.rank === 3)).toBe(true);
    expect(snap.players[0].hand.some((tile) => tile.id === offered.id)).toBe(false);
    expect(snap.players[1].hand.some((tile) => tile.id === offered.id)).toBe(true);
    expect(snap.players[1].hand.some((tile) => tile.suit === 'tiao' && tile.rank === 3)).toBe(false);
  });

  it('发动技能后分步弹出选手牌与选玩家界面', () => {
    const game = new MahjongGame();
    game.start(0, [JIE_DONG_XI_ZHI_REN_ID, '', '', '']);

    const internal = game as unknown as GameInternals;
    internal.phase = 'discard';
    internal.currentPlayer = 0;
    internal.players[0].hand = [t('wan', 2)];
    internal.players[1].hand = [t('feng', 1), t('feng', 2)];
    internal.players[2].hand = [];
    internal.players[3].hand = [];

    game.activateSkill(BORROW_TILE_SKILL_ID);
    const handView = buildPlayerView(game.getSnapshot(), 0);
    expect(handView.skillActivity?.step).toBe('pick_hand');
    expect(handView.skillActivity?.pickableHandTiles).toHaveLength(1);

    game.resolveSkillPick({ tileId: internal.players[0].hand[0].id });
    const targetView = buildPlayerView(game.getSnapshot(), 0);
    expect(targetView.skillActivity?.step).toBe('pick_target');
    expect(targetView.skillActivity?.pickableTargets).toEqual([1]);
    expect(targetView.skillActivity?.previewTiles?.[0]).toMatchObject({ suit: 'wan', rank: 2 });
  });

  it('本回合已使用后无法再次发动', () => {
    const game = new MahjongGame();
    game.start(0, [JIE_DONG_XI_ZHI_REN_ID, '', '', '']);

    const internal = game as unknown as GameInternals;
    internal.phase = 'discard';
    internal.currentPlayer = 0;
    internal.skillUses[0] = 1;
    internal.players[0].hand = [t('wan', 1)];
    internal.players[1].hand = [t('wan', 2)];

    expect(game.activateSkill(BORROW_TILE_SKILL_ID)).toBe(false);
  });

  it('每回合限一次，新回合开始后可再次发动', () => {
    const game = new MahjongGame();
    game.start(0, [JIE_DONG_XI_ZHI_REN_ID, '', '', '']);

    const internal = game as unknown as GameInternals;
    internal.phase = 'discard';
    internal.currentPlayer = 0;
    internal.skillUses[0] = 1;
    internal.players[0].hand = [t('wan', 1)];
    internal.players[1].hand = [t('wan', 2)];

    expect(game.activateSkill(BORROW_TILE_SKILL_ID)).toBe(false);

    resetBorrowTileTurnUsage(
      internal.skillUses as GameInternals['skillUses'],
      [JIE_DONG_XI_ZHI_REN_ID, '', '', ''],
      0,
    );
    internal.phase = 'discard';
    expect(game.activateSkill(BORROW_TILE_SKILL_ID)).toBe(true);
  });

  it('无可用目标时无法发动', () => {
    const game = new MahjongGame();
    game.start(0, [JIE_DONG_XI_ZHI_REN_ID, '', '', '']);

    const internal = game as unknown as GameInternals;
    internal.phase = 'discard';
    internal.currentPlayer = 0;
    internal.players[0].hand = [t('wan', 1)];
    internal.players[1].hand = [];
    internal.players[2].hand = [];
    internal.players[3].hand = [];

    expect(game.activateSkill(BORROW_TILE_SKILL_ID)).toBe(false);
  });
});
