import { invoke } from "@tauri-apps/api/core";
import { Device, DeviceCapability, DeviceTransport } from "../core/types";
import { deviceManager } from "../core/DeviceManager";

export class GenericUsbAdapter implements Device {
  id: string;
  name: string;
  transport: DeviceTransport = "usb";
  capabilities: DeviceCapability[] = ["rgb"];
  isConnected: boolean = false;

  constructor(portName: string) {
    this.id = `usb-${portName}`;
    this.name = `USB Device (${portName})`;
  }

  async connect(): Promise<void> {
    try {
      const portName = this.id.replace("usb-", "");
      await invoke("connect_usb", { portName });
      this.isConnected = true;
      deviceManager.notifyListeners();
    } catch (e) {
      this.isConnected = false;
      throw e;
    }
  }

  async disconnect(): Promise<void> {
    // Tauri generic serial doesn't have a disconnect exposed right now,
    // so we just mark it as disconnected.
    this.isConnected = false;
    deviceManager.notifyListeners();
  }

  async setColor(r: number, g: number, b: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error("USB device not connected");
    }
    await invoke("set_usb_color", { r, g, b });
  }

  // Static helper to discover devices
  static async discover(): Promise<GenericUsbAdapter[]> {
    try {
      const ports = await invoke<string[]>("scan_usb_ports");
      return ports.map((port) => new GenericUsbAdapter(port));
    } catch (e) {
      console.error("Failed to scan USB ports:", e);
      return [];
    }
  }
}
