# Directivas Arquitectónicas para Agentes AI (Tauri + React + BLE)

Eres el Ingeniero de Control de Calidad de este repositorio. Al evaluar Pull Requests o generar código, debes aplicar **ESTRICTAMENTE** las siguientes reglas:

## 1. Separación de Responsabilidades (IPC)
- **Backend (Rust):** SOLO debe manejar puertos seriales/USB físicos y acceso al File System. NUNCA debe manejar lógica de renderizado ni bloquear el hilo principal.
- **Frontend (React/TS):** DEBE manejar el protocolo Bluetooth Low Energy (BLE) utilizando EXCLUSIVAMENTE la API `navigator.bluetooth`.
- NUNCA sugieras usar bibliotecas Bluetooth en Rust (como `btleplug`) a menos que el usuario lo solicite explícitamente.

## 2. Prevención de Bloqueos (Performance)
- Cualquier comando IPC (`#[tauri::command]`) en Rust que involucre I/O debe ser asíncrono o delegarse a un hilo secundario (`std::thread::spawn` o `tokio::spawn`).
- Evita el uso de `unwrap()` o `expect()` en Rust. Utiliza propagación de errores (`Result<T, E>`) mapeados a `String` para que el Frontend los maneje.

## 3. Manejo de Estado en React
- Los "Event Listeners" de Web Bluetooth deben limpiarse en los bloques `return` de los `useEffect` para evitar Memory Leaks.

## 4. Estilo y Sanitización
- Frontend: TypeScript estricto. No permitas el uso de `any`.
- Backend: El código debe pasar `cargo clippy -- -D warnings`.
