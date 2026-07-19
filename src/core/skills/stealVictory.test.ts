import { describe, expect, it } from 'vitest';
import { MahjongGame } from '../MahjongGame.js';
import { buildPlayerView } from '../playerView.js';
import type { Tile } from '../types.js';
import {
  isBlackHandJudgmentHonorTile,
  LING_SHI_DA_ZONG_TONG_ID,
  STEAL_VICTORY_SKILL_ID,
} from './stealVictory.js';

let id = 0;
function t(suit: Tile['suit'], rank: number): Tile {
  return { id: `t${++id}`, suit, rank };
}

type GameInternals = MahjongGame & {
  phase: string;
  currentPlayer: number;
  drawMode: string | null;
  players: { hand: Tile[]; discards: Tile[]; melds: unknown[] }[];
  deck: Tile[];
  blackHandTarget: number | null;
  blackHandOwner: number | null;
  blackHandJudgmentPending: boolean;
};

describe('steal victory skill', () => {
  it('判定字牌包含风牌与中/发，不含白板', () => {
    expect(isBlackHandJudgmentHonorTile({ suit: 'feng', rank: 1 })).toBe(true);
    expect(isBlackHandJudgmentHonorTile({ suit: 'dragon', rank: 1 })).toBe(true);
    expect(isBlackHandJudgmentHonorTile({ suit: 'dragon', rank: 2 })).toBe(true);
    expect(isBlackHandJudgmentHonorTile({ suit: 'dragon', rank: 3 })).toBe(false);
    expect(isBlackHandJudgmentHonorTile({ suit: 'wan', rank: 1 })).toBe(false);
  });

  it('摸牌后不自动弹出，点击技能后可选黑手目标', () => {
    const game = new MahjongGame();
    game.start(0, [LING_SHI_DA_ZONG_TONG_ID, '', '', '']);

    const internal = game as unknown as GameInternals;
    internal.phase = 'draw';
    internal.currentPlayer = 0;
    internal.drawMode = null;
    internal.deck = [t('wan', 9)];

    game.drawCard();

    let snap = game.getSnapshot();
    expect(snap.phase).toBe('discard');
    expect(snap.skillMode).toBeNull();

    expect(game.activateSkill(STEAL_VICTORY_SKILL_ID)).toBe(true);
    snap = game.getSnapshot();
    expect(snap.skillMode).toEqual({ skillId: STEAL_VICTORY_SKILL_ID, step: 'pick_target' });

    const view = buildPlayerView(snap, 0);
    expect(view.skillActivity?.step).toBe('pick_target');
    expect(view.skillActivity?.pickableTargets).toEqual([1, 2, 3]);
  });

  it('摸牌后可指定黑手目标', () => {
    const game = new MahjongGame();
    game.start(0, [LING_SHI_DA_ZONG_TONG_ID, '', '', '']);

    const internal = game as unknown as GameInternals;
    internal.phase = 'discard';
    internal.currentPlayer = 0;

    expect(game.activateSkill(STEAL_VICTORY_SKILL_ID)).toBe(true);
    expect(game.resolveSkillPick({ targetPlayer: 2 })).toBe(true);

    const snap = game.getSnapshot();
    expect(snap.skillMode).toBeNull();
    expect(snap.blackHandTarget).toBe(2);
    expect(snap.blackHandOwner).toBe(0);
  });

  it('黑手判定失败时原胡牌者获胜', () => {
    const game = new MahjongGame();
    game.start(0, [LING_SHI_DA_ZONG_TONG_ID, '', '', '']);

    const internal = game as unknown as GameInternals;
    internal.blackHandTarget = 1;
    internal.blackHandOwner = 0;
    internal.blackHandJudgmentPending = true;
    internal.phase = 'discard';
    internal.currentPlayer = 1;
    internal.players[1].hand = [
      t('wan', 1), t('wan', 2), t('wan', 3),
      t('wan', 4), t('wan', 5), t('wan', 6),
      t('tong', 2), t('tong', 3), t('tong', 4),
      t('tiao', 5), t('tiao', 5), t('tiao', 5),
      t('feng', 1), t('feng', 1),
    ];
    internal.deck = [t('feng', 2)];

    const winTile = internal.players[1].hand[13];
    expect((game as unknown as { tryHu(p: number, tile: Tile, self: boolean): boolean }).tryHu(1, winTile, true)).toBe(
      true,
    );

    expect(game.getSnapshot().winner).toBe(1);
    expect(game.getSnapshot().gameOverReason).toBe('hu');
  });

  it('黑手判定成功时零食大总统获胜', () => {
    const game = new MahjongGame();
    game.start(0, [LING_SHI_DA_ZONG_TONG_ID, '', '', '']);

    const internal = game as unknown as GameInternals;
    internal.blackHandTarget = 1;
    internal.blackHandOwner = 0;
    internal.blackHandJudgmentPending = true;
    internal.phase = 'discard';
    internal.currentPlayer = 1;
    internal.players[1].hand = [
      t('wan', 1), t('wan', 2), t('wan', 3),
      t('wan', 4), t('wan', 5), t('wan', 6),
      t('tong', 2), t('tong', 3), t('tong', 4),
      t('tiao', 5), t('tiao', 5), t('tiao', 5),
      t('feng', 1), t('feng', 1),
    ];
    internal.deck = [t('tong', 9)];

    const winTile = internal.players[1].hand[13];
    expect((game as unknown as { tryHu(p: number, tile: Tile, self: boolean): boolean }).tryHu(1, winTile, true)).toBe(
      true,
    );

    expect(game.getSnapshot().winner).toBe(0);
    expect(game.getSnapshot().gameOverReason).toBe('skill_steal');
  });
});
