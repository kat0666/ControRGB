import { Device, DeviceCapability, DeviceTransport } from "../core/types";
import { deviceManager } from "../core/DeviceManager";

export class WledAdapter implements Device {
  id: string;
  name: string;
  transport: DeviceTransport = "lan";
  capabilities: DeviceCapability[] = ["rgb", "strip"];
  isConnected: boolean = false;

  private ipAddress: string;

  constructor(ipAddress: string) {
    this.ipAddress = ipAddress;
    this.id = `wled-${ipAddress}`;
    this.name = `WLED Strip (${ipAddress})`;
  }

  async connect(): Promise<void> {
    try {
      // Scaffold: Test connection by fetching WLED info
      const response = await fetch(`http://${this.ipAddress}/json/info`, {
        signal: AbortSignal.timeout(2000),
      });
      if (!response.ok) throw new Error("WLED not responding");

      const data = await response.json();
      this.name = data.name || this.name;
      this.isConnected = true;
      deviceManager.notifyListeners();
    } catch (e) {
      this.isConnected = false;
      throw new Error(
        `Could not connect to WLED at ${this.ipAddress}: ${String(e)}`,
      );
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    deviceManager.notifyListeners();
  }

  async setColor(r: number, g: number, b: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error("WLED device not connected");
    }

    // WLED JSON API payload for setting solid color on primary segment
    const payload = {
      seg: [{ col: [[r, g, b]] }],
    };

    try {
      await fetch(`http://${this.ipAddress}/json/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error(`WLED command failed on ${this.ipAddress}:`, e);
      throw e;
    }
  }
}
