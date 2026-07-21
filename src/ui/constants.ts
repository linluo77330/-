/** 联机 WebSocket 默认地址（可通过 VITE_WS_URL 覆盖；开发模式默认连本机） */
export const DEFAULT_WS_URL =
  import.meta.env.VITE_WS_URL?.trim() ||
  (import.meta.env.DEV ? 'ws://127.0.0.1:3001' : 'ws://106.54.195.75:3001');

/** 预留：可用于检测不兼容的旧版服务器 */
export function isSupportedOnlineServer(_url: string): boolean {
  return true;
}

export function onlineServerErrorMessage(raw: string): string {
  if (raw === '未知消息类型') {
    return `当前连接的服务器版本过旧，不支持角色技能。请确认服务端已更新，并使用 ${DEFAULT_WS_URL} 重新连接。`;
  }
  return raw;
}
