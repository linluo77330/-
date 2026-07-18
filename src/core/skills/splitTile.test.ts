import { describe, expect, it } from 'vitest';
import { MahjongGame } from '../MahjongGame.js';
import { HEI_PI_TI_YU_SHENG_ID, SPLIT_TILE_SKILL_ID, isSplittableTile } from './splitTile.js';

describe('split tile skill', () => {
  it('出牌阶段可掰牌并保留所选半张', () => {
    const game = new MahjongGame();
    const chars: [string, string, string, string] = [HEI_PI_TI_YU_SHENG_ID, '', '', ''];
    game.start(0, chars);

    const source = game.getSnapshot().players[0].hand.find(isSplittableTile);
    expect(source).toBeDefined();
    if (!source) return;

    expect(game.activateSkill(SPLIT_TILE_SKILL_ID)).toBe(true);
    expect(game.resolveSkillPick({ tileId: source.id })).toBe(true);

    let snap = game.getSnapshot();
    expect(snap.skillMode?.skillId).toBe(SPLIT_TILE_SKILL_ID);

    if (snap.skillMode?.skillId === 'split_tile' && snap.skillMode.step === 'pick_split') {
      expect(game.resolveSkillPick({ splitRanks: [1, source.rank - 1] })).toBe(true);
      snap = game.getSnapshot();
    }

    expect(
      snap.skillMode?.skillId === 'split_tile' && snap.skillMode.step === 'pick_keep',
    ).toBe(true);
    if (!snap.skillMode || snap.skillMode.skillId !== 'split_tile' || snap.skillMode.step !== 'pick_keep') {
      throw new Error('expected pick_keep');
    }

    const keepId = snap.skillMode.tileA.id;
    expect(game.resolveSkillPick({ tileId: keepId })).toBe(true);

    const after = game.getSnapshot();
    expect(after.skillUses[0]).toBe(1);
    expect(after.skillMode).toBeNull();
    expect(after.phase).toBe('discard');
    expect(after.players[0].hand.some((tile) => tile.id === keepId)).toBe(true);
    expect(after.players[0].discards).toHaveLength(1);
    expect(after.players[0].hand.some((tile) => tile.id === source.id)).toBe(false);
  });
});
