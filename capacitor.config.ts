import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.ryzr.trading',
  appName: 'Ryzr',
  webDir: 'out',
  server: {
    // Use live URL so the app always has fresh content
    url: 'https://www.ryzr.app',
    cleartext: false,
    // Clerk's sign-in widget loads scripts/frames from its own subdomain —
    // without this, the WebView blocks that cross-origin navigation and
    // the sign-in form hangs indefinitely.
    allowNavigation: ['clerk.ryzr.app'],
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0F1117',
  },
};

export default config;
