import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.ryzr.trading',
  appName: 'Ryzr',
  webDir: 'out',
  server: {
    // Use live URL so the app always has fresh content
    url: 'https://www.ryzr.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0F1117',
  },
};

export default config;
