/** 本地联机服务端，需先运行 npm run server */
export const DEFAULT_WS_URL = 'ws://127.0.0.1:3001';

/** 已知不支持角色技能协议的旧远程服 */
export const LEGACY_REMOTE_WS_URL = 'ws://106.54.195.75:3001';

export function isSupportedOnlineServer(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  if (trimmed.includes('106.54.195.75')) return false;
  return true;
}

export function onlineServerErrorMessage(raw: string): string {
  if (raw === '未知消息类型') {
    return '当前连接的服务器不支持角色技能。请先运行 npm run server，并在加入房间时使用 ws://127.0.0.1:3001，然后点击「返回房间」重新连接。';
  }
  return raw;
}
