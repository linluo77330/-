import { useEffect, useRef, useState } from 'react';
import { CHARACTERS, type Character } from '../data/characters';

interface CharacterSelectScreenProps {
  onConfirm: (character: Character) => void;
  onBack?: () => void;
  mode?: 'offline' | 'online';
}

export function CharacterSelectScreen({
  onConfirm,
  onBack,
  mode = 'offline',
}: CharacterSelectScreenProps) {
  const [selected, setSelected] = useState<Character | null>(null);
  const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    if (!selected) return;
    cardRefs.current.get(selected.id)?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [selected]);

  return (
    <div className="character-select">
      <div className="character-select__panel">
        <header className="character-select__header">
          {onBack && (
            <button type="button" className="screen-panel__back screen-panel__back--inline btn btn--ghost" onClick={onBack}>
              ← 主菜单
            </button>
          )}
          <h1>选择角色</h1>
          <p className="character-select__sub">
            {mode === 'online' ? '多人联机 · 选择角色后进入房间' : '离线单机 · 选择角色后开始对局'}
          </p>
        </header>

        <div className="character-select__carousel-wrap">
          <p className="character-select__scroll-hint">左右滑动浏览角色</p>
          <div className="character-select__carousel" role="list" aria-label="角色列表">
            {CHARACTERS.map((character) => (
              <button
                key={character.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(character.id, el);
                  else cardRefs.current.delete(character.id);
                }}
                type="button"
                role="listitem"
                className={`character-card ${selected?.id === character.id ? 'character-card--selected' : ''}`}
                style={{ '--char-accent': character.accent } as React.CSSProperties}
                onClick={() => setSelected(character)}
              >
                <span className="character-card__avatar" style={{ background: character.accent }}>
                  {character.name.slice(-1)}
                </span>
                <span className="character-card__name">{character.name}</span>
                <span className="character-card__skill">
                  {character.skill?.name ?? '无技能'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="character-select__preview">
          {selected ? (
            <div className="character-select__preview-body">
              <p className="character-select__preview-selected">
                <span className="character-select__preview-label">已选：</span>
                <strong>{selected.name}</strong>
                {selected.skill && (
                  <span className="character-select__preview-skill-inline">
                    {selected.skill.name}
                  </span>
                )}
              </p>
              <p className="character-select__preview-desc">{selected.description}</p>
              {selected.skill && (
                <div className="character-select__preview-skill">
                  <strong className="character-select__preview-skill-title">
                    {selected.skill.name}
                  </strong>
                  <p>{selected.skill.description}</p>
                </div>
              )}
            </div>
          ) : (
            <span className="character-select__preview-empty">请选择一名角色</span>
          )}
        </div>

        <button
          type="button"
          className="btn btn--primary character-select__confirm"
          disabled={!selected}
          onClick={() => selected && onConfirm(selected)}
        >
          {mode === 'online' ? '进入房间' : '进入对局'}
        </button>
      </div>
    </div>
  );
}
