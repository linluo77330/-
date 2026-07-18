import { useEffect, useRef } from 'react';
import type { MahjongGame } from '@/core/MahjongGame';
import {
  executeBotResponse,
  getBotActionDelayMs,
  runBotDiscard,
} from '@/core/botAI';
import type { GameSnapshot, PlayerIndex } from '@/core/types';

const HUMAN: PlayerIndex = 0;

export function useBotPlayers(game: MahjongGame, snapshot: GameSnapshot) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const { phase, currentPlayer, pendingResponses } = snapshot;
    if (phase === 'game_over' || phase === 'idle') return;

    const delay = getBotActionDelayMs();
    const schedule = (fn: () => void) => {
      timerRef.current = setTimeout(fn, delay);
    };

    if (phase === 'draw') {
      schedule(() => game.drawCard());
      return;
    }

    if (phase === 'discard' && currentPlayer !== HUMAN) {
      schedule(() => runBotDiscard(game, currentPlayer));
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
        executeBotResponse(game, botOption.player, fresh);
      });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [game, snapshot]);
}
