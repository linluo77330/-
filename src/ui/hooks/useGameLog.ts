import { useEffect, useRef, useState } from 'react';
import type { MahjongGame } from '@/core/MahjongGame';
import {
  appendGameLogEntry,
  createDiscardLog,
  createHuLog,
  createMeldLog,
  type GameLogEntry,
  resetGameLogSequence,
} from '@/core/gameLog';

export function useGameLog(game: MahjongGame, active: boolean) {
  const [entries, setEntries] = useState<GameLogEntry[]>([]);
  const lastDiscardFromRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setEntries([]);
      return;
    }

    resetGameLogSequence();
    setEntries([]);

    const unsubs = [
      game.on('game_start', () => {
        resetGameLogSequence();
        setEntries([]);
        lastDiscardFromRef.current = null;
      }),
      game.on('after_discard', (payload) => {
        lastDiscardFromRef.current = payload.player;
        setEntries((prev) => appendGameLogEntry(prev, createDiscardLog(payload)));
      }),
      game.on('after_response', (payload) => {
        const from =
          lastDiscardFromRef.current !== null
            ? (lastDiscardFromRef.current as import('@/core/types').PlayerIndex)
            : undefined;
        if (from === undefined) return;
        setEntries((prev) => appendGameLogEntry(prev, createMeldLog(payload, from)));
      }),
      game.on('after_hu', (payload) => {
        const from =
          !payload.isSelfDraw && lastDiscardFromRef.current !== null
            ? (lastDiscardFromRef.current as import('@/core/types').PlayerIndex)
            : undefined;
        setEntries((prev) => appendGameLogEntry(prev, createHuLog(payload, from)));
      }),
    ];

    return () => unsubs.forEach((off) => off());
  }, [game, active]);

  return entries;
}
