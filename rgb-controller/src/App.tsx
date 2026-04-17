import { startTransition, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Cpu,
  Layers,
  Monitor,
  Power,
  RefreshCw,
  Settings,
  TerminalSquare,
} from "lucide-react";
import "./App.css";

const BLE_RGB_SERVICE_UUID = "0000ffe5-0000-1000-8000-00805f9b34fb";
const BLE_RGB_CHARACTERISTIC_UUID = "0000ffe9-0000-1000-8000-00805f9b34fb";

type TabId = "dashboard" | "profiles" | "control";
type Accent = "cyan" | "violet" | "magenta" | "emerald" | "slate";
type EventTone = "neutral" | "success" | "warn" | "error";

type Profile = {
  name: string;
  hex: string;
  description: string;
  hardware: string;
  ribbon: string;
};

type EventEntry = {
  id: number;
  message: string;
  tone: EventTone;
};

type PanelProps = {
  title: string;
  eyebrow: string;
  accent: Accent;
  icon: LucideIcon;
  className?: string;
  children: ReactNode;
};

type MetricCardProps = {
  label: string;
  value: string;
  accent?: Accent;
};

const NAV_ITEMS: Array<{ id: TabId; label: string; kicker: string; icon: LucideIcon }> = [
  { id: "dashboard", label: "Dashboard", kicker: "Signal", icon: Activity },
  { id: "profiles", label: "Profiles", kicker: "Mood", icon: Layers },
  { id: "control", label: "Control", kicker: "Live", icon: Settings },
];

const PROFILES: Profile[] = [
  {
    name: "Cyberpunk Neon",
    hex: "#14f1ff",
    description: "Cold cyan blast with enough voltage to wake up the room.",
    hardware: "Best for ambient strips and motherboard spill.",
    ribbon: "linear-gradient(90deg, #14f1ff 0%, #8e5bff 55%, #ff3b8d 100%)",
  },
  {
    name: "Ember Pulse",
    hex: "#ff6a3d",
    description: "Hot orange-red mix for warmer scenes and dramatic cases.",
    hardware: "Good with diffused fans and warm desk bounce.",
    ribbon: "linear-gradient(90deg, #ffcc70 0%, #ff6a3d 45%, #8a1c1c 100%)",
  },
  {
    name: "Deep Ocean",
    hex: "#2f7cff",
    description: "Blue-heavy wash with less noise and more focus.",
    hardware: "Nice for longer sessions and cleaner peripheral glow.",
    ribbon: "linear-gradient(90deg, #58d6ff 0%, #2f7cff 55%, #111f72 100%)",
  },
  {
    name: "Void Bloom",
    hex: "#d649ff",
    description: "Magenta-forward bloom for a softer neon look.",
    hardware: "Useful when RAM and strips need the same stage energy.",
    ribbon: "linear-gradient(90deg, #4e0d74 0%, #d649ff 55%, #ff98d7 100%)",
  },
  {
    name: "Ghost Ice",
    hex: "#dffcff",
    description: "Very pale aqua for subtle, almost-white chill lighting.",
    hardware: "Great for low-intensity background scenes.",
    ribbon: "linear-gradient(90deg, #ffffff 0%, #dffcff 45%, #7be7ff 100%)",
  },
];

const DELIVERY_TRACK: Array<{ label: string; detail: string }> = [
  {
    label: "Integrated now",
    detail: "USB scan/connect, BLE connect, master color broadcast, visual shell.",
  },
  {
    label: "Ready for Jules",
    detail: "Refine layout density, richer telemetry, better state storytelling, disconnect flows.",
  },
  {
    label: "Ready for Stitch",
    detail: "Final polish, animation tuning, component cleanup, production hardening.",
  },
];

function buildEvent(message: string, tone: EventTone = "neutral"): EventEntry {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    message,
    tone,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function Panel({ title, eyebrow, accent, icon: Icon, className = "", children }: PanelProps) {
  return (
    <section className={`panel panel--${accent} ${className}`.trim()}>
      <header className="panel__header">
        <div>
          <p className="panel__eyebrow">{eyebrow}</p>
          <h2 className="panel__title">{title}</h2>
        </div>
        <span className="panel__icon" aria-hidden="true">
          <Icon size={18} />
        </span>
      </header>
      <div className="panel__body">{children}</div>
    </section>
  );
}

function MetricCard({ label, value, accent = "cyan" }: MetricCardProps) {
  return (
    <div className={`metric-card metric-card--${accent}`}>
      <span className="metric-card__label">{label}</span>
      <strong className="metric-card__value">{value}</strong>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [systemPower, setSystemPower] = useState(true);
  const [usbPorts, setUsbPorts] = useState<string[]>([]);
  const [selectedPort, setSelectedPort] = useState("");
  const [connectedUsbPort, setConnectedUsbPort] = useState<string | null>(null);
  const [bleDevice, setBleDevice] = useState<BluetoothDevice | null>(null);
  const [bleCharacteristic, setBleCharacteristic] =
    useState<BluetoothRemoteGATTCharacteristic | null>(null);
  const [color, setColor] = useState(PROFILES[0].hex);
  const [activeProfile, setActiveProfile] = useState(PROFILES[0].name);
  const [statusLine, setStatusLine] = useState(
    "Control deck online. Start with USB scan or BLE link and then throw color at it.",
  );
  const [isScanningUsb, setIsScanningUsb] = useState(false);
  const [isConnectingUsb, setIsConnectingUsb] = useState(false);
  const [isConnectingBle, setIsConnectingBle] = useState(false);
  const [activityLog, setActivityLog] = useState<EventEntry[]>([
    buildEvent("Chromaflow deck booted. Awaiting first hardware handshake."),
    buildEvent("Visual shell integrated over the live RGB routing layer.", "success"),
  ]);

  const connectedTargets = Number(Boolean(connectedUsbPort)) + Number(Boolean(bleCharacteristic));

  const pushEvent = (message: string, tone: EventTone = "neutral") => {
    setActivityLog((previous) => [buildEvent(message, tone), ...previous].slice(0, 8));
  };

  const scanUsbPorts = async (reason = "USB scan refreshed.") => {
    setIsScanningUsb(true);

    try {
      const ports = await invoke<string[]>("scan_usb_ports");
      setUsbPorts(ports);
      setSelectedPort((current) => {
        if (current && ports.includes(current)) {
          return current;
        }

        return ports[0] ?? "";
      });

      const nextStatus =
        ports.length > 0
          ? `Found ${ports.length} USB port${ports.length === 1 ? "" : "s"} ready for selection.`
          : "No USB ports detected yet. That can still be fine if you are going BLE-only.";

      setStatusLine(nextStatus);
      pushEvent(`${reason} ${ports.length} port${ports.length === 1 ? "" : "s"} visible.`, "success");
    } catch (error) {
      const message = `USB scan failed: ${String(error)}`;
      setStatusLine(message);
      pushEvent(message, "error");
    } finally {
      setIsScanningUsb(false);
    }
  };

  useEffect(() => {
    void scanUsbPorts("Startup scan complete.");
  }, []);

  const sendColorUsb = async (r: number, g: number, b: number) => {
    await invoke("set_usb_color", { r, g, b });
  };

  const sendColorBle = async (r: number, g: number, b: number) => {
    if (!bleCharacteristic) {
      throw new Error("No BLE characteristic available.");
    }

    // Generic RGB BLE payload used by many low-cost controllers.
    const payload = new Uint8Array([0x56, r, g, b, 0x00, 0xf0, 0xaa]);
    await bleCharacteristic.writeValue(payload);
  };

  const broadcastColor = async (hex: string, source: string) => {
    setColor(hex);
    const [r, g, b] = hexToRgb(hex);

    if (!systemPower) {
      const message = `Preview updated to ${hex}, but system power is offline so nothing was transmitted.`;
      setStatusLine(message);
      pushEvent(`${source} parked at ${hex} while the deck is offline.`, "warn");
      return;
    }

    const targets: Array<{ label: string; action: () => Promise<void> }> = [];

    if (connectedUsbPort) {
      targets.push({
        label: `USB ${connectedUsbPort}`,
        action: () => sendColorUsb(r, g, b),
      });
    }

    if (bleCharacteristic && bleDevice) {
      targets.push({
        label: `BLE ${bleDevice.name ?? "Unnamed device"}`,
        action: () => sendColorBle(r, g, b),
      });
    }

    if (targets.length === 0) {
      const message = `Color ${hex} staged locally. No active hardware targets yet.`;
      setStatusLine(message);
      pushEvent(`${source} staged ${hex} with no live targets attached.`, "warn");
      return;
    }

    const results = await Promise.allSettled(targets.map((target) => target.action()));
    const delivered = results.filter((result) => result.status === "fulfilled").length;

    if (delivered > 0) {
      const successTargets = targets
        .filter((_, index) => results[index]?.status === "fulfilled")
        .map((target) => target.label)
        .join(", ");
      const message = `${source} pushed ${hex} to ${successTargets}.`;
      setStatusLine(message);
      pushEvent(message, "success");
    }

    const failureMessages = results
      .map((result, index) =>
        result.status === "rejected" ? `${targets[index]?.label ?? "Unknown target"}: ${String(result.reason)}` : null,
      )
      .filter((value): value is string => Boolean(value));

    if (failureMessages.length > 0) {
      const message = `Some targets rejected the color push. ${failureMessages.join(" | ")}`;
      setStatusLine(message);
      pushEvent(message, "error");
    }
  };

  const handleConnectUsb = async () => {
    if (!selectedPort) {
      const message = "Pick a COM/TTY port first so I have something to talk to.";
      setStatusLine(message);
      pushEvent(message, "warn");
      return;
    }

    setIsConnectingUsb(true);

    try {
      await invoke("connect_usb", { portName: selectedPort });
      setConnectedUsbPort(selectedPort);
      const message = `USB link established on ${selectedPort}.`;
      setStatusLine(message);
      pushEvent(message, "success");
    } catch (error) {
      const message = `USB connection failed on ${selectedPort}: ${String(error)}`;
      setStatusLine(message);
      pushEvent(message, "error");
    } finally {
      setIsConnectingUsb(false);
    }
  };

  const handleConnectBluetooth = async () => {
    if (!("bluetooth" in navigator)) {
      const message =
        "This runtime does not expose Web Bluetooth, so BLE pairing is unavailable from here.";
      setStatusLine(message);
      pushEvent(message, "error");
      return;
    }

    setIsConnectingBle(true);

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BLE_RGB_SERVICE_UUID] }],
        optionalServices: [BLE_RGB_SERVICE_UUID],
      });

      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error("GATT server not available.");
      }

      const service = await server.getPrimaryService(BLE_RGB_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(BLE_RGB_CHARACTERISTIC_UUID);

      device.addEventListener(
        "gattserverdisconnected",
        () => {
          setBleDevice(null);
          setBleCharacteristic(null);
          setStatusLine("BLE link dropped. Reconnect when the device is back in range.");
          pushEvent("BLE device disconnected.", "warn");
        },
        { once: true },
      );

      setBleDevice(device);
      setBleCharacteristic(characteristic);
      const deviceName = device.name ?? "Unnamed BLE device";
      const message = `BLE link established with ${deviceName}.`;
      setStatusLine(message);
      pushEvent(message, "success");
    } catch (error) {
      const message = `BLE connection failed: ${String(error)}`;
      setStatusLine(message);
      pushEvent(message, "error");
    } finally {
      setIsConnectingBle(false);
    }
  };

  const handleProfileSelect = (profile: Profile) => {
    startTransition(() => {
      setActiveProfile(profile.name);
    });
    void broadcastColor(profile.hex, `Profile ${profile.name}`);
  };

  const handleColorInputChange = (hex: string) => {
    startTransition(() => {
      setActiveProfile("Custom Mix");
    });
    void broadcastColor(hex, "Manual color");
  };

  const statusBadges = [
    { label: "Power", value: systemPower ? "ONLINE" : "OFFLINE" },
    { label: "USB", value: connectedUsbPort ? "LINKED" : "IDLE" },
    { label: "BLE", value: bleDevice ? "LINKED" : "IDLE" },
    { label: "Targets", value: String(connectedTargets) },
  ];

  return (
    <div className="control-room">
      <div className="ambient ambient--left" aria-hidden="true" />
      <div className="ambient ambient--right" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />

      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="brand-mark" aria-hidden="true">
            <Monitor size={24} />
          </div>
          <div>
            <p className="brand-kicker">ControRGB</p>
            <h1 className="brand-title">Chromaflow</h1>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-button ${activeTab === item.id ? "is-active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-button__icon" aria-hidden="true">
                <item.icon size={18} />
              </span>
              <span className="nav-button__text">
                <small>{item.kicker}</small>
                <strong>{item.label}</strong>
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar__footer">
          <button
            type="button"
            className={`power-button ${systemPower ? "is-on" : ""}`}
            onClick={() => {
              setSystemPower((current) => !current);
              pushEvent(
                systemPower
                  ? "System power toggled offline. Color changes will stay local."
                  : "System power toggled online. Live pushes are enabled again.",
                systemPower ? "warn" : "success",
              );
            }}
          >
            <Power size={18} />
            <span>{systemPower ? "System Online" : "System Offline"}</span>
          </button>

          <p className="sidebar__note">
            We are doing the strong bones here. Jules and Stitch can handle the eyeliner.
          </p>
        </div>
      </aside>

      <main className="main-stage">
        <header className="hero-band">
          <div className="hero-copy">
            <p className="hero-copy__eyebrow">RGB command spine / Tauri + USB + BLE</p>
            <h2 className="hero-copy__title">A proper control deck instead of a lonely color input.</h2>
            <p className="hero-copy__body">{statusLine}</p>
          </div>

          <div className="hero-status">
            {statusBadges.map((badge) => (
              <div key={badge.label} className="status-badge">
                <span>{badge.label}</span>
                <strong>{badge.value}</strong>
              </div>
            ))}
          </div>
        </header>

        {activeTab === "dashboard" ? (
          <section className="dashboard-grid">
            <Panel title="Live Routing" eyebrow="Current scene" accent="cyan" icon={Activity} className="span-7">
              <div className="hero-core">
                <div className="hero-core__swatch" style={{ background: color }} />
                <div className="hero-core__meta">
                  <p className="hero-core__label">Active profile</p>
                  <h3>{activeProfile}</h3>
                  <p>{color.toUpperCase()}</p>
                </div>
              </div>

              <div className="metric-row">
                <MetricCard label="USB link" value={connectedUsbPort ?? "Not linked"} accent="violet" />
                <MetricCard label="BLE link" value={bleDevice?.name ?? "Not linked"} accent="magenta" />
                <MetricCard
                  label="Broadcast mode"
                  value={systemPower ? "Live fire" : "Preview only"}
                  accent="emerald"
                />
              </div>
            </Panel>

            <Panel title="USB Link" eyebrow="Wired control" accent="violet" icon={Monitor} className="span-5">
              <div className="stack">
                <label className="field">
                  <span className="field__label">Detected COM / TTY ports</span>
                  <select
                    className="field__control"
                    value={selectedPort}
                    onChange={(event) => setSelectedPort(event.target.value)}
                  >
                    <option value="">Select a port</option>
                    {usbPorts.map((port) => (
                      <option key={port} value={port}>
                        {port}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="button-row">
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => void scanUsbPorts("Manual scan complete.")}
                    disabled={isScanningUsb}
                  >
                    <RefreshCw size={16} className={isScanningUsb ? "spin" : ""} />
                    <span>{isScanningUsb ? "Scanning" : "Rescan"}</span>
                  </button>

                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => void handleConnectUsb()}
                    disabled={isConnectingUsb}
                  >
                    <Monitor size={16} />
                    <span>{isConnectingUsb ? "Linking" : "Connect USB"}</span>
                  </button>
                </div>
              </div>
            </Panel>

            <Panel title="BLE Link" eyebrow="Wireless control" accent="magenta" icon={Cpu} className="span-5">
              <div className="stack">
                <div className="status-card">
                  <span className="status-card__label">Connected device</span>
                  <strong>{bleDevice?.name ?? "No BLE device linked yet"}</strong>
                </div>

                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => void handleConnectBluetooth()}
                  disabled={isConnectingBle}
                >
                  <Cpu size={16} />
                  <span>{isConnectingBle ? "Pairing" : "Connect BLE"}</span>
                </button>
              </div>
            </Panel>

            <Panel title="Master Chroma" eyebrow="Manual override" accent="emerald" icon={Settings} className="span-7">
              <div className="color-console">
                <label className="color-picker">
                  <span className="color-picker__swatch" style={{ background: color }} />
                  <input
                    className="color-picker__input"
                    type="color"
                    value={color}
                    onChange={(event) => handleColorInputChange(event.target.value)}
                    aria-label="Master color picker"
                  />
                </label>

                <div className="color-console__meta">
                  <p className="hero-core__label">Output hex</p>
                  <strong>{color.toUpperCase()}</strong>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => void broadcastColor(color, "Manual re-fire")}
                  >
                    <Activity size={16} />
                    <span>Re-fire current color</span>
                  </button>
                </div>
              </div>
            </Panel>

            <Panel title="Runtime Log" eyebrow="Watch the deck talk back" accent="slate" icon={TerminalSquare} className="span-6">
              <div className="terminal">
                {activityLog.map((entry) => (
                  <div key={entry.id} className={`terminal__line terminal__line--${entry.tone}`}>
                    <span className="terminal__prompt">{">"}</span>
                    <span>{entry.message}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Handoff Map" eyebrow="Deliberate rough edges" accent="cyan" icon={Layers} className="span-6">
              <div className="handoff-list">
                {DELIVERY_TRACK.map((item) => (
                  <article key={item.label} className="handoff-list__item">
                    <h3>{item.label}</h3>
                    <p>{item.detail}</p>
                  </article>
                ))}
              </div>
            </Panel>
          </section>
        ) : null}

        {activeTab === "profiles" ? (
          <section className="profile-grid">
            {PROFILES.map((profile) => {
              const isActive = profile.name === activeProfile;

              return (
                <button
                  key={profile.name}
                  type="button"
                  className={`profile-card ${isActive ? "is-active" : ""}`}
                  onClick={() => handleProfileSelect(profile)}
                >
                  <span className="profile-card__ribbon" style={{ background: profile.ribbon }} />
                  <div className="profile-card__body">
                    <div>
                      <p className="profile-card__eyebrow">Preset profile</p>
                      <h3>{profile.name}</h3>
                      <p className="profile-card__desc">{profile.description}</p>
                    </div>
                    <div className="profile-card__footer">
                      <span>{profile.hex.toUpperCase()}</span>
                      <small>{profile.hardware}</small>
                    </div>
                  </div>
                </button>
              );
            })}
          </section>
        ) : null}

        {activeTab === "control" ? (
          <section className="control-grid">
            <Panel title="Connection State" eyebrow="Active targets" accent="cyan" icon={Activity} className="span-6">
              <div className="stack">
                <div className="status-card">
                  <span className="status-card__label">USB transport</span>
                  <strong>{connectedUsbPort ?? "Waiting for wired link"}</strong>
                </div>
                <div className="status-card">
                  <span className="status-card__label">BLE transport</span>
                  <strong>{bleDevice?.name ?? "Waiting for wireless link"}</strong>
                </div>
                <div className="status-card">
                  <span className="status-card__label">Current profile</span>
                  <strong>{activeProfile}</strong>
                </div>
              </div>
            </Panel>

            <Panel title="Quick Fire" eyebrow="One-click scene pushes" accent="magenta" icon={Settings} className="span-6">
              <div className="quick-palette">
                {PROFILES.slice(0, 4).map((profile) => (
                  <button
                    key={profile.name}
                    type="button"
                    className="quick-palette__chip"
                    onClick={() => handleProfileSelect(profile)}
                    style={{ background: profile.ribbon }}
                  >
                    <span>{profile.name}</span>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Operational Notes" eyebrow="What is intentionally rough" accent="slate" icon={TerminalSquare} className="span-12">
              <div className="notes">
                <p>
                  The shell is wired to real USB and BLE color pushes right now. Disconnect flows, richer telemetry,
                  and deeper hardware introspection are intentionally left light so the next pass can focus on product
                  quality instead of plumbing.
                </p>
                <p>
                  In other words: we handled the grunt work, and the future team gets to wear nicer gloves.
                </p>
              </div>
            </Panel>
          </section>
        ) : null}
      </main>
    </div>
  );
}
