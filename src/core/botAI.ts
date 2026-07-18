import type { MahjongGame } from './MahjongGame.js';
import { getWaitingTiles } from './winCheck.js';
import type { GameSnapshot, PlayerIndex, ResponseOption, Tile } from './types.js';

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
  const state = snap.players[player];
  if (state.hand.length === 0) return;
  const tile = pickBotDiscardTile(state.hand, state.melds, snap.wildcard);
  game.discardCard(tile.id);
}

export function getBotActionDelayMs(): number {
  return BOT_DELAY_MS;
}
