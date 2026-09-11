import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Mic,
  Camera,
  Flashlight,
  MapPin,
  Bell,
  Volume2,
  Sliders,
  Sun,
  Wifi,
  Bluetooth,
  Smartphone,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  BatteryCharging,
  Zap,
} from 'lucide-react';
import { DevicePermissionState, AndroidDeviceState } from '../types';

interface AndroidDeviceControlPanelProps {
  permissions: DevicePermissionState;
  onTogglePermission: (key: keyof DevicePermissionState) => void;
  onGrantAll: () => void;
  deviceState: AndroidDeviceState;
  onUpdateDeviceState: (partial: Partial<AndroidDeviceState>) => void;
  onTriggerAction: (action: string) => void;
}

export const AndroidDeviceControlPanel: React.FC<AndroidDeviceControlPanelProps> = ({
  permissions,
  onTogglePermission,
  onGrantAll,
  deviceState,
  onUpdateDeviceState,
  onTriggerAction,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'permissions'>('status');

  const grantedCount = Object.values(permissions).filter(Boolean).length;
  const totalPermissions = Object.keys(permissions).length;
  const allGranted = grantedCount === totalPermissions;

  return (
    <div
      id="android-device-panel"
      className="w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4"
    >
      {/* Top Header / Status bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span>Android System Controls</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                Connected
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Control phone hardware, hardware settings & apps</p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeTab === 'status' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Quick Controls
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
              activeTab === 'permissions' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3 h-3 text-amber-400" />
            <span>Permissions ({grantedCount}/{totalPermissions})</span>
          </button>
        </div>
      </div>

      {activeTab === 'status' ? (
        <div className="space-y-3.5">
          {/* Hardware Quick Action Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Flashlight */}
            <button
              id="device-action-flashlight"
              onClick={() => onTriggerAction('toggle_flashlight')}
              className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 text-center ${
                deviceState.flashlightOn
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-300 shadow-md shadow-amber-500/10'
                  : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60 text-slate-300'
              }`}
            >
              <Flashlight className={`w-5 h-5 ${deviceState.flashlightOn ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
              <div>
                <div className="text-xs font-semibold">Flashlight</div>
                <div className="text-[10px] opacity-70">{deviceState.flashlightOn ? 'ON' : 'OFF'}</div>
              </div>
            </button>

            {/* Wi-Fi */}
            <button
              id="device-action-wifi"
              onClick={() => onTriggerAction('toggle_wifi')}
              className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 text-center ${
                deviceState.wifiEnabled
                  ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 shadow-md'
                  : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60 text-slate-300'
              }`}
            >
              <Wifi className={`w-5 h-5 ${deviceState.wifiEnabled ? 'text-cyan-400' : 'text-slate-400'}`} />
              <div>
                <div className="text-xs font-semibold">Wi-Fi</div>
                <div className="text-[10px] opacity-70">{deviceState.wifiEnabled ? 'Connected' : 'Disabled'}</div>
              </div>
            </button>

            {/* Bluetooth */}
            <button
              id="device-action-bluetooth"
              onClick={() => onTriggerAction('toggle_bluetooth')}
              className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 text-center ${
                deviceState.bluetoothEnabled
                  ? 'bg-blue-500/20 border-blue-400/60 text-blue-300 shadow-md'
                  : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60 text-slate-300'
              }`}
            >
              <Bluetooth className={`w-5 h-5 ${deviceState.bluetoothEnabled ? 'text-blue-400' : 'text-slate-400'}`} />
              <div>
                <div className="text-xs font-semibold">Bluetooth</div>
                <div className="text-[10px] opacity-70">{deviceState.bluetoothEnabled ? 'Active' : 'Off'}</div>
              </div>
            </button>

            {/* Battery / Power */}
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col items-center justify-center gap-2 text-center">
              <BatteryCharging className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-xs font-semibold">Battery</div>
                <div className="text-[10px] text-emerald-400 font-mono font-medium">
                  {deviceState.batteryLevel}% {deviceState.isCharging ? '(Charging)' : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Sliders for Volume & Brightness */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Volume Control */}
            <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  Media Volume
                </span>
                <span className="font-mono text-indigo-300 font-semibold">{deviceState.volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={deviceState.volume}
                onChange={(e) => onUpdateDeviceState({ volume: parseInt(e.target.value, 10) })}
                className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Brightness Control */}
            <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  Screen Brightness
                </span>
                <span className="font-mono text-amber-300 font-semibold">{deviceState.brightness}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={deviceState.brightness}
                onChange={(e) => onUpdateDeviceState({ brightness: parseInt(e.target.value, 10) })}
                className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Fast App Launch Shortcuts */}
          <div className="flex items-center gap-2 pt-1 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] text-slate-400 shrink-0">Open:</span>
            {[
              { label: 'YouTube', icon: '▶️', action: 'launch_youtube' },
              { label: 'WhatsApp', icon: '💬', action: 'launch_whatsapp' },
              { label: 'Spotify', icon: '🎵', action: 'launch_spotify' },
              { label: 'Maps', icon: '🗺️', action: 'launch_maps' },
              { label: 'Camera', icon: '📷', action: 'launch_camera' },
            ].map((app, i) => (
              <button
                key={i}
                onClick={() => onTriggerAction(app.action)}
                className="shrink-0 text-xs px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/50 flex items-center gap-1 active:scale-95 transition-all"
              >
                <span>{app.icon}</span>
                <span>{app.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Permissions Management Screen */
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              {allGranted ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              )}
              <div>
                <div className="text-xs font-semibold text-slate-100">
                  {allGranted ? 'Full Device Control Authorized' : 'Partial Permissions Granted'}
                </div>
                <div className="text-[10px] text-slate-400">
                  Allow Uboo full access to operate system settings, apps, and hardware like Siri.
                </div>
              </div>
            </div>
            {!allGranted && (
              <button
                onClick={onGrantAll}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
              >
                Grant All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {[
              { key: 'microphone', label: 'Microphone & Live Speech', desc: 'Capture voice input and wake words' },
              { key: 'flashlight', label: 'Flashlight & Torch Control', desc: 'Switch camera LED on and off' },
              { key: 'camera', label: 'Camera & Visual Input', desc: 'Take photos and open camera' },
              { key: 'systemSettings', label: 'Volume & Brightness Hardware', desc: 'Change screen brightness & sound' },
              { key: 'appLauncher', label: 'App Launcher & Navigation', desc: 'Open YouTube, WhatsApp, Spotify, Maps' },
              { key: 'location', label: 'GPS Geolocation & Weather', desc: 'Real-time location & navigation queries' },
              { key: 'notifications', label: 'Android Notifications & Alarms', desc: 'Push spoken alerts and reminders' },
              { key: 'automation', label: 'Background Automation', desc: 'Continuous listening and automation rules' },
            ].map(({ key, label, desc }) => {
              const permKey = key as keyof DevicePermissionState;
              const isAllowed = permissions[permKey];
              return (
                <div
                  key={key}
                  onClick={() => onTogglePermission(permKey)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isAllowed
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-200">{label}</div>
                    <div className="text-[10px] text-slate-400">{desc}</div>
                  </div>
                  <div className="text-lg">
                    {isAllowed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
