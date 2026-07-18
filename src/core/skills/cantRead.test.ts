import { describe, expect, it } from 'vitest';
import { MahjongGame } from '../MahjongGame.js';
import type { Tile } from '../types.js';
import {
  CANT_READ_SKILL_ID,
  JUE_WANG_DE_WEN_MANG_ID,
  isUnreadableTile,
} from './cantRead.js';

let id = 0;
function t(suit: Tile['suit'], rank: number): Tile {
  return { id: `t${++id}`, suit, rank };
}

type GameInternals = MahjongGame & {
  phase: string;
  currentPlayer: number;
  drawMode: string | null;
  players: { hand: Tile[]; discards: Tile[]; melds: unknown[] }[];
  deck: Tile[];
};

describe('cant read skill', () => {
  it('带字牌包含万子、风牌与中/发，不含白板', () => {
    expect(isUnreadableTile({ suit: 'wan', rank: 5 })).toBe(true);
    expect(isUnreadableTile({ suit: 'feng', rank: 1 })).toBe(true);
    expect(isUnreadableTile({ suit: 'dragon', rank: 1 })).toBe(true);
    expect(isUnreadableTile({ suit: 'dragon', rank: 2 })).toBe(true);
    expect(isUnreadableTile({ suit: 'dragon', rank: 3 })).toBe(false);
    expect(isUnreadableTile({ suit: 'tong', rank: 5 })).toBe(false);
  });

  it('摸牌阶段可丢弃全部带字牌、等量补摸并跳过出牌', () => {
    const game = new MahjongGame();
    game.start(0, [JUE_WANG_DE_WEN_MANG_ID, '', '', '']);

    const internal = game as unknown as GameInternals;
    internal.phase = 'draw';
    internal.currentPlayer = 0;
    internal.drawMode = 'choose';
    internal.players[0].hand = [t('wan', 1), t('wan', 2), t('feng', 1), t('dragon', 2)];
    internal.players[0].discards = [];
    internal.deck = [t('tong', 3), t('tong', 4), t('tong', 5), t('tong', 6)];

    expect(game.needsDrawChoice()).toBe(true);
    expect(game.activateSkill(CANT_READ_SKILL_ID)).toBe(true);
    expect(game.resolveSkillPick({ confirm: true })).toBe(true);

    const after = game.getSnapshot();
    expect(after.skillMode).toBeNull();
    expect(after.phase).toBe('draw');
    expect(after.currentPlayer).toBe(1);
    expect(after.players[0].hand).toHaveLength(4);
    expect(after.players[0].hand.every((tile) => tile.suit === 'tong')).toBe(true);
    expect(after.players[0].discards).toHaveLength(4);
    expect(after.players[0].discards.every((tile) => isUnreadableTile(tile))).toBe(true);
  });

  it('庄家开局在出牌阶段也可发动技能', () => {
    const game = new MahjongGame();
    game.start(0, [JUE_WANG_DE_WEN_MANG_ID, '', '', '']);

    const snap = game.getSnapshot();
    expect(snap.phase).toBe('discard');
    expect(snap.currentPlayer).toBe(0);
    expect(snap.turnNumber).toBe(0);

    const internal = game as unknown as GameInternals;
    internal.players[0].hand = [t('wan', 3), t('tong', 5), t('tiao', 6)];
    internal.deck = [t('tong', 1), t('tong', 2)];

    expect(game.activateSkill(CANT_READ_SKILL_ID)).toBe(true);
    expect(game.resolveSkillPick({ confirm: true })).toBe(true);

    const after = game.getSnapshot();
    expect(after.currentPlayer).toBe(1);
    expect(after.phase).toBe('draw');
    expect(after.players[0].discards).toHaveLength(1);
    expect(after.players[0].discards[0].suit).toBe('wan');
    expect(after.players[0].hand).toHaveLength(3);
  });
});
