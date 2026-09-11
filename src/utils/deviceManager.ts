import { DevicePermissionState, AndroidDeviceState, DeviceCommandResult } from '../types';

/**
 * Controller for Android Device features, browser APIs, and simulated hardware integrations
 */
export class DeviceManager {
  private static instance: DeviceManager;
  private cameraStream: MediaStream | null = null;
  private track: MediaStreamTrack | null = null;

  public static getInstance(): DeviceManager {
    if (!DeviceManager.instance) {
      DeviceManager.instance = new DeviceManager();
    }
    return DeviceManager.instance;
  }

  // Check and toggle Flashlight / Torch
  public async toggleFlashlight(enable?: boolean): Promise<boolean> {
    try {
      if (this.track && this.cameraStream) {
        const capabilities = this.track.getCapabilities() as any;
        if (capabilities.torch) {
          const newState = enable !== undefined ? enable : !(this.track as any).getSettings()?.torch;
          await (this.track as any).applyConstraints({
            advanced: [{ torch: newState }],
          });
          return newState;
        }
      }

      if (enable || enable === undefined) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        this.cameraStream = stream;
        const track = stream.getVideoTracks()[0];
        this.track = track;
        const capabilities = track.getCapabilities() as any;
        if (capabilities.torch) {
          await (track as any).applyConstraints({
            advanced: [{ torch: true }],
          });
          return true;
        }
      } else {
        if (this.cameraStream) {
          this.cameraStream.getTracks().forEach((t) => t.stop());
          this.cameraStream = null;
          this.track = null;
        }
        return false;
      }
    } catch (e) {
      console.warn('Physical flashlight not accessible in browser environment, toggled virtual torch', e);
    }
    return enable !== undefined ? enable : true;
  }

  // Get Battery Status if supported by Web Battery API
  public async getBatteryStatus(): Promise<{ level: number; charging: boolean } | null> {
    try {
      if ('getBattery' in navigator) {
        const battery: any = await (navigator as any).getBattery();
        return {
          level: Math.round(battery.level * 100),
          charging: battery.charging,
        };
      }
    } catch (e) {
      console.warn('Battery API unavailable:', e);
    }
    return null;
  }

  // Geolocation
  public async getCurrentPosition(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn('Geolocation error:', err);
          resolve(null);
        },
        { timeout: 8000 }
      );
    });
  }

  // System Vibration feedback (Android haptics)
  public vibrate(pattern: number | number[] = 100) {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  // Open native Android intent or web URL
  public openAppOrUrl(urlOrApp: string): boolean {
    try {
      if (urlOrApp.startsWith('http://') || urlOrApp.startsWith('https://')) {
        window.open(urlOrApp, '_blank');
      } else {
        // Handle common app schemes
        const lower = urlOrApp.toLowerCase();
        if (lower.includes('youtube')) {
          window.open('https://youtube.com', '_blank');
        } else if (lower.includes('whatsapp')) {
          window.open('https://web.whatsapp.com', '_blank');
        } else if (lower.includes('spotify') || lower.includes('music')) {
          window.open('https://open.spotify.com', '_blank');
        } else if (lower.includes('maps') || lower.includes('google map')) {
          window.open('https://maps.google.com', '_blank');
        } else if (lower.includes('camera')) {
          // Trigger camera preview
          return true;
        } else if (lower.includes('dial') || lower.includes('call')) {
          const number = urlOrApp.replace(/[^0-9+]/g, '') || '';
          window.location.href = `tel:${number}`;
        } else {
          window.open(`https://www.google.com/search?q=${encodeURIComponent(urlOrApp)}`, '_blank');
        }
      }
      return true;
    } catch (e) {
      console.warn('Failed to open app/URL:', e);
      return false;
    }
  }
}

export const deviceManager = DeviceManager.getInstance();
