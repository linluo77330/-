import { useEffect, useState } from 'react';
import type { MatchViewState, PlayerIndex } from '@/core/types';

interface RoundSummaryOverlayProps {
  match: MatchViewState;
  seatNames: string[];
  onReturnToLobby?: () => void;
  returnToLobbyLabel?: string;
}

function winTypeLabel(winType: MatchViewState['lastRoundSummary'] extends infer S
  ? S extends { winType: infer W }
    ? W
    : never
  : never): string {
  switch (winType) {
    case 'self_draw':
      return '自摸胡牌';
    case 'deal_in':
      return '点炮胡牌';
    case 'skill_vote':
      return '投票获胜';
    case 'skill_steal':
      return '窃取胜利';
    case 'draw':
      return '流局';
    default:
      return '小局结束';
  }
}

function hpReasonLabel(reason: string): string {
  switch (reason) {
    case 'self_draw':
      return '被自摸';
    case 'deal_in':
      return '点炮';
    case 'skill_vote':
      return '投票失败';
    case 'skill_steal':
      return '被窃取';
    default:
      return '扣血';
  }
}

function countAlive(match: MatchViewState): number {
  return match.eliminated.filter((e) => !e).length;
}

function matchOverHint(match: MatchViewState): string {
  const alive = countAlive(match);
  if (alive < match.survivorsToWin) {
    return `场上剩余 ${alive} 人（不足 ${match.survivorsToWin} 人），整场对局结束`;
  }
  return `场上剩余 ${alive} 人，已达存活目标 ${match.survivorsToWin} 人`;
}

export function RoundSummaryOverlay({
  match,
  seatNames,
  onReturnToLobby,
  returnToLobbyLabel = '返回房间',
}: RoundSummaryOverlayProps) {
  const summary = match.lastRoundSummary;
  const [countdown, setCountdown] = useState(match.nextRoundCountdown ?? 0);

  useEffect(() => {
    if (match.matchPhase !== 'round_intermission' || !match.nextRoundAt) {
      setCountdown(match.nextRoundCountdown ?? 0);
      return;
    }

    const tick = () => {
      setCountdown(Math.max(0, Math.ceil((match.nextRoundAt! - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [match.matchPhase, match.nextRoundAt, match.nextRoundCountdown]);

  if (!summary && match.matchPhase !== 'match_over') return null;

  if (match.matchPhase === 'match_over') {
    const winners = match.matchWinners;
    return (
      <div className="round-summary round-summary--match-over" role="dialog" aria-modal="true">
        <div className="round-summary__panel">
          <h2 className="round-summary__title">整场对局结束</h2>
          <p className="round-summary__winners">
            {winners.length > 0
              ? winners.map((p) => seatNames[p] ?? `玩家 ${p}`).join('、')
              : '无'}
            <span className="round-summary__winners-tag"> 获胜</span>
          </p>
          <p className="round-summary__hint">{matchOverHint(match)}</p>
          {onReturnToLobby && (
            <button
              type="button"
              className="btn btn--primary round-summary__return"
              onClick={onReturnToLobby}
            >
              {returnToLobbyLabel}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const winnerName =
    summary.winner !== null ? seatNames[summary.winner] ?? `玩家 ${summary.winner}` : '无人';

  return (
    <div className="round-summary" role="dialog" aria-modal="true">
      <div className="round-summary__panel">
        <h2 className="round-summary__title">第 {summary.roundNumber} 局结束</h2>
        <p className="round-summary__winner-line">
          <strong>{winnerName}</strong>
          <span> {winTypeLabel(summary.winType)}</span>
        </p>
        {summary.discarder !== null && summary.winType === 'deal_in' && (
          <p className="round-summary__detail">
            点炮者：{seatNames[summary.discarder as PlayerIndex] ?? `玩家 ${summary.discarder}`}
          </p>
        )}
        {summary.hpChanges.length > 0 ? (
          <ul className="round-summary__hp-list">
            {summary.hpChanges.map((change) => (
              <li key={`${change.player}-${change.reason}`} className="round-summary__hp-item">
                <span>{seatNames[change.player] ?? `玩家 ${change.player}`}</span>
                <span className="round-summary__hp-delta">{change.delta}</span>
                <span className="round-summary__hp-reason">{hpReasonLabel(change.reason)}</span>
                <span className="round-summary__hp-remain">
                  剩余 {match.hp[change.player]} / {match.maxHp[change.player]}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="round-summary__detail">本局无人扣血</p>
        )}
        {match.matchPhase === 'round_intermission' && (
          <p className="round-summary__countdown">{countdown} 秒后开启下一局…</p>
        )}
      </div>
    </div>
  );
}
