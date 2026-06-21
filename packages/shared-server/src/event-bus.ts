import { EventEmitter } from 'node:events';

class SharedEventBus extends EventEmitter {
  clear() {
    this.removeAllListeners();
  }
}

export const sharedEventBus = new SharedEventBus();
