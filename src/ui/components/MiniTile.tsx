import type { Tile as TileType } from '@/core/types';
import { getTileImageSrc } from '../utils/tileAssets';

interface MiniTileProps {
  tile: TileType;
  size?: number;
}

export function MiniTile({ tile, size = 22 }: MiniTileProps) {
  const height = Math.round(size * (38 / 28));
  return (
    <span className="mini-tile">
      <img src={getTileImageSrc(tile)} alt="" width={size} height={height} draggable={false} />
    </span>
  );
}
