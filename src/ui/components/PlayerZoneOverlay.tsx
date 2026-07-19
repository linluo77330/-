import { useEffect } from 'react';
import type { Meld, Tile as TileType } from '@/core/types';
import { MeldGroup } from './MeldGroup';
import { TileRow } from './TileRow';
import type { TileSize } from './Tile';

interface PlayerZoneOverlayProps {
  title: string;
  kind: 'melds' | 'river';
  melds?: Meld[];
  discards?: TileType[];
  tileSize?: TileSize;
  onClose: () => void;
}

export function PlayerZoneOverlay({
  title,
  kind,
  melds = [],
  discards = [],
  tileSize = 'sm',
  onClose,
}: PlayerZoneOverlayProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const empty = kind === 'melds' ? melds.length === 0 : discards.length === 0;

  return (
    <div className="player-zone-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="player-zone-overlay__backdrop"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="player-zone-overlay__panel">
        <div className="player-zone-overlay__header">
          <strong>{title}</strong>
          <button type="button" className="player-zone-overlay__close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="player-zone-overlay__body">
          {empty ? (
            <p className="player-zone-overlay__empty">暂无牌</p>
          ) : kind === 'melds' ? (
            <MeldGroup melds={melds} size={tileSize} />
          ) : (
            <TileRow tiles={discards} size={tileSize} scrollHorizontal={false} />
          )}
        </div>
      </div>
    </div>
  );
}
