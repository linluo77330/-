import type { Tile as TileType } from '@/core/types';
import { TileBackShell, TileShell } from './TileShell';
import { WanFace } from './suits/WanFace';
import { TongFace } from './suits/TongFace';
import { TiaoFace } from './suits/TiaoFace';
import { HonorFace } from './suits/HonorFace';

interface TileFaceProps {
  tile: TileType;
}

export function TileFace({ tile }: TileFaceProps) {
  const uid = tile.id.replace(/[^a-zA-Z0-9]/g, '') || 't';

  return (
    <svg viewBox="0 0 60 82" className="tile-face" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <TileShell uid={uid}>
        <g transform="translate(30 44)">
          {tile.suit === 'wan' && <WanFace rank={tile.rank} />}
          {tile.suit === 'tong' && <TongFace rank={tile.rank} />}
          {tile.suit === 'tiao' && <TiaoFace rank={tile.rank} />}
          {(tile.suit === 'feng' || tile.suit === 'dragon') && (
            <HonorFace suit={tile.suit} rank={tile.rank} />
          )}
        </g>
      </TileShell>
    </svg>
  );
}

interface TileBackFaceProps {
  tileId: string;
}

export function TileBackFace({ tileId }: TileBackFaceProps) {
  const uid = tileId.replace(/[^a-zA-Z0-9]/g, '') || 'b';
  return (
    <svg viewBox="0 0 60 82" className="tile-face tile-face--back" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <TileBackShell uid={uid} />
    </svg>
  );
}
