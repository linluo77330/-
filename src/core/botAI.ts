import type { MahjongGame } from './MahjongGame.js';
import { getWaitingTiles } from './winCheck.js';
import type { GameSnapshot, PlayerIndex, ResponseOption, Tile } from './types.js';
import {
  STEAL_VICTORY_SKILL_ID,
  canUseStealVictory,
} from './skills/stealVictory.js';
import {
  VEGETABLE_JUICE_CAISHEN_SKILL_ID,
  canUseVegetableJuiceCaishen,
} from './skills/vegetableJuiceCaishen.js';
import {
  BORROW_TILE_SKILL_ID,
  canUseBorrowTile,
  getBorrowTileTargets,
} from './skills/borrowTile.js';
import {
  WEN_QU_DESCENDS_SKILL_ID,
  canUseWenQuDescends,
  isWanTile,
} from './skills/wenQuDescends.js';

const BOT_DELAY_MS = 800;

function tileKey(t: Tile): string {
  return `${t.suit}-${t.rank}`;
}

export function pickBotDiscardTile(
  hand: Tile[],
  melds: GameSnapshot['players'][0]['melds'],
  wildcard: GameSnapshot['wildcard'],
): Tile {
  const waiting = getWaitingTiles(hand, melds, wildcard);
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

export function executeBotResponse(
  game: MahjongGame,
  player: PlayerIndex,
  options: ResponseOption[],
): void {
  const byAction = (a: string) => options.find((o) => o.action === a);
  const hu = byAction('hu');
  const kong = byAction('kong');
  const pong = byAction('pong');
  const chi = byAction('chi');

  const passive = Math.random() < 0.3;

  if (hu) game.respond(player, 'hu');
  else if (kong) game.respond(player, 'kong');
  else if (pong && !passive) game.respond(player, 'pong');
  else if (chi && !passive) game.respond(player, 'chi', chi!.chiTiles);
  else game.passResponse(player);
}

export function runBotDiscard(game: MahjongGame, player: PlayerIndex): void {
  const snap = game.getSnapshot();

  if (game.isSkillActive()) {
    const mode = snap.skillMode;
    if (mode?.skillId === STEAL_VICTORY_SKILL_ID && mode.step === 'pick_target') {
      const targets = ([0, 1, 2, 3] as PlayerIndex[]).filter((p) => p !== player);
      if (targets.length === 0) return;
      const target = targets[Math.floor(Math.random() * targets.length)];
      try {
        game.resolveSkillPick({ targetPlayer: target });
      } catch {
        // ignore
      }
    }
    if (mode?.skillId === VEGETABLE_JUICE_CAISHEN_SKILL_ID && mode.step === 'pick_hand') {
      const hand = snap.players[player].hand;
      if (hand.length === 0) return;
      const tile = hand[Math.floor(Math.random() * hand.length)];
      try {
        game.resolveSkillPick({ tileId: tile.id });
      } catch {
        // ignore
      }
    }
    if (mode?.skillId === BORROW_TILE_SKILL_ID && mode.step === 'pick_hand') {
      const hand = snap.players[player].hand;
      if (hand.length === 0) return;
      const tile = hand[Math.floor(Math.random() * hand.length)];
      try {
        game.resolveSkillPick({ tileId: tile.id });
      } catch {
        // ignore
      }
    }
    if (mode?.skillId === BORROW_TILE_SKILL_ID && mode.step === 'pick_target') {
      const targets = getBorrowTileTargets(snap, player);
      if (targets.length === 0) return;
      const target = targets[Math.floor(Math.random() * targets.length)];
      try {
        game.resolveSkillPick({ targetPlayer: target });
      } catch {
        // ignore
      }
    }
    if (mode?.skillId === WEN_QU_DESCENDS_SKILL_ID && mode.step === 'pick_hand') {
      const wanTiles = snap.players[player].hand.filter(isWanTile);
      if (wanTiles.length === 0) return;
      const tile = wanTiles[Math.floor(Math.random() * wanTiles.length)];
      try {
        game.resolveSkillPick({ tileId: tile.id });
      } catch {
        // ignore
      }
    }
    if (mode?.skillId === WEN_QU_DESCENDS_SKILL_ID && mode.step === 'pick_wan_rank') {
      const rank = 1 + Math.floor(Math.random() * 9);
      try {
        game.resolveSkillPick({ tileId: `wen-qu-wan-${rank}` });
      } catch {
        // ignore
      }
    }
    return;
  }

  if (canUseWenQuDescends(snap, player) && Math.random() < 0.35) {
    try {
      if (game.activateSkill(WEN_QU_DESCENDS_SKILL_ID)) {
        runBotDiscard(game, player);
        return;
      }
    } catch {
      // ignore
    }
  }

  if (canUseBorrowTile(snap, player) && Math.random() < 0.35) {
    try {
      if (game.activateSkill(BORROW_TILE_SKILL_ID)) {
        runBotDiscard(game, player);
        return;
      }
    } catch {
      // ignore
    }
  }

  if (canUseVegetableJuiceCaishen(snap, player) && Math.random() < 0.35) {
    try {
      if (game.activateSkill(VEGETABLE_JUICE_CAISHEN_SKILL_ID)) {
        runBotDiscard(game, player);
        return;
      }
    } catch {
      // ignore
    }
  }

  if (canUseStealVictory(snap, player) && Math.random() < 0.4) {
    try {
      if (game.activateSkill(STEAL_VICTORY_SKILL_ID)) {
        runBotDiscard(game, player);
        return;
      }
    } catch {
      // ignore
    }
  }

  const state = snap.players[player];
  if (state.hand.length === 0) return;
  const tile = pickBotDiscardTile(state.hand, state.melds, snap.wildcard);
  game.discardCard(tile.id);
}

export function runBotDrawPhase(game: MahjongGame, player: PlayerIndex): void {
  try {
    game.drawCard();
  } catch {
    // ignore
  }
}

export function getBotActionDelayMs(): number {
  return BOT_DELAY_MS;
}
