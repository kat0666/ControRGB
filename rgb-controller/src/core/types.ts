export type DeviceTransport = "usb" | "ble" | "lan" | "virtual";

export type DeviceCapability = "rgb" | "rgbw" | "matrix" | "fan" | "strip";

export interface Device {
  id: string;
  name: string;
  transport: DeviceTransport;
  capabilities: DeviceCapability[];
  isConnected: boolean;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  setColor(r: number, g: number, b: number): Promise<void>;
}

export interface DeviceGroup {
  id: string;
  name: string;
  devices: Device[];
}
