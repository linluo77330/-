import type { WinHandDisplay } from '@/core/winDecompose';
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
  handRows?: 2;
  scrollHorizontal?: boolean;
  wildcard?: WildcardConfig | null;
  highlightTileId?: string | null;
  selectedTileId?: string | null;
  winHandDisplay?: WinHandDisplay | null;
}

const GROUP_LABELS: Record<string, string> = {
  pair: '将',
  triplet: '刻',
  sequence: '顺',
  seven_pair: '对',
  loose: '打',
};

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
  handRows,
  scrollHorizontal = false,
  wildcard,
  highlightTileId,
  selectedTileId = null,
  winHandDisplay,
}: TileRowProps) {
  const visible = maxTiles && !scrollHorizontal ? tiles.slice(-maxTiles) : tiles;
  const hiddenCount =
    maxTiles && !scrollHorizontal && tiles.length > maxTiles ? tiles.length - maxTiles : 0;

  const className = [
    'tile-row',
    'tile-row--horizontal',
    spaced ? 'tile-row--spaced' : '',
    grid && !scrollHorizontal ? `tile-row--grid tile-row--grid-${gridCols}` : '',
    handColumns === 2 ? 'tile-row--hand-2col' : '',
    handRows === 2 ? 'tile-row--hand-2row' : '',
    scrollHorizontal ? 'tile-row--scroll-x' : '',
    winHandDisplay ? 'tile-row--win-grouped' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const renderTile = (tile: TileType) => (
    <Tile
      key={tile.id}
      tile={tile}
      faceDown={faceDown}
      size={size}
      isWildcard={!faceDown && wildcard ? isWildcardTile(tile, wildcard) : false}
      isDrawn={highlightTileId === tile.id}
      selected={selectedTileId === tile.id}
      onClick={onTileClick ? () => onTileClick(tile) : undefined}
    />
  );

  if (winHandDisplay && !faceDown) {
    const tileById = new Map(tiles.map((tile) => [tile.id, tile]));
    const groupedIds = new Set(winHandDisplay.groups.flatMap((group) => group.tileIds));
    const looseIds = winHandDisplay.looseTileIds ?? [];
    const ungrouped = visible.filter(
      (tile) => !groupedIds.has(tile.id) && !looseIds.includes(tile.id),
    );

    return (
      <div className={className}>
        {hiddenCount > 0 && <span className="tile-row__more">+{hiddenCount}</span>}
        {winHandDisplay.groups.map((group, index) => (
          <div
            key={`${group.kind}-${index}`}
            className={`hand-win-group hand-win-group--${group.kind}`}
            title={GROUP_LABELS[group.kind]}
          >
            <span className="hand-win-group__label">{GROUP_LABELS[group.kind]}</span>
            {group.tileIds.map((id) => {
              const tile = tileById.get(id);
              return tile ? renderTile(tile) : null;
            })}
          </div>
        ))}
        {looseIds.map((id) => {
          const tile = tileById.get(id);
          if (!tile) return null;
          return (
            <div key={id} className="hand-win-group hand-win-group--loose" title={GROUP_LABELS.loose}>
              <span className="hand-win-group__label">{GROUP_LABELS.loose}</span>
              {renderTile(tile)}
            </div>
          );
        })}
        {ungrouped.map((tile) => renderTile(tile))}
      </div>
    );
  }

  return (
    <div className={className}>
      {hiddenCount > 0 && <span className="tile-row__more">+{hiddenCount}</span>}
      {visible.map((tile) => renderTile(tile))}
    </div>
  );
}
