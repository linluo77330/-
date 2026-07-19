import type { PlayerIndex, PlayerView } from '@/core/types';
import { STEAL_VICTORY_SKILL_ID } from '@/core/skills/stealVictory';

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

export function buildSkillConfirmChoices(
  view: PlayerView,
  humanPlayer: PlayerIndex,
  useMobileInlineConfirm: boolean,
  onSkillPick?: (params: { confirm?: boolean; skip?: boolean }) => void,
): SeatTurnChoice[] | undefined {
  if (!useMobileInlineConfirm || !view.skillActivity || !onSkillPick) {
    return undefined;
  }

  const activity = view.skillActivity;
  if (activity.player !== humanPlayer || activity.step !== 'confirm') {
    return undefined;
  }
  if (activity.skillId === STEAL_VICTORY_SKILL_ID) {
    return undefined;
  }

  return [
    {
      id: 'skill-confirm',
      label: activity.votePrompt ? '发起投票' : '确认发动',
      hint: activity.skillName,
      tone: 'skill',
      onSelect: () => onSkillPick({ confirm: true }),
    },
    {
      id: 'skill-cancel',
      label: '取消',
      hint: '返回选择',
      tone: 'default',
      onSelect: () => onSkillPick({ skip: true }),
    },
  ];
}

export function shouldUseInlineMobileSkillConfirm(
  view: PlayerView,
  humanPlayer: PlayerIndex,
  useMobileInlineConfirm: boolean,
): boolean {
  return buildSkillConfirmChoices(view, humanPlayer, useMobileInlineConfirm, () => {}) !== undefined;
}
