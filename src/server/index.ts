import { WebSocketServer, WebSocket } from 'ws';
import { parseClientMessage, sendMessage } from '../shared/protocol.js';
import { RoomManager } from './RoomManager.js';

const PORT = Number(process.env.PORT ?? 3001);
const manager = new RoomManager();
const socketRooms = new WeakMap<WebSocket, { roomId: string }>();

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    const raw = data.toString();

    let msg;
    try {
      msg = parseClientMessage(raw);
    } catch {
      sendMessage(ws, { type: 'error', message: '无效消息格式' });
      return;
    }

    if (msg.type === 'join_room') {
      const room = manager.getOrCreate(msg.roomId);
      socketRooms.set(ws, { roomId: msg.roomId });
      room.handleMessage(ws, raw);
      return;
    }

    const binding = socketRooms.get(ws);
    if (!binding) {
      sendMessage(ws, { type: 'error', message: '请先加入房间' });
      return;
    }

    const room = manager.getOrCreate(binding.roomId);
    room.handleMessage(ws, raw);
  });

  ws.on('close', () => {
    const binding = socketRooms.get(ws);
    if (!binding) return;
    const room = manager.getOrCreate(binding.roomId);
    room.disconnect(ws);
    manager.removeIfEmpty(binding.roomId);
  });
});

console.log(`[skill-mahjong] WebSocket server ws://localhost:${PORT}`);
