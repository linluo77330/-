import type { PlayerIndex, SkillActivityView, Suit, Tile as TileType } from '@/core/types';
import { STEAL_VICTORY_SKILL_ID } from '@/core/skills/stealVictory';
import { BORROW_TILE_SKILL_ID } from '@/core/skills/borrowTile';
import { WEN_QU_DESCENDS_SKILL_ID } from '@/core/skills/wenQuDescends';
import { getCharacterById } from '../data/characters';
import { tileLabel } from '../utils/tileLabels';
import { Tile } from './Tile';

interface SkillActivityOverlayProps {
  activity: SkillActivityView;
  viewer: PlayerIndex;
  seatNames: string[];
  onSkillPick?: (params: {
    tileId?: string;
    splitRanks?: [number, number];
    confirm?: boolean;
    targetPlayer?: PlayerIndex;
    skip?: boolean;
  }) => void;
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
      case 'pick_target':
        if (activity.skillId === BORROW_TILE_SKILL_ID) return '选择要借牌的玩家';
        return '请选择要使用黑手的玩家';
      case 'pick_hand':
        return activity.wildcardPrompt ?? '选择一张手牌';
      case 'pick_wan_rank':
        return '选择改写后的万字牌';
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

            {activity.step === 'pick_target' && (
              <>
                {(activity.previewTiles?.length ?? 0) > 0 && (
                  <div className="skill-overlay__wildcard-preview">
                    <span className="skill-overlay__wildcard-label">
                      {activity.skillId === BORROW_TILE_SKILL_ID ? '借出的牌' : '预览'}
                    </span>
                    <div className="skill-overlay__tiles">
                      {activity.previewTiles!.map((tile) => (
                        <div
                          key={tile.id}
                          className="skill-overlay__tile-wrap skill-overlay__tile-wrap--preview"
                        >
                          <Tile
                            tile={tile}
                            size="md"
                            isWildcard={
                              activity.skillId !== BORROW_TILE_SKILL_ID &&
                              activity.previewTiles!.length === 1
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(() => {
                  const targets =
                    activity.pickableTargets ??
                    ([0, 1, 2, 3] as PlayerIndex[]).filter((p) => p !== activity.player);
                  return targets.length > 0 ? (
                    <div className="skill-overlay__targets">
                      {targets.map((target) => (
                        <button
                          key={target}
                          type="button"
                          className="btn btn--ghost skill-overlay__target-btn"
                          onClick={() => onSkillPick?.({ targetPlayer: target })}
                        >
                          {seatNames[target] ?? `玩家 ${target}`}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="skill-overlay__empty">暂无可选目标</p>
                  );
                })()}
                <button
                  type="button"
                  className="btn btn--ghost skill-overlay__skip"
                  onClick={() => onSkillPick?.({ skip: true })}
                >
                  {activity.skillId === BORROW_TILE_SKILL_ID ? '取消' : '跳过'}
                </button>
              </>
            )}

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

            {activity.step === 'pick_hand' && (
              <>
                {(activity.previewTiles?.length ?? 0) > 0 && (
                  <div className="skill-overlay__wildcard-preview">
                    <span className="skill-overlay__wildcard-label">当前万能牌</span>
                    <div className="skill-overlay__tiles">
                      {activity.previewTiles!.map((tile) => (
                        <div
                          key={tile.id}
                          className="skill-overlay__tile-wrap skill-overlay__tile-wrap--preview"
                        >
                          <Tile tile={tile} size="md" isWildcard />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                  <p className="skill-overlay__empty">
                    {activity.skillId === BORROW_TILE_SKILL_ID
                      ? '没有可借出的手牌'
                      : activity.skillId === WEN_QU_DESCENDS_SKILL_ID
                        ? '没有可改写的万字牌'
                        : '没有可替换的手牌'}
                  </p>
                )}
                <button
                  type="button"
                  className="btn btn--ghost skill-overlay__skip"
                  onClick={() => onSkillPick?.({ skip: true })}
                >
                  取消
                </button>
              </>
            )}

            {activity.step === 'pick_wan_rank' && (
              <>
                {activity.sourceTile && (
                  <div className="skill-overlay__wildcard-preview">
                    <span className="skill-overlay__wildcard-label">原万字牌</span>
                    <div className="skill-overlay__tiles">
                      <div className="skill-overlay__tile-wrap skill-overlay__tile-wrap--preview">
                        <Tile tile={activity.sourceTile} size="md" />
                      </div>
                    </div>
                  </div>
                )}
                {(activity.previewTiles?.length ?? 0) > 0 ? (
                  <div className="skill-overlay__tiles">
                    {activity.previewTiles!.map((tile) => (
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
                  <p className="skill-overlay__empty">没有可选万字牌</p>
                )}
                <button
                  type="button"
                  className="btn btn--ghost skill-overlay__skip"
                  onClick={() => onSkillPick?.({ skip: true })}
                >
                  取消
                </button>
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

            {activity.step === 'confirm' &&
              activity.skillId !== STEAL_VICTORY_SKILL_ID && (
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
