import type { CSSProperties } from 'react';
import type { Tile as TileType } from '@/core/types';
import { Tile, type TileOrientation, type TileSize } from './Tile';

const DUMMY_TILE: TileType = { id: 'hidden-back', suit: 'wan', rank: 1 };

interface HiddenHandStackProps {
  count: number;
  size?: TileSize;
  orientation?: TileOrientation;
}

export function HiddenHandStack({
  count,
  size = 'xs',
  orientation = 'horizontal',
}: HiddenHandStackProps) {
  if (count <= 0) {
    return <div className="hidden-hand-stack hidden-hand-stack--empty">—</div>;
  }

  const layers = Math.min(4, Math.max(2, Math.ceil(count / 5)));

  return (
    <div
      className={`hidden-hand-stack hidden-hand-stack--${orientation}`}
      style={{ '--stack-layers': layers } as CSSProperties}
      aria-label={`${count} 张手牌`}
    >
      {Array.from({ length: layers }, (_, index) => (
        <div
          key={index}
          className="hidden-hand-stack__layer"
          style={{ '--stack-index': index } as CSSProperties}
        >
          <Tile tile={DUMMY_TILE} faceDown size={size} orientation={orientation} disabled />
        </div>
      ))}
      <span className="hidden-hand-stack__count">{count}</span>
    </div>
  );
}
