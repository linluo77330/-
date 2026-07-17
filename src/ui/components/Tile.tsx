import type { Tile as TileType } from '@/core/types';
import { tileLabel } from '../utils/tileLabels';
import { TileBackFace, TileFace } from './tileArt/TileFace';

interface TileProps {
  tile: TileType;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const SIZE_MAP = { sm: 32, md: 40, lg: 52 } as const;

export function Tile({
  tile,
  faceDown = false,
  selected = false,
  disabled = false,
  size = 'md',
  onClick,
}: TileProps) {
  const width = SIZE_MAP[size];
  const height = Math.round(width * (82 / 60));

  const className = [
    'tile',
    `tile--${size}`,
    faceDown ? 'tile--back' : '',
    selected ? 'tile--selected' : '',
    disabled ? 'tile--disabled' : '',
    onClick && !disabled ? 'tile--clickable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled || !onClick}
      aria-label={faceDown ? '牌背' : tileLabel(tile)}
      style={{ width, height }}
    >
      {faceDown ? <TileBackFace tileId={tile.id} /> : <TileFace tile={tile} />}
    </button>
  );
}
