type Handler = (...args: any[]) => void;

class EventBus {
  private listeners = new Map<string, Set<Handler>>();

  emit(event: string, ...payload: any[]) {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(...payload);
      } catch (error) {
        console.error(`EventBus handler error for ${event}:`, error);
      }
    }
  }

  subscribe(event: string, handler: Handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => {
      this.listeners.get(event)?.delete(handler);
      if (this.listeners.get(event)?.size === 0) {
        this.listeners.delete(event);
      }
    };
  }
}

export const eventBus = new EventBus();
