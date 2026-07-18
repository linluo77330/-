import { useEffect } from 'react';
import { getCharacterById } from '../data/characters';

export interface CharacterSkillInfoTarget {
  characterId: string;
  playerName: string;
  skillUsesRemaining?: number;
}

interface CharacterSkillInfoOverlayProps {
  target: CharacterSkillInfoTarget;
  onClose: () => void;
}

export function CharacterSkillInfoOverlay({ target, onClose }: CharacterSkillInfoOverlayProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const character = getCharacterById(target.characterId);
  if (!character) return null;

  const skill = character.skill;
  const showUses =
    skill !== null &&
    skill.limited &&
    target.skillUsesRemaining !== undefined &&
    skill.maxUses !== undefined;

  return (
    <div className="skill-overlay" role="dialog" aria-modal="true" aria-label="技能说明">
      <button
        type="button"
        className="skill-overlay__backdrop"
        aria-label="关闭技能说明"
        onClick={onClose}
      />
      <div className="skill-overlay__panel skill-overlay__panel--info">
        <button
          type="button"
          className="skill-overlay__close"
          onClick={onClose}
          aria-label="关闭"
        >
          ×
        </button>

        <div className="skill-overlay__header">
          <span className="skill-overlay__avatar" style={{ background: character.accent }}>
            {character.name.slice(-1)}
          </span>
          <div className="skill-overlay__meta">
            <strong className="skill-overlay__skill-name">
              {skill?.name ?? character.name}
            </strong>
            <span className="skill-overlay__character">{target.playerName}</span>
          </div>
        </div>

        {showUses && (
          <p className="skill-overlay__uses">
            技能剩余 {target.skillUsesRemaining}/{skill!.maxUses}
          </p>
        )}

        {skill ? (
          <p className="skill-overlay__desc">{skill.description}</p>
        ) : (
          <p className="skill-overlay__desc">{character.description}</p>
        )}

        {skill && (
          <p className="skill-overlay__character-desc">{character.description}</p>
        )}
      </div>
    </div>
  );
}
