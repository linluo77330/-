import type { GameEventListener, GameEventMap, GameEventName } from './events.js';

/**
 * 轻量 Typed EventEmitter
 * before_* 事件：任一监听器返回 false 则取消后续动作
 */
export class TypedEventEmitter {
  private listeners = new Map<GameEventName, Set<GameEventListener<GameEventName>>>();

  on<K extends GameEventName>(event: K, listener: GameEventListener<K>): () => void {
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(event, bucket);
    }
    bucket.add(listener as GameEventListener<GameEventName>);
    return () => this.off(event, listener);
  }

  once<K extends GameEventName>(event: K, listener: GameEventListener<K>): () => void {
    const wrapper: GameEventListener<K> = (payload) => {
      this.off(event, wrapper);
      return listener(payload);
    };
    return this.on(event, wrapper);
  }

  off<K extends GameEventName>(event: K, listener: GameEventListener<K>): void {
    this.listeners.get(event)?.delete(listener as GameEventListener<GameEventName>);
  }

  /** 同步 emit；返回 false 表示被 before_* 钩子取消 */
  emit<K extends GameEventName>(event: K, payload: GameEventMap[K]): boolean {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return true;

    for (const listener of set) {
      const result = listener(payload);
      if (result === false) return false;
    }
    return true;
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
