import { useState } from 'react';
import type { PlayerIndex, PlayerStateView, ResponseOption, Tile as TileType, WildcardConfig } from '@/core/types';
import type { WinHandDisplay } from '@/core/winDecompose';
import { useCompactLayout } from '../hooks/useCompactLayout';
import type { SeatTurnIndicator } from '../utils/turnIndicators';
import { resolveHandTiles } from '../utils/handView';
import { HiddenHandStack } from './HiddenHandStack';
import { PlayerCharacterAvatar } from './PlayerCharacterAvatar';
import { PlayerZoneOverlay } from './PlayerZoneOverlay';
import { SeatTurnBanner } from './SeatTurnBanner';
import { TileRow } from './TileRow';
import type { TileOrientation, TileSize } from './Tile';
import { ZoneFoldChip } from './ZoneFoldChip';

type SeatPosition = 'bottom' | 'left' | 'top' | 'right';

function riverSizeForHand(handSize: TileSize): TileSize {
  switch (handSize) {
    case 'xl':
      return 'lg';
    case 'lg':
      return 'md';
    case 'md':
      return 'sm';
    case 'sm':
      return 'xs';
    default:
      return 'xs';
  }
}

interface PlayerSeatProps {
  playerIndex: PlayerIndex;
  state: PlayerStateView;
  isDealer: boolean;
  isActive: boolean;
  isWinner?: boolean;
  isHuman: boolean;
  position: SeatPosition;
  name: string;
  characterId?: string;
  hasBlackHand?: boolean;
  onCharacterAvatarClick?: () => void;
  wildcard: WildcardConfig | null;
  highlightTileId?: string | null;
  selectedDiscardTileId?: string | null;
  winHandDisplay?: WinHandDisplay | null;
  onTileClick?: (tile: TileType) => void;
  turnIndicator?: SeatTurnIndicator | null;
  onRespond?: (option: ResponseOption) => void;
  onPass?: () => void;
  showResponseActions?: boolean;
  selectedDiscardTile?: TileType | null;
  onConfirmDiscard?: () => void;
  onClearDiscardSelection?: () => void;
}

export function PlayerSeat({
  state,
  isDealer,
  isActive,
  isWinner = false,
  isHuman,
  position,
  name,
  characterId = '',
  hasBlackHand = false,
  onCharacterAvatarClick,
  wildcard,
  highlightTileId,
  selectedDiscardTileId = null,
  winHandDisplay,
  onTileClick,
  turnIndicator,
  onRespond,
  onPass,
  showResponseActions = false,
  selectedDiscardTile = null,
  onConfirmDiscard,
  onClearDiscardSelection,
}: PlayerSeatProps) {
  const { compact, landscapeMobile } = useCompactLayout();
  const { tiles: handTiles, faceDown } = resolveHandTiles(state.hand);
  const isSide = position === 'left' || position === 'right';
  const hiddenCount = state.hand.kind === 'hidden' ? state.hand.count : handTiles.length;
  const stackOrientation: TileOrientation = isSide ? 'vertical' : 'horizontal';
  const stackSize: TileSize = isSide ? 'xs' : 'sm';

  const humanHandSize: TileSize = landscapeMobile ? 'sm' : compact ? 'md' : 'lg';
  const humanRiverSize = riverSizeForHand(humanHandSize);
  const overlayTileSize: TileSize = 'sm';

  const [zoneOverlay, setZoneOverlay] = useState<'melds' | 'river' | null>(null);

  const showOpponentReveal = !isHuman && !faceDown && winHandDisplay;

  return (
    <div
      className={`player-seat player-seat--${position} ${isHuman ? 'player-seat--human' : ''} ${isActive ? 'player-seat--active' : ''} ${isWinner ? 'player-seat--winner' : ''}`}
    >
      <div className="player-seat__header">
        {characterId && (
          <PlayerCharacterAvatar
            characterId={characterId}
            onClick={onCharacterAvatarClick}
          />
        )}
        <span className="player-seat__name">{name}</span>
        {isWinner && <span className="player-seat__winner">胡</span>}
        {isDealer && <span className="player-seat__dealer">庄</span>}
        {hasBlackHand && <span className="player-seat__black-hand">黑手</span>}
      </div>

      <div className="seat-status-dock">
        <SeatTurnBanner
          indicator={turnIndicator ?? null}
          position={position}
          onRespond={onRespond}
          onPass={onPass}
          showResponseActions={showResponseActions}
          selectedDiscardTile={selectedDiscardTile}
          onConfirmDiscard={onConfirmDiscard}
          onClearDiscardSelection={onClearDiscardSelection}
        />
      </div>

      <div className="player-seat__play-row">
        <div className="player-seat__fold-chips">
          <ZoneFoldChip
            label="鸣"
            count={state.melds.length}
            tone="meld"
            onClick={() => setZoneOverlay('melds')}
          />
          {!isHuman && (
            <ZoneFoldChip
              label="河"
              count={state.discards.length}
              tone="river"
              onClick={() => setZoneOverlay('river')}
            />
          )}
        </div>

        {isHuman ? (
          <div className="player-seat__hand-column">
            <div className="player-seat__river-strip">
              <span className="player-seat__river-label">河牌</span>
              <div className="player-seat__river-body">
                {state.discards.length > 0 ? (
                  <TileRow tiles={state.discards} size={humanRiverSize} spaced wrap />
                ) : (
                  <span className="player-seat__river-empty">—</span>
                )}
              </div>
            </div>
            <div className="player-seat__hand-wrap player-seat__hand-wrap--human">
              <TileRow
                tiles={handTiles}
                size={humanHandSize}
                onTileClick={onTileClick}
                spaced
                wildcard={wildcard}
                highlightTileId={highlightTileId}
                selectedTileId={selectedDiscardTileId}
                winHandDisplay={winHandDisplay}
              />
            </div>
          </div>
        ) : (
          <div className="player-seat__hand-wrap">
            {showOpponentReveal ? (
              <TileRow
                tiles={handTiles}
                size="sm"
                spaced
                wrap
                wildcard={wildcard}
                highlightTileId={highlightTileId}
                winHandDisplay={winHandDisplay}
              />
            ) : (
              <HiddenHandStack
                count={hiddenCount}
                size={stackSize}
                orientation={stackOrientation}
              />
            )}
          </div>
        )}
      </div>

      {zoneOverlay && (
        <PlayerZoneOverlay
          title={`${name} · ${zoneOverlay === 'melds' ? '鸣牌' : '河牌'}`}
          kind={zoneOverlay}
          melds={state.melds}
          discards={state.discards}
          tileSize={overlayTileSize}
          onClose={() => setZoneOverlay(null)}
        />
      )}
    </div>
  );
}
