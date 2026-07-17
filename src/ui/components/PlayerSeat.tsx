import type { Meld, PlayerIndex, PlayerState, Tile as TileType } from '@/core/types';
import { ACTION_LABELS } from '../utils/tileLabels';
import { Tile } from './Tile';

interface TileRowProps {
  tiles: TileType[];
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onTileClick?: (tile: TileType) => void;
  horizontal?: boolean;
}

export function TileRow({
  tiles,
  faceDown,
  size = 'md',
  onTileClick,
  horizontal = true,
}: TileRowProps) {
  return (
    <div className={`tile-row ${horizontal ? 'tile-row--h' : 'tile-row--v'}`}>
      {tiles.map((tile) => (
        <Tile
          key={tile.id}
          tile={tile}
          faceDown={faceDown}
          size={size}
          onClick={onTileClick ? () => onTileClick(tile) : undefined}
        />
      ))}
    </div>
  );
}

interface MeldGroupProps {
  melds: Meld[];
  size?: 'sm' | 'md';
}

export function MeldGroup({ melds, size = 'sm' }: MeldGroupProps) {
  if (melds.length === 0) return null;
  return (
    <div className="meld-group">
      {melds.map((meld, i) => (
        <div key={`${meld.type}-${i}`} className={`meld-group__item meld-group__item--${meld.type}`}>
          <span className="meld-group__label">{ACTION_LABELS[meld.type] ?? meld.type}</span>
          <div className="meld-group__tiles">
            {meld.tiles.map((tile, ti) => (
              <div
                key={tile.id}
                className={`meld-tile ${ti === meld.tiles.length - 1 && meld.type !== 'kong' ? 'meld-tile--claimed' : ''}`}
              >
                <Tile tile={tile} size={size} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface PlayerSeatProps {
  playerIndex: PlayerIndex;
  state: PlayerState;
  isDealer: boolean;
  isActive: boolean;
  isHuman: boolean;
  position: 'bottom' | 'left' | 'top' | 'right';
  name: string;
  onTileClick?: (tile: TileType) => void;
}

export function PlayerSeat({
  playerIndex,
  state,
  isDealer,
  isActive,
  isHuman,
  position,
  name,
  onTileClick,
}: PlayerSeatProps) {
  const sortedHand = [...state.hand].sort((a, b) => {
    const suitOrder = { wan: 0, tong: 1, tiao: 2, feng: 3, dragon: 4 };
    const sd = suitOrder[a.suit] - suitOrder[b.suit];
    return sd !== 0 ? sd : a.rank - b.rank;
  });

  return (
    <div
      className={`player-seat player-seat--${position} ${isActive ? 'player-seat--active' : ''}`}
      data-player={playerIndex}
    >
      <div className="player-seat__header">
        <span className="player-seat__name">{name}</span>
        {isDealer && <span className="player-seat__dealer">庄</span>}
        {!isHuman && <span className="player-seat__count">{state.hand.length} 张</span>}
      </div>

      <MeldGroup melds={state.melds} size="sm" />

      <div className="player-seat__discards">
        <TileRow tiles={state.discards} size="sm" />
      </div>

      <div className="player-seat__hand">
        {isHuman ? (
          <TileRow tiles={sortedHand} size="lg" onTileClick={onTileClick} />
        ) : (
          <TileRow tiles={sortedHand} faceDown size={position === 'top' ? 'sm' : 'md'} />
        )}
      </div>
    </div>
  );
}
