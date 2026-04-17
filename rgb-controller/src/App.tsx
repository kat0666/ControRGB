import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

// Generic RGB BLE Service and Characteristic UUIDs (Standard for many LED strips)
const BLE_RGB_SERVICE_UUID = '0000ffe5-0000-1000-8000-00805f9b34fb';
const BLE_RGB_CHARACTERISTIC_UUID = '0000ffe9-0000-1000-8000-00805f9b34fb';

export default function App() {
  const [usbPorts, setUsbPorts] = useState<string[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [bleDevice, setBleDevice] = useState<BluetoothDevice | null>(null);
  const [bleCharacteristic, setBleCharacteristic] = useState<BluetoothRemoteGATTCharacteristic | null>(null);

  // Hex color state
  const [color, setColor] = useState<string>('#ff0000');

  useEffect(() => {
    invoke<string[]>('scan_usb_ports')
      .then(setUsbPorts)
      .catch(console.error);
  }, []);

  // --- NATIVE USB/SERIAL IPC LAYER ---
  const connectUsb = async () => {
    if (!selectedPort) return;
    try {
      await invoke('connect_usb', { portName: selectedPort });
      alert(`Connected to USB: ${selectedPort}`);
    } catch (err) {
      alert(`USB Connection Error: ${err}`);
    }
  };

  const sendColorUsb = async (r: number, g: number, b: number) => {
    try {
      await invoke('set_usb_color', { r, g, b });
    } catch (err) {
      console.error('USB Send Error:', err);
    }
  };

  // --- NATIVE BLUETOOTH WEB API LAYER ---
  const connectBluetooth = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BLE_RGB_SERVICE_UUID] }],
        optionalServices: [BLE_RGB_SERVICE_UUID]
      });

      const server = await device.gatt?.connect();
      if (!server) throw new Error("GATT Server not available");

      const service = await server.getPrimaryService(BLE_RGB_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(BLE_RGB_CHARACTERISTIC_UUID);

      setBleDevice(device);
      setBleCharacteristic(characteristic);
      alert(`Connected to BLE: ${device.name}`);
    } catch (err) {
      alert(`BLE Connection Error: ${err}`);
    }
  };

  const sendColorBle = async (r: number, g: number, b: number) => {
    if (!bleCharacteristic) return;
    // Protocol payload for standard BLE generic RGB controllers (0x56, R, G, B, 0x00, 0xF0, 0xAA)
    const payload = new Uint8Array([0x56, r, g, b, 0x00, 0xf0, 0xaa]);
    try {
      await bleCharacteristic.writeValue(payload);
    } catch (err) {
      console.error('BLE Send Error:', err);
    }
  };

  // --- SHARED UI LOGIC ---
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setColor(hex);

    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);

    // Broadcast to available protocols without blocking the main UI thread
    if (selectedPort) sendColorUsb(r, g, b);
    if (bleCharacteristic) sendColorBle(r, g, b);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>RGB Systems Controller</h1>
      
      <div style={{ margin: '2rem 0', padding: '1rem', border: '1px solid #ccc' }}>
        <h2>1. USB / PC Connection</h2>
        <select onChange={(e) => setSelectedPort(e.target.value)} value={selectedPort}>
          <option value="">Select COM/TTY Port</option>
          {usbPorts.map((port) => (
            <option key={port} value={port}>{port}</option>
          ))}
        </select>
        <button onClick={connectUsb} style={{ marginLeft: '1rem' }}>Connect USB</button>
      </div>

      <div style={{ margin: '2rem 0', padding: '1rem', border: '1px solid #ccc' }}>
        <h2>2. Bluetooth Connection</h2>
        <button onClick={connectBluetooth}>
          {bleDevice ? `Connected to ${bleDevice.name}` : 'Scan & Connect BLE Device'}
        </button>
      </div>

      <div style={{ margin: '2rem 0', padding: '1rem', border: '1px solid #ccc' }}>
        <h2>3. Master Color Control</h2>
        <input 
          type="color" 
          value={color} 
          onChange={handleColorChange} 
          style={{ width: '100px', height: '50px' }} 
        />
      </div>
    </div>
  );
}
