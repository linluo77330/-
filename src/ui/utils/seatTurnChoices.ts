import type { PlayerIndex, PlayerView } from '@/core/types';

export interface SeatTurnChoice {
  id: string;
  label: string;
  hint?: string;
  tone?: 'skill' | 'default';
  onSelect: () => void;
}

export function buildDrawPhaseChoices(
  view: PlayerView,
  humanPlayer: PlayerIndex,
  onDrawWall?: () => void,
  onActivateSkill?: (skillId: string) => void,
): SeatTurnChoice[] | undefined {
  if (
    view.phase !== 'draw' ||
    view.drawMode !== 'choose' ||
    view.currentPlayer !== humanPlayer ||
    view.skillActivity
  ) {
    return undefined;
  }

  const choices: SeatTurnChoice[] = [];

  if (view.skill?.canActivate && view.skill.activatePhase === 'draw' && onActivateSkill) {
    choices.push({
      id: 'skill',
      label: `发动「${view.skill.skillName}」`,
      hint: '技能',
      tone: 'skill',
      onSelect: () => onActivateSkill(view.skill!.skillId),
    });
  }

  if (onDrawWall) {
    choices.push({
      id: 'draw-wall',
      label: '摸牌墙',
      hint: '正常摸牌',
      tone: 'default',
      onSelect: onDrawWall,
    });
  }

  return choices.length > 0 ? choices : undefined;
}
