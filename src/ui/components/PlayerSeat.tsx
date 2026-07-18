import type { Meld, PlayerIndex, PlayerState, Tile as TileType, WildcardConfig } from '@/core/types';
import { isWildcardTile } from '@/core/wildcard';
import { Tile, type TileSize } from './Tile';
import { TileRow } from './TileRow';

type SeatPosition = 'bottom' | 'left' | 'top' | 'right';

interface MeldGroupProps {
  melds: Meld[];
  size?: TileSize;
}

export function MeldGroup({ melds, size = 'xs' }: MeldGroupProps) {
  return (
    <div className="meld-group">
      {melds.map((meld, i) => (
        <div key={`${meld.type}-${i}`} className={`meld-group__item meld-group__item--${meld.type}`}>
          <div className="meld-group__tiles">
            {meld.tiles.map((tile, ti) => {
              const isClaimed =
                meld.type !== 'kong' && ti === meld.tiles.length - 1 && meld.fromPlayer !== undefined;
              return (
                <div
                  key={tile.id}
                  className={`meld-group__tile ${isClaimed ? 'meld-group__tile--claimed' : ''}`}
                >
                  <Tile tile={tile} size={size} />
                </div>
              );
            })}
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
  position: SeatPosition;
  name: string;
  wildcard: WildcardConfig | null;
  highlightTileId?: string | null;
  onTileClick?: (tile: TileType) => void;
}

export function PlayerSeat({
  state,
  isDealer,
  isActive,
  isHuman,
  position,
  name,
  wildcard,
  highlightTileId,
  onTileClick,
}: PlayerSeatProps) {
  const sortedHand = [...state.hand].sort((a, b) => {
    const suitOrder = { wan: 0, tong: 1, tiao: 2, feng: 3, dragon: 4 };
    const sd = suitOrder[a.suit] - suitOrder[b.suit];
    return sd !== 0 ? sd : a.rank - b.rank;
  });

  const isSide = position === 'left' || position === 'right';
  const riverCols: 3 | 6 = isSide ? 3 : 6;

  return (
    <div className={`player-seat player-seat--${position} ${isActive ? 'player-seat--active' : ''}`}>
      <div className="player-seat__header">
        <span className="player-seat__name">{name}</span>
        {isDealer && <span className="player-seat__dealer">庄</span>}
        {!isHuman && <span className="player-seat__count">{state.hand.length} 张</span>}
      </div>

      <div className="player-seat__zones">
        <div className="player-seat__zone player-seat__zone--melds">
          <span className="player-seat__zone-label">鸣牌</span>
          <div className="player-seat__zone-body">
            {state.melds.length > 0 ? (
              <MeldGroup melds={state.melds} size="xs" />
            ) : (
              <span className="player-seat__zone-empty">—</span>
            )}
          </div>
        </div>

        <div className="player-seat__zone player-seat__zone--river">
          <span className="player-seat__zone-label">河牌</span>
          <div className="player-seat__zone-body">
            {state.discards.length > 0 ? (
              <TileRow
                tiles={state.discards}
                size="xs"
                grid
                gridCols={riverCols}
                maxTiles={isSide ? 12 : 18}
              />
            ) : (
              <span className="player-seat__zone-empty">—</span>
            )}
          </div>
        </div>

        <div className="player-seat__zone player-seat__zone--hand">
          <span className="player-seat__zone-label">手牌</span>
          <div className="player-seat__zone-body player-seat__hand-tiles">
            {isHuman ? (
              <TileRow
                tiles={sortedHand}
                size="lg"
                onTileClick={onTileClick}
                spaced
                wildcard={wildcard}
                highlightTileId={highlightTileId}
              />
            ) : (
              <TileRow
                tiles={sortedHand}
                faceDown
                size="sm"
                handColumns={isSide ? 2 : undefined}
                spaced
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
