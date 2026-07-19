import type { Meld } from '@/core/types';
import { Tile, type TileSize } from './Tile';

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
