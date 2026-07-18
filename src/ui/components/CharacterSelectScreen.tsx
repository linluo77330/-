import { useState } from 'react';
import { CHARACTERS, type Character } from '../data/characters';

interface CharacterSelectScreenProps {
  onConfirm: (character: Character) => void;
}

export function CharacterSelectScreen({ onConfirm }: CharacterSelectScreenProps) {
  const [selected, setSelected] = useState<Character | null>(null);

  return (
    <div className="character-select">
      <div className="character-select__panel">
        <header className="character-select__header">
          <h1>技能麻将</h1>
          <p className="character-select__sub">选择角色后开始对局（技能系统待接入）</p>
        </header>

        <div className="character-select__grid">
          {CHARACTERS.map((character) => (
            <button
              key={character.id}
              type="button"
              className={`character-card ${selected?.id === character.id ? 'character-card--selected' : ''}`}
              style={{ '--char-accent': character.accent } as React.CSSProperties}
              onClick={() => setSelected(character)}
            >
              <span className="character-card__avatar" style={{ background: character.accent }}>
                {character.name.slice(-1)}
              </span>
              <span className="character-card__name">{character.name}</span>
              <span className="character-card__tagline">{character.tagline}</span>
            </button>
          ))}
        </div>

        <div className="character-select__preview">
          {selected ? (
            <>
              <span className="character-select__preview-label">已选：</span>
              <strong>{selected.name}</strong>
              <span className="character-select__preview-note">{selected.tagline}</span>
            </>
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
          进入对局
        </button>
      </div>
    </div>
  );
}
