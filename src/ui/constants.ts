/** 本地开发默认地址 */
const LOCAL_WS_URL = 'ws://127.0.0.1:3001';

/**
 * 联机 WebSocket 地址。
 * - 本地开发：ws://127.0.0.1:3001（需 npm run server）
 * - 云部署：构建时设置 VITE_WS_URL，例如 ws://你的公网IP:3001 或 wss://域名/ws
 */
export const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL?.trim() || LOCAL_WS_URL;

/** 已知不支持角色技能协议的旧远程服 */
export const LEGACY_REMOTE_WS_URL = 'ws://106.54.195.75:3001';

/** 预留：可用于检测不兼容的旧版服务器 */
export function isSupportedOnlineServer(_url: string): boolean {
  return true;
}

export function onlineServerErrorMessage(raw: string): string {
  if (raw === '未知消息类型') {
    return '当前连接的服务器不支持角色技能。请先运行 npm run server，并在加入房间时使用 ws://127.0.0.1:3001，然后点击「返回房间」重新连接。';
  }
  return raw;
}
