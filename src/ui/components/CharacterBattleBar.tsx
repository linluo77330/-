import type { SkillViewState } from '@/core/types';
import type { Character } from '../data/characters';

interface CharacterBattleBarProps {
  character: Character;
  skill: SkillViewState | null;
  onShowSkillInfo?: () => void;
}

export function CharacterBattleBar({
  character,
  skill,
  onShowSkillInfo,
}: CharacterBattleBarProps) {
  const canShowSkill = character.skill !== null && skill !== null;

  return (
    <div className="character-battle-bar">
      <div className="character-battle-bar__identity">
        <span className="character-battle-bar__avatar" style={{ background: character.accent }}>
          {character.name.slice(-1)}
        </span>
        <div className="character-battle-bar__meta">
          <strong className="character-battle-bar__name">{character.name}</strong>
          {canShowSkill && skill.limited && (
            <span className="character-battle-bar__uses">
              技能剩余 {skill.usesRemaining}/{skill.maxUses}
            </span>
          )}
        </div>
      </div>

      {canShowSkill && (
        <div className="character-battle-bar__skills">
          <button
            type="button"
            className="character-battle-bar__info btn btn--ghost"
            onClick={onShowSkillInfo}
          >
            技能说明
          </button>
        </div>
      )}
    </div>
  );
}
