import type { Tile as TileType, WildcardConfig } from '@/core/types';
import { isWildcardTile } from '@/core/wildcard';
import { Tile, type TileSize } from './Tile';

interface TileRowProps {
  tiles: TileType[];
  faceDown?: boolean;
  size?: TileSize;
  onTileClick?: (tile: TileType) => void;
  spaced?: boolean;
  grid?: boolean;
  gridCols?: 3 | 6;
  maxTiles?: number;
  handColumns?: 2;
  wildcard?: WildcardConfig | null;
  highlightTileId?: string | null;
}

export function TileRow({
  tiles,
  faceDown = false,
  size = 'md',
  onTileClick,
  spaced = false,
  grid = false,
  gridCols = 6,
  maxTiles,
  handColumns,
  wildcard,
  highlightTileId,
}: TileRowProps) {
  const visible = maxTiles ? tiles.slice(-maxTiles) : tiles;
  const hiddenCount = maxTiles && tiles.length > maxTiles ? tiles.length - maxTiles : 0;

  const className = [
    'tile-row',
    'tile-row--horizontal',
    spaced ? 'tile-row--spaced' : '',
    grid ? `tile-row--grid tile-row--grid-${gridCols}` : '',
    handColumns === 2 ? 'tile-row--hand-2col' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      {hiddenCount > 0 && <span className="tile-row__more">+{hiddenCount}</span>}
      {visible.map((tile) => (
        <Tile
          key={tile.id}
          tile={tile}
          faceDown={faceDown}
          size={size}
          isWildcard={!faceDown && wildcard ? isWildcardTile(tile, wildcard) : false}
          isDrawn={highlightTileId === tile.id}
          onClick={onTileClick ? () => onTileClick(tile) : undefined}
        />
      ))}
    </div>
  );
}
