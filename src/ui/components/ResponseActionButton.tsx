import type { ResponseOption, Tile as TileType } from '@/core/types';
import { ACTION_LABELS } from '../utils/tileLabels';
import { MiniTile } from './MiniTile';

interface ResponseActionButtonProps {
  option: ResponseOption;
  discardTile: TileType;
  onClick: () => void;
}

export function ResponseActionButton({ option, discardTile, onClick }: ResponseActionButtonProps) {
  const label = ACTION_LABELS[option.action] ?? option.action;

  return (
    <button
      type="button"
      className={`btn btn--respond btn--${option.action}`}
      onClick={onClick}
    >
      <span className="btn__label">{label}</span>
      {option.action === 'chi' && option.chiTiles && (
        <span className="btn__tiles">
          {option.chiTiles.map((t) => (
            <MiniTile key={t.id} tile={t} />
          ))}
          <MiniTile tile={discardTile} />
        </span>
      )}
    </button>
  );
}
