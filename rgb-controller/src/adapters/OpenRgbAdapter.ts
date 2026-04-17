import { Device, DeviceCapability, DeviceTransport } from "../core/types";
import { deviceManager } from "../core/DeviceManager";

export class OpenRgbAdapter implements Device {
  id: string;
  name: string;
  transport: DeviceTransport = "virtual";
  capabilities: DeviceCapability[] = ["rgb", "matrix", "fan"];
  isConnected: boolean = false;

  constructor(host: string = "127.0.0.1", port: number = 6742) {
    this.id = `openrgb-${host}:${port}`;
    this.name = `OpenRGB SDK (${host}:${port})`;
  }

  async connect(): Promise<void> {
    // Scaffold: Connect to OpenRGB SDK server.
    // In reality this would require a WebSocket to TCP bridge or Tauri rust plugin,
    // as browsers can't do raw TCP. For now, we mock the connection.
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mocking a failure for now to show it's scaffolded, or success if we want to pretend.
        // Let's pretend success for the sake of UI testing.
        this.isConnected = true;
        deviceManager.notifyListeners();
        resolve();
      }, 500);
    });
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    deviceManager.notifyListeners();
  }

  async setColor(r: number, g: number, b: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error("OpenRGB SDK not connected");
    }

    // Scaffold: Would send SDK packet here.
    console.log(
      `[OpenRGB Scaffold] Setting color rgb(${r},${g},${b}) to all OpenRGB devices`,
    );
  }
}
