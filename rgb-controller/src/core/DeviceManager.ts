import { Device } from "./types";

export class DeviceManager {
  private devices: Map<string, Device> = new Map();
  private listeners: Set<() => void> = new Set();

  registerDevice(device: Device) {
    this.devices.set(device.id, device);
    this.notifyListeners();
  }

  getDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  getConnectedDevices(): Device[] {
    return this.getDevices().filter((d) => d.isConnected);
  }

  async broadcastColor(
    r: number,
    g: number,
    b: number,
  ): Promise<{ delivered: number; errors: string[] }> {
    const connected = this.getConnectedDevices();
    if (connected.length === 0) {
      return { delivered: 0, errors: [] };
    }

    const promises = connected.map(async (device) => {
      try {
        await device.setColor(r, g, b);
        return { success: true, deviceId: device.id };
      } catch (error) {
        return { success: false, deviceId: device.id, error: String(error) };
      }
    });

    const results = await Promise.all(promises);
    const delivered = results.filter((r) => r.success).length;
    const errors = results
      .filter((r) => !r.success)
      .map((r) => `Device ${r.deviceId}: ${r.error}`);

    return { delivered, errors };
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }
}

export const deviceManager = new DeviceManager();
