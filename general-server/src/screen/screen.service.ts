import type { ScreenWindow } from './screen.dto.ts';
import { deviceMetricsCollector } from './device.collector.ts';

export class ScreenService {
  async getDevice(window: ScreenWindow) {
    return deviceMetricsCollector.getSnapshot(window);
  }
}

export const screenService = new ScreenService();
