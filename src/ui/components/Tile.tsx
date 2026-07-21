import type { Tile as TileType } from '@/core/types';
import { tileLabel } from '../utils/tileLabels';
import { getTileImageSrc, TILE_BACK_SRC } from '../utils/tileAssets';

export type TileSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type TileOrientation = 'horizontal' | 'vertical';

interface TileProps {
  tile: TileType;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  size?: TileSize;
  orientation?: TileOrientation;
  isWildcard?: boolean;
  isDrawn?: boolean;
  onClick?: () => void;
}

const SIZE_MAP: Record<TileSize, { w: number; h: number }> = {
  xs: { w: 22, h: 30 },
  sm: { w: 28, h: 38 },
  md: { w: 36, h: 49 },
  lg: { w: 46, h: 63 },
  xl: { w: 56, h: 76 },
};

export function Tile({
  tile,
  faceDown = false,
  selected = false,
  disabled = false,
  size = 'md',
  orientation = 'horizontal',
  isWildcard = false,
  isDrawn = false,
  onClick,
}: TileProps) {
  const dim = SIZE_MAP[size];
  const isVertical = orientation === 'vertical';
  const width = isVertical ? dim.h : dim.w;
  const height = isVertical ? dim.w : dim.h;

  const className = [
    'tile',
    `tile--${size}`,
    isVertical ? 'tile--vertical' : '',
    faceDown ? 'tile--back' : '',
    isWildcard ? 'tile--wildcard' : '',
    isDrawn ? 'tile--drawn' : '',
    selected ? 'tile--selected' : '',
    disabled ? 'tile--disabled' : '',
    onClick && !disabled ? 'tile--clickable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const src = faceDown ? TILE_BACK_SRC : getTileImageSrc(tile);

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled || !onClick}
      aria-label={faceDown ? '牌背' : tileLabel(tile)}
      style={{ width, height }}
    >
      {isDrawn && !faceDown && (
        <span className="tile__drawn-badge" aria-hidden="true">
          摸
        </span>
      )}
      <img
        className="tile__img"
        src={src}
        alt=""
        draggable={false}
        loading="lazy"
        width={dim.w}
        height={dim.h}
      />
    </button>
  );
}
