import { describe, expect, it, vi } from 'vitest';
import { buildDrawPhaseChoices } from './seatTurnChoices';
import type { PlayerView } from '@/core/types';

function baseView(overrides: Partial<PlayerView> = {}): PlayerView {
  return {
    phase: 'draw',
    drawMode: 'choose',
    currentPlayer: 0,
    skillActivity: null,
    skill: {
      characterId: 'jue_wang_de_wen_mang',
      skillId: 'cant_read',
      skillName: '我看不懂啊',
      skillDescription: '',
      usesRemaining: 0,
      maxUses: 0,
      limited: false,
      canActivate: true,
      activatePhase: 'draw',
    },
    ...overrides,
  } as PlayerView;
}

describe('buildDrawPhaseChoices', () => {
  it('returns skill and draw-wall choices during draw choose', () => {
    const onDrawWall = vi.fn();
    const onActivateSkill = vi.fn();

    const choices = buildDrawPhaseChoices(baseView(), 0, onDrawWall, onActivateSkill);

    expect(choices).toHaveLength(2);
    expect(choices![0].id).toBe('skill');
    expect(choices![1].id).toBe('draw-wall');

    choices![0].onSelect();
    choices![1].onSelect();
    expect(onActivateSkill).toHaveBeenCalledWith('cant_read');
    expect(onDrawWall).toHaveBeenCalled();
  });

  it('returns undefined outside draw choose', () => {
    expect(buildDrawPhaseChoices(baseView({ drawMode: null }), 0, vi.fn(), vi.fn())).toBeUndefined();
    expect(buildDrawPhaseChoices(baseView({ phase: 'discard' }), 0, vi.fn(), vi.fn())).toBeUndefined();
  });

  it('returns only draw-wall when skill cannot activate', () => {
    const choices = buildDrawPhaseChoices(
      baseView({ skill: { ...baseView().skill!, canActivate: false } }),
      0,
      vi.fn(),
      vi.fn(),
    );

    expect(choices).toHaveLength(1);
    expect(choices![0].id).toBe('draw-wall');
  });
});
