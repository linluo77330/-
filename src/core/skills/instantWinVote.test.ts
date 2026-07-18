import { describe, expect, it } from 'vitest';
import { MahjongGame } from '../MahjongGame.js';
import { DUI_KANG_LU_GALUO_ID, INSTANT_WIN_VOTE_SKILL_ID } from './instantWinVote.js';

type GameInternals = MahjongGame & {
  phase: string;
  currentPlayer: number;
  drawMode: string | null;
};

describe('instant win vote skill', () => {
  it('三人全部同意后对抗路伽罗获胜', () => {
    const game = new MahjongGame();
    game.start(0, [DUI_KANG_LU_GALUO_ID, '', '', '']);

    const internal = game as unknown as GameInternals;
    internal.phase = 'draw';
    internal.currentPlayer = 0;
    internal.drawMode = 'choose';

    expect(game.activateSkill(INSTANT_WIN_VOTE_SKILL_ID)).toBe(true);
    expect(game.resolveSkillPick({ confirm: true })).toBe(true);

    expect(game.submitSkillVote(1, true)).toBe(true);
    expect(game.submitSkillVote(2, true)).toBe(true);
    expect(game.submitSkillVote(3, true)).toBe(true);

    const after = game.getSnapshot();
    expect(after.phase).toBe('game_over');
    expect(after.winner).toBe(0);
    expect(after.gameOverReason).toBe('skill_vote');
  });

  it('有人拒绝后投票失败，回合继续', () => {
    const game = new MahjongGame();
    game.start(0, [DUI_KANG_LU_GALUO_ID, '', '', '']);

    const internal = game as unknown as GameInternals;
    internal.phase = 'draw';
    internal.currentPlayer = 0;
    internal.drawMode = 'choose';

    game.activateSkill(INSTANT_WIN_VOTE_SKILL_ID);
    game.resolveSkillPick({ confirm: true });
    game.submitSkillVote(1, true);
    game.submitSkillVote(2, false);

    const after = game.getSnapshot();
    expect(after.phase).toBe('draw');
    expect(after.currentPlayer).toBe(0);
    expect(after.skillMode).toBeNull();
    expect(after.drawMode).toBe('choose');
    expect(after.winner).toBeNull();
  });
});
