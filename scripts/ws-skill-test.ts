import WebSocket from 'ws';
import { normalizePlayerView } from '../src/core/playerView.js';
import { isSplittableTile } from '../src/core/skills/splitTile.js';

const WS_URL = process.env.WS_URL || 'ws://127.0.0.1:3001';
const ROOM = `skill-test-${Date.now()}`;

function waitFor(ws: WebSocket, predicate: (msg: { type: string; state?: { view: unknown } }) => boolean, timeoutMs = 8000) {
  return new Promise<{ type: string; state: { view: Record<string, unknown> } }>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout waiting for message')), timeoutMs);
    const onMessage = (raw: WebSocket.RawData) => {
      const msg = JSON.parse(raw.toString()) as { type: string; state?: { view: Record<string, unknown> } };
      if (predicate(msg)) {
        clearTimeout(timer);
        ws.off('message', onMessage);
        resolve(msg as { type: string; state: { view: Record<string, unknown> } });
      }
    };
    ws.on('message', onMessage);
  });
}

function send(ws: WebSocket, payload: object) {
  ws.send(JSON.stringify(payload));
}

async function main() {
  const ws = new WebSocket(WS_URL);
  await new Promise<void>((res, rej) => {
    ws.once('open', () => res());
    ws.once('error', rej);
  });

  send(ws, {
    type: 'join_room',
    roomId: ROOM,
    name: 'Tester',
    characterId: 'hei_pi_ti_yu_sheng',
  });
  await waitFor(ws, (m) => m.type === 'joined');
  send(ws, { type: 'ready' });

  for (let i = 0; i < 3; i++) {
    send(ws, { type: 'add_bot' });
    await new Promise((r) => setTimeout(r, 80));
  }

  send(ws, { type: 'start_game' });

  let view: Record<string, unknown> | null = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    const msg = await waitFor(ws, (m) => m.type === 'game_state', 15000);
    view = msg.state.view;
    if (view.phase === 'discard' && view.currentPlayer === view.viewer) break;
    if (view.drawMode === 'choose' && view.currentPlayer === view.viewer) {
      send(ws, { type: 'draw_wall' });
    }
  }

  if (!view || view.phase !== 'discard' || view.currentPlayer !== view.viewer) {
    throw new Error(`expected human discard turn, got phase=${view?.phase} current=${view?.currentPlayer}`);
  }

  console.log('discard turn reached, activating split_tile');
  send(ws, { type: 'activate_skill', skillId: 'split_tile' });

  const afterActivate = await waitFor(
    ws,
    (m) => m.type === 'game_state' && (m.state?.view as { skillActivity?: { step?: string } })?.skillActivity?.step === 'pick_source',
  );
  const norm1 = normalizePlayerView(afterActivate.state.view as never, {
    viewerCharacterId: 'hei_pi_ti_yu_sheng',
  });
  console.log('pick_source tiles:', norm1.skillActivity?.pickableHandTiles?.length ?? 0);

  const handState = norm1.players[norm1.viewer].hand;
  const hand = handState.kind === 'visible' ? handState.tiles : [];
  const source = hand.find(isSplittableTile);
  if (!source) throw new Error('no splittable tile in hand');

  send(ws, { type: 'skill_pick', tileId: source.id });

  const afterPick = await new Promise<{ type: string; state: { view: Record<string, unknown> }; message?: string }>(
    (resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout after skill_pick')), 8000);
      const onMessage = (raw: WebSocket.RawData) => {
        const msg = JSON.parse(raw.toString()) as {
          type: string;
          state?: { view: Record<string, unknown> };
          message?: string;
        };
        if (msg.type === 'error') {
          clearTimeout(timer);
          ws.off('message', onMessage);
          reject(new Error(`server error: ${msg.message}`));
          return;
        }
        if (msg.type === 'game_state') {
          const step = (msg.state?.view as { skillActivity?: { step?: string } })?.skillActivity?.step;
          if (step === 'pick_split' || step === 'pick_keep') {
            clearTimeout(timer);
            ws.off('message', onMessage);
            resolve(msg as { type: string; state: { view: Record<string, unknown> } });
          }
        }
      };
      ws.on('message', onMessage);
    },
  );
  const norm2 = normalizePlayerView(afterPick.state.view as never, {
    viewerCharacterId: 'hei_pi_ti_yu_sheng',
  });
  console.log('after source pick step:', norm2.skillActivity?.step);
  console.log('splitOptions:', norm2.skillActivity?.splitOptions?.length ?? 0);
  console.log('sourceTile:', norm2.skillActivity?.sourceTile?.id ?? null);

  if (norm2.skillActivity?.step === 'pick_split') {
    const [opt] = norm2.skillActivity.splitOptions ?? [];
    if (!opt) throw new Error('pick_split without splitOptions after normalize');
    send(ws, { type: 'skill_pick', splitRanks: [opt.rankA, opt.rankB] });
    await waitFor(
      ws,
      (m) => m.type === 'game_state' && (m.state?.view as { skillActivity?: { step?: string } })?.skillActivity?.step === 'pick_keep',
    );
    console.log('pick_keep OK');
  }

  ws.close();
  console.log('PASS: online split skill flow');
}

main().catch((err: Error) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
