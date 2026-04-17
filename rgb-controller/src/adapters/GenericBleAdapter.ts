import { Device, DeviceCapability, DeviceTransport } from "../core/types";
import { deviceManager } from "../core/DeviceManager";

const BLE_RGB_SERVICE_UUID = "0000ffe5-0000-1000-8000-00805f9b34fb";
const BLE_RGB_CHARACTERISTIC_UUID = "0000ffe9-0000-1000-8000-00805f9b34fb";

export class GenericBleAdapter implements Device {
  id: string;
  name: string;
  transport: DeviceTransport = "ble";
  capabilities: DeviceCapability[] = ["rgb"];
  isConnected: boolean = false;

  private bleDevice: BluetoothDevice | null = null;
  private bleCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

  constructor() {
    this.id = `ble-generic-${Date.now()}`;
    this.name = "Generic BLE Device";
  }

  async connect(): Promise<void> {
    if (!("bluetooth" in navigator)) {
      throw new Error("Web Bluetooth not supported.");
    }

    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [BLE_RGB_SERVICE_UUID] }],
      optionalServices: [BLE_RGB_SERVICE_UUID],
    });

    const server = await device.gatt?.connect();
    if (!server) {
      throw new Error("GATT server not available.");
    }

    const service = await server.getPrimaryService(BLE_RGB_SERVICE_UUID);
    const characteristic = await service.getCharacteristic(
      BLE_RGB_CHARACTERISTIC_UUID,
    );

    device.addEventListener(
      "gattserverdisconnected",
      () => {
        this.isConnected = false;
        this.bleDevice = null;
        this.bleCharacteristic = null;
        deviceManager.notifyListeners();
      },
      { once: true },
    );

    this.bleDevice = device;
    this.bleCharacteristic = characteristic;
    this.name = device.name ?? "Unnamed BLE Device";
    this.id = `ble-${device.id || Date.now()}`;
    this.isConnected = true;

    deviceManager.notifyListeners();
  }

  async disconnect(): Promise<void> {
    if (this.bleDevice && this.bleDevice.gatt) {
      this.bleDevice.gatt.disconnect();
    }
    this.isConnected = false;
    this.bleDevice = null;
    this.bleCharacteristic = null;
    deviceManager.notifyListeners();
  }

  async setColor(r: number, g: number, b: number): Promise<void> {
    if (!this.isConnected || !this.bleCharacteristic) {
      throw new Error("BLE device not connected");
    }
    const payload = new Uint8Array([0x56, r, g, b, 0x00, 0xf0, 0xaa]);
    await this.bleCharacteristic.writeValue(payload);
  }
}
