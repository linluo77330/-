import { getCharacterById } from '../data/characters';

interface PlayerCharacterAvatarProps {
  characterId: string;
  onClick?: () => void;
}

export function PlayerCharacterAvatar({ characterId, onClick }: PlayerCharacterAvatarProps) {
  if (!characterId) return null;

  const character = getCharacterById(characterId);
  if (!character) return null;

  return (
    <button
      type="button"
      className="player-character-avatar"
      onClick={onClick}
      aria-label={`查看 ${character.name} 技能说明`}
      title={`查看 ${character.name} 技能说明`}
    >
      <span
        className="player-character-avatar__badge"
        style={{ background: character.accent }}
        aria-hidden
      >
        {character.name.slice(-1)}
      </span>
    </button>
  );
}
