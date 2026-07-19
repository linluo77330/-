import type { SkillViewState } from '@/core/types';
import type { Character } from '../data/characters';

interface CharacterBattleBarProps {
  character: Character;
  skill: SkillViewState | null;
  isMyTurn: boolean;
  phase: string;
  onDrawWall?: () => void;
  onActivateSkill?: (skillId: string) => void;
  onShowSkillInfo?: () => void;
}

export function CharacterBattleBar({
  character,
  skill,
  isMyTurn,
  phase,
  onDrawWall,
  onActivateSkill,
  onShowSkillInfo,
}: CharacterBattleBarProps) {
  const canShowSkill = character.skill !== null && skill !== null;
  const skillReady =
    canShowSkill && skill.canActivate && isMyTurn && phase === skill.activatePhase;

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

          {phase === 'draw' && isMyTurn && skill.canActivate && skill.activatePhase === 'draw' && (
            <button type="button" className="btn btn--ghost" onClick={onDrawWall}>
              摸牌墙
            </button>
          )}

          <button
            type="button"
            className={`btn character-battle-bar__skill-btn ${skillReady ? 'character-battle-bar__skill-btn--ready' : ''}`}
            disabled={!skillReady}
            onClick={() => onActivateSkill?.(skill.skillId)}
            title={skill.skillDescription}
          >
            {skill.skillName}
          </button>
        </div>
      )}
    </div>
  );
}
