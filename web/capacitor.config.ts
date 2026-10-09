import type { CapacitorConfig } from '@capacitor/cli';

/**
 * The Android app: the built web app (`pnpm android:apk`) inside an APK that farmers sideload. Everything the chat
 * needs is in the APK; the AI models still come once from the hub over its Wi-Fi ("Ihanda ang AI").
 */
const config: CapacitorConfig = {
  appId: 'ph.appbuilders.ugatan',
  appName: 'Ugatan',
  webDir: 'dist',
  server: {
    // The app runs at http://localhost, which browsers treat as secure: WebGPU and the model cache work, and the hub's
    // plain http address on the Wi-Fi is not blocked as mixed content (it would be from https://localhost).
    androidScheme: 'http',
    // The hub on the Wi-Fi has no TLS.
    cleartext: true,
  },
};

export default config;
