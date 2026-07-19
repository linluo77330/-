import { describe, expect, it } from 'vitest';
import { MahjongGame } from '../MahjongGame.js';
import { buildPlayerView } from '../playerView.js';
import { createWildcardConfig } from '../wildcard.js';
import type { Tile } from '../types.js';
import {
  CAI_SHEN_A_YI_ID,
  VEGETABLE_JUICE_CAISHEN_SKILL_ID,
} from './vegetableJuiceCaishen.js';

let id = 0;
function t(suit: Tile['suit'], rank: number): Tile {
  return { id: `t${++id}`, suit, rank };
}

type GameInternals = MahjongGame & {
  phase: string;
  currentPlayer: number;
  wildcard: { indicator: Tile; wildcardType: Pick<Tile, 'suit' | 'rank'> } | null;
  players: { hand: Tile[]; discards: Tile[]; melds: unknown[] }[];
  skillUses: number[];
};

describe('vegetable juice caishen skill', () => {
  it('摸牌后可选手牌替换万能牌并获得原万能牌', () => {
    const game = new MahjongGame();
    game.start(0, [CAI_SHEN_A_YI_ID, '', '', '']);

    const internal = game as unknown as GameInternals;
    internal.wildcard = createWildcardConfig(t('wan', 3));
    internal.phase = 'discard';
    internal.currentPlayer = 0;
    internal.players[0].hand = [t('wan', 5), t('tong', 1), t('tong', 2)];

    expect(game.activateSkill(VEGETABLE_JUICE_CAISHEN_SKILL_ID)).toBe(true);

    const picked = internal.players[0].hand[0];
    expect(game.resolveSkillPick({ tileId: picked.id })).toBe(true);

    const snap = game.getSnapshot();
    expect(snap.wildcard?.wildcardType).toEqual({ suit: 'wan', rank: 5 });
    expect(snap.wildcard?.indicator).toMatchObject({ suit: 'wan', rank: 5 });
    expect(snap.skillUses[0]).toBe(1);
    expect(snap.players[0].hand.some((tile) => tile.suit === 'wan' && tile.rank === 3)).toBe(true);
    expect(snap.players[0].hand.some((tile) => tile.id === picked.id)).toBe(false);
    expect(snap.skillMode).toBeNull();
  });

  it('发动技能后弹出选手牌界面', () => {
    const game = new MahjongGame();
    game.start(0, [CAI_SHEN_A_YI_ID, '', '', '']);

    const internal = game as unknown as GameInternals;
    internal.wildcard = createWildcardConfig(t('tiao', 2));
    internal.phase = 'discard';
    internal.currentPlayer = 0;
    internal.players[0].hand = [t('feng', 1)];

    game.activateSkill(VEGETABLE_JUICE_CAISHEN_SKILL_ID);
    const view = buildPlayerView(game.getSnapshot(), 0);

    expect(view.skillActivity?.step).toBe('pick_hand');
    expect(view.skillActivity?.pickableHandTiles).toHaveLength(1);
    expect(view.skillActivity?.previewTiles?.[0]).toMatchObject({ suit: 'tiao', rank: 2 });
  });

  it('限定技只能使用一次', () => {
    const game = new MahjongGame();
    game.start(0, [CAI_SHEN_A_YI_ID, '', '', '']);

    const internal = game as unknown as GameInternals;
    internal.wildcard = createWildcardConfig(t('wan', 1));
    internal.phase = 'discard';
    internal.currentPlayer = 0;
    internal.skillUses[0] = 1;
    internal.players[0].hand = [t('wan', 2)];

    expect(game.activateSkill(VEGETABLE_JUICE_CAISHEN_SKILL_ID)).toBe(false);
  });
});
