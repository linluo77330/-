import type { PlayerIndex, SkillActivityView, Suit, Tile as TileType } from '@/core/types';
import { getCharacterById } from '../data/characters';
import { tileLabel } from '../utils/tileLabels';
import { Tile } from './Tile';

interface SkillActivityOverlayProps {
  activity: SkillActivityView;
  viewer: PlayerIndex;
  seatNames: string[];
  onSkillPick?: (params: { tileId?: string; splitRanks?: [number, number]; confirm?: boolean }) => void;
  onSkillVote?: (params: { agree: boolean }) => void;
}

function SplitOptionButton({
  rankA,
  rankB,
  suit,
  onSelect,
}: {
  rankA: number;
  rankB: number;
  suit: Suit;
  onSelect: () => void;
}) {
  const tileA: TileType = { id: `preview-${rankA}`, suit, rank: rankA };
  const tileB: TileType = { id: `preview-${rankB}`, suit, rank: rankB };
  return (
    <button type="button" className="skill-overlay__split-option" onClick={onSelect}>
      <Tile tile={tileA} size="sm" />
      <span className="skill-overlay__split-plus">+</span>
      <Tile tile={tileB} size="sm" />
    </button>
  );
}

function voteChoiceLabel(choice: 'agree' | 'reject' | 'pending'): string {
  switch (choice) {
    case 'agree':
      return '已同意';
    case 'reject':
      return '已拒绝';
    default:
      return '待投票';
  }
}

export function SkillActivityOverlay({
  activity,
  viewer,
  seatNames,
  onSkillPick,
  onSkillVote,
}: SkillActivityOverlayProps) {
  const isActor = activity.player === viewer;
  const playerName = seatNames[activity.player] ?? `玩家 ${activity.player}`;
  const character = getCharacterById(activity.characterId);
  const accent = character?.accent ?? '#b32428';

  const prompt = (() => {
    if (!isActor) return null;
    switch (activity.step) {
      case 'pick_discard':
        return '请选择要摸回的河牌';
      case 'pick_source':
        return '请选择要掰开的筒牌或条牌';
      case 'pick_split':
        return activity.sourceTile
          ? `请选择 ${tileLabel(activity.sourceTile)} 的拆分方式`
          : '请选择拆分方式';
      case 'pick_keep':
        return '请选择要保留的一张牌';
      case 'confirm':
        if (activity.votePrompt) return activity.votePrompt;
        return activity.drawPreviewCount !== undefined
          ? `将丢弃全部带字的牌，并摸 ${activity.drawPreviewCount} 张牌，随后跳过出牌`
          : '确认发动技能';
      default:
        return null;
    }
  })();

  const voteStatusList = activity.voteStatus?.map(({ player, choice }) => (
    <li key={player} className={`skill-overlay__vote-item skill-overlay__vote-item--${choice}`}>
      <span>{seatNames[player] ?? `玩家 ${player}`}</span>
      <span>{voteChoiceLabel(choice)}</span>
    </li>
  ));

  return (
    <div className="skill-overlay" role="dialog" aria-modal="true" aria-label="技能发动">
      <div className="skill-overlay__backdrop" />
      <div className="skill-overlay__panel">
        <div className="skill-overlay__header">
          <span className="skill-overlay__avatar" style={{ background: accent }}>
            {activity.characterName.slice(-1)}
          </span>
          <div className="skill-overlay__meta">
            <strong className="skill-overlay__skill-name">{activity.skillName}</strong>
            <span className="skill-overlay__character">{activity.characterName}</span>
          </div>
        </div>

        {activity.step === 'vote' ? (
          <>
            {isActor ? (
              <p className="skill-overlay__prompt">等待其他玩家投票…</p>
            ) : activity.canVote ? (
              <>
                <p className="skill-overlay__prompt">
                  <strong>{playerName}</strong> 发起投票：是否同意其自动获胜？
                </p>
                <div className="skill-overlay__vote-actions">
                  <button
                    type="button"
                    className="btn btn--primary skill-overlay__vote-btn"
                    onClick={() => onSkillVote?.({ agree: true })}
                  >
                    同意
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost skill-overlay__vote-btn"
                    onClick={() => onSkillVote?.({ agree: false })}
                  >
                    拒绝
                  </button>
                </div>
              </>
            ) : (
              <p className="skill-overlay__waiting">
                <strong>{playerName}</strong> 正在发起 <strong>{activity.skillName}</strong> 投票…
              </p>
            )}
            {voteStatusList && voteStatusList.length > 0 && (
              <ul className="skill-overlay__vote-status">{voteStatusList}</ul>
            )}
          </>
        ) : isActor ? (
          <>
            {prompt && <p className="skill-overlay__prompt">{prompt}</p>}

            {activity.step === 'pick_discard' && (
              <>
                {(activity.pickableDiscards?.length ?? 0) > 0 ? (
                  <div className="skill-overlay__tiles">
                    {activity.pickableDiscards!.map((tile) => (
                      <div key={tile.id} className="skill-overlay__tile-wrap">
                        <Tile
                          tile={tile}
                          size="md"
                          onClick={() => onSkillPick?.({ tileId: tile.id })}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="skill-overlay__empty">暂无可选河牌</p>
                )}
              </>
            )}

            {activity.step === 'pick_source' && (
              <>
                {(activity.pickableHandTiles?.length ?? 0) > 0 ? (
                  <div className="skill-overlay__tiles">
                    {activity.pickableHandTiles!.map((tile) => (
                      <div key={tile.id} className="skill-overlay__tile-wrap">
                        <Tile
                          tile={tile}
                          size="md"
                          onClick={() => onSkillPick?.({ tileId: tile.id })}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="skill-overlay__empty">没有可掰开的筒牌或条牌</p>
                )}
              </>
            )}

            {activity.step === 'pick_split' && (
              <>
                {(activity.splitOptions?.length ?? 0) > 0 && activity.sourceTile ? (
                  <div className="skill-overlay__split-options">
                    {activity.splitOptions!.map(({ rankA, rankB }) => (
                      <SplitOptionButton
                        key={`${rankA}-${rankB}`}
                        rankA={rankA}
                        rankB={rankB}
                        suit={activity.sourceTile!.suit}
                        onSelect={() => onSkillPick?.({ splitRanks: [rankA, rankB] })}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="skill-overlay__empty">该牌无法拆分</p>
                )}
              </>
            )}

            {activity.step === 'pick_keep' && activity.splitTiles && (
              <div className="skill-overlay__tiles">
                {activity.splitTiles.map((tile) => (
                  <div key={tile.id} className="skill-overlay__tile-wrap">
                    <Tile
                      tile={tile}
                      size="md"
                      onClick={() => onSkillPick?.({ tileId: tile.id })}
                    />
                  </div>
                ))}
              </div>
            )}

            {activity.step === 'confirm' && (
              <>
                {(activity.previewTiles?.length ?? 0) > 0 && (
                  <div className="skill-overlay__tiles">
                    {activity.previewTiles!.map((tile) => (
                      <div
                        key={tile.id}
                        className="skill-overlay__tile-wrap skill-overlay__tile-wrap--preview"
                      >
                        <Tile tile={tile} size="md" />
                      </div>
                    ))}
                  </div>
                )}
                {((activity.previewTiles?.length ?? 0) > 0 || activity.votePrompt) && (
                  <button
                    type="button"
                    className="btn btn--primary skill-overlay__confirm"
                    onClick={() => onSkillPick?.({ confirm: true })}
                  >
                    {activity.votePrompt ? '发起投票' : '确认发动'}
                  </button>
                )}
                {(activity.previewTiles?.length ?? 0) === 0 && !activity.votePrompt && (
                  <p className="skill-overlay__empty">当前无法发动</p>
                )}
              </>
            )}
          </>
        ) : (
          <p className="skill-overlay__waiting">
            <strong>{playerName}</strong> 正在发动 <strong>{activity.skillName}</strong>…
          </p>
        )}
      </div>
    </div>
  );
}
