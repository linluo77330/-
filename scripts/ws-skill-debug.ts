import WebSocket from 'ws';
import { isSplittableTile } from '../src/core/skills/splitTile.js';

const WS_URL = process.env.WS_URL || 'ws://127.0.0.1:3001';
const ROOM = `skill-debug-${Date.now()}`;

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const ws = new WebSocket(WS_URL);
  const logs: Array<{ type: string; message?: string; state?: { view: Record<string, unknown> } }> = [];
  ws.on('message', (raw) => logs.push(JSON.parse(raw.toString())));

  await new Promise<void>((res, rej) => {
    ws.once('open', () => res());
    ws.once('error', rej);
  });

  ws.send(
    JSON.stringify({
      type: 'join_room',
      roomId: ROOM,
      name: 'Tester',
      characterId: 'hei_pi_ti_yu_sheng',
    }),
  );

  while (!logs.some((m) => m.type === 'joined')) await sleep(50);
  ws.send(JSON.stringify({ type: 'ready' }));
  for (let i = 0; i < 3; i++) {
    ws.send(JSON.stringify({ type: 'add_bot' }));
    await sleep(80);
  }
  ws.send(JSON.stringify({ type: 'start_game' }));

  let view: Record<string, unknown> | null = null;
  for (let i = 0; i < 40; i++) {
    await sleep(300);
    const gs = logs.filter((m) => m.type === 'game_state').at(-1);
    if (!gs?.state?.view) continue;
    view = gs.state.view;
    if (view.phase === 'discard' && view.currentPlayer === view.viewer) break;
    if (view.drawMode === 'choose' && view.currentPlayer === view.viewer) {
      ws.send(JSON.stringify({ type: 'draw_wall' }));
    }
  }

  console.log('turn', view?.phase, view?.currentPlayer);

  ws.send(JSON.stringify({ type: 'activate_skill', skillId: 'split_tile' }));
  await sleep(600);
  const act = logs.filter((m) => m.type === 'game_state').at(-1)?.state?.view as {
    skillActivity?: { step?: string; pickableHandTiles?: unknown[] };
  };
  console.log('activate ->', act?.skillActivity?.step, 'tiles', act?.skillActivity?.pickableHandTiles?.length);

  const lastGs = logs.filter((m) => m.type === 'game_state').at(-1);
  const hand = (lastGs?.state?.view as { players: Array<{ hand: { tiles: Array<{ id: string; suit: string; rank: number }> } }> })
    .players[0].hand.tiles;
  const source = hand.find(isSplittableTile)!;
  console.log('pick', source.id, source.suit, source.rank);

  const beforeLen = logs.length;
  ws.send(JSON.stringify({ type: 'skill_pick', tileId: source.id }));
  await sleep(1500);

  for (const m of logs.slice(beforeLen)) {
    if (m.type === 'error') console.log('ERROR', m.message);
    if (m.type === 'game_state') {
      const sa = (m.state?.view as { skillActivity?: Record<string, unknown> })?.skillActivity;
      console.log('game_state', JSON.stringify(sa));
    }
  }
  ws.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
