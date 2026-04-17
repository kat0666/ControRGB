// Prevents additional console window on Windows in release
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serialport::SerialPort;
use std::sync::Mutex;
use std::time::Duration;
use tauri::State;

// Global state to hold the serial port connection
pub struct RgbHardwareState {
    pub active_port: Mutex<Option<Box<dyn SerialPort>>>,
}

#[tauri::command]
fn scan_usb_ports() -> Result<Vec<String>, String> {
    let ports = serialport::available_ports().map_err(|e| e.to_string())?;
    Ok(ports.into_iter().map(|p| p.port_name).collect())
}

#[tauri::command]
fn connect_usb(state: State<'_, RgbHardwareState>, port_name: String) -> Result<(), String> {
    let port = serialport::new(&port_name, 115200)
        .timeout(Duration::from_millis(50))
        .open()
        .map_err(|e| format!("Failed to open port {}: {}", port_name, e))?;

    let mut state_port = state.active_port.lock().map_err(|_| "Mutex poisoned")?;
    *state_port = Some(port);
    
    Ok(())
}

#[tauri::command]
fn set_usb_color(state: State<'_, RgbHardwareState>, r: u8, g: u8, b: u8) -> Result<(), String> {
    let mut state_port = state.active_port.lock().map_err(|_| "Mutex poisoned")?;
    
    if let Some(port) = state_port.as_mut() {
        // Standard payload protocol:[HEADER (0x01), R, G, B, FOOTER (0x0A)]
        let payload: [u8; 5] =[0x01, r, g, b, 0x0A];
        port.write_all(&payload).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("No USB device connected".to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .manage(RgbHardwareState {
            active_port: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            scan_usb_ports,
            connect_usb,
            set_usb_color
        ])
        .run(tauri::generate_context!())
        .expect("Error initializing Tauri application architecture");
}
