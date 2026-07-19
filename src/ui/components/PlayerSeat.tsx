import type { Meld, PlayerIndex, PlayerStateView, ResponseOption, Tile as TileType, WildcardConfig } from '@/core/types';
import type { WinHandDisplay } from '@/core/winDecompose';
import { useCompactLayout } from '../hooks/useCompactLayout';
import type { SeatTurnIndicator } from '../utils/turnIndicators';
import { resolveHandTiles } from '../utils/handView';
import { PlayerCharacterAvatar } from './PlayerCharacterAvatar';
import { SeatTurnBanner } from './SeatTurnBanner';
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
  const { compact, narrow, landscapeMobile } = useCompactLayout();
  const { tiles: handTiles, faceDown } = resolveHandTiles(state.hand);
  const isSide = position === 'left' || position === 'right';
  const riverCols: 3 | 6 = isSide ? 3 : 6;
  const hiddenCount = state.hand.kind === 'hidden' ? state.hand.count : 0;
  const humanHandSize = landscapeMobile ? 'md' : compact ? (narrow ? 'sm' : 'md') : 'lg';
  const opponentHandSize = landscapeMobile ? 'sm' : compact ? 'xs' : 'sm';
  const meldSize: TileSize = 'xs';
  const riverSize: TileSize = landscapeMobile ? 'xs' : compact ? 'sm' : 'xs';
  const useRiverScroll = compact && !landscapeMobile;
  const sideHandColumns = isSide && (!compact || landscapeMobile) ? 2 : undefined;
  return (
    <div
      className={`player-seat player-seat--${position} ${isActive ? 'player-seat--active' : ''} ${isWinner ? 'player-seat--winner' : ''}`}
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
        {!isHuman && hiddenCount > 0 && (
          <span className="player-seat__count">{hiddenCount} 张</span>
        )}
      </div>

      {turnIndicator && (
        <SeatTurnBanner
          indicator={turnIndicator}
          position={position}
          onRespond={onRespond}
          onPass={onPass}
          showResponseActions={showResponseActions}
          selectedDiscardTile={selectedDiscardTile}
          onConfirmDiscard={onConfirmDiscard}
          onClearDiscardSelection={onClearDiscardSelection}
        />
      )}

      <div className="player-seat__zones">
        <div className="player-seat__zone player-seat__zone--melds">
          <span className="player-seat__zone-label">鸣牌</span>
          <div className="player-seat__zone-body">
            {state.melds.length > 0 ? (
              <MeldGroup melds={state.melds} size={meldSize} />
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
                size={riverSize}
                grid={!useRiverScroll}
                gridCols={riverCols}
                scrollHorizontal={useRiverScroll}
                maxTiles={useRiverScroll ? undefined : isSide ? 12 : 18}
              />
            ) : (
              <span className="player-seat__zone-empty">—</span>
            )}
          </div>
        </div>

        <div className="player-seat__zone player-seat__zone--hand">
          <span className="player-seat__zone-label">手牌</span>
          <div className="player-seat__zone-body player-seat__hand-tiles">
            {!faceDown ? (
              <TileRow
                tiles={handTiles}
                size={isHuman || winHandDisplay ? humanHandSize : opponentHandSize}
                onTileClick={isHuman ? onTileClick : undefined}
                spaced
                handRows={isHuman && compact && !landscapeMobile ? 2 : undefined}
                handColumns={!isHuman && isSide && (!compact || landscapeMobile) && !winHandDisplay ? sideHandColumns : undefined}
                scrollHorizontal={!isHuman && compact && isSide && !landscapeMobile}
                wildcard={wildcard}
                highlightTileId={highlightTileId}
                selectedTileId={selectedDiscardTileId}
                winHandDisplay={winHandDisplay}
              />
            ) : (
              <TileRow
                tiles={handTiles}
                faceDown={faceDown}
                size={opponentHandSize}
                handColumns={sideHandColumns}
                scrollHorizontal={compact && isSide && !landscapeMobile}
                spaced
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
