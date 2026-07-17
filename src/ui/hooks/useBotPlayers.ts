import { useEffect, useRef } from 'react';
import type { MahjongGame } from '@/core/MahjongGame';
import { getWaitingTiles } from '@/core/winCheck';
import type { GameSnapshot, PlayerIndex, ResponseOption, Tile } from '@/core/types';

const HUMAN: PlayerIndex = 0;
const BOT_DELAY = 800;

function tileKey(t: Tile): string {
  return `${t.suit}-${t.rank}`;
}

function pickDiscardTile(hand: Tile[], melds: GameSnapshot['players'][0]['melds']): Tile {
  const waiting = getWaitingTiles(hand, melds);
  const waitingKeys = new Set(waiting.map(tileKey));

  const counts = new Map<string, Tile[]>();
  for (const t of hand) {
    const k = tileKey(t);
    if (!counts.has(k)) counts.set(k, []);
    counts.get(k)!.push(t);
  }

  const singles = hand.filter((t) => counts.get(tileKey(t))!.length === 1);
  const safeSingles = singles.filter((t) => !waitingKeys.has(tileKey(t)));
  if (safeSingles.length > 0) {
    const honor = safeSingles.find((t) => t.suit === 'feng' || t.suit === 'dragon');
    return honor ?? safeSingles[0];
  }

  return hand[Math.floor(Math.random() * hand.length)];
}

function botRespond(game: MahjongGame, player: PlayerIndex, options: ResponseOption[]): void {
  const byAction = (a: string) => options.find((o) => o.action === a);
  const hu = byAction('hu');
  const kong = byAction('kong');
  const pong = byAction('pong');
  const chi = byAction('chi');

  // 30% 概率不碰/不吃，留给玩家机会
  const passive = Math.random() < 0.3;

  if (hu) game.respond(player, 'hu');
  else if (kong) game.respond(player, 'kong');
  else if (pong && !passive) game.respond(player, 'pong');
  else if (chi && !passive) game.respond(player, 'chi', chi!.chiTiles);
  else game.passResponse(player);
}

export function useBotPlayers(game: MahjongGame, snapshot: GameSnapshot) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const { phase, currentPlayer, pendingResponses } = snapshot;
    if (phase === 'game_over' || phase === 'idle') return;

    const schedule = (fn: () => void, delay = BOT_DELAY) => {
      timerRef.current = setTimeout(fn, delay);
    };

    if (phase === 'draw' && currentPlayer !== HUMAN) {
      schedule(() => game.drawCard());
      return;
    }

    if (phase === 'discard' && currentPlayer !== HUMAN) {
      schedule(() => {
        const state = game.getSnapshot().players[currentPlayer];
        if (state.hand.length === 0) return;
        game.discardCard(pickDiscardTile(state.hand, state.melds).id);
      });
      return;
    }

    if (phase === 'response') {
      const humanActive = pendingResponses.some((o) => o.player === HUMAN);
      if (humanActive) return;

      const botOption = pendingResponses.find((o) => o.player !== HUMAN);
      if (!botOption) return;

      schedule(() => {
        const fresh = game.getSnapshot().pendingResponses.filter((o) => o.player === botOption.player);
        if (fresh.length === 0) return;
        botRespond(game, botOption.player, fresh);
      });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [game, snapshot]);
}
