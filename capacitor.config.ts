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
    contentInset: 'never',
    backgroundColor: '#000000',
  },
  plugins: {
    // Keep the launch splash up until the live page has rendered (hidden
    // from NativeSplashHide), instead of a black gap while www.ryzr.app
    // loads. The failsafe hides it anyway if the page never loads.
    SplashScreen: {
      launchAutoHide: false,
      // NOTE: 0 makes the plugin skip showing the launch splash entirely.
      // With launchAutoHide false this value is not a timer — hide() is.
      launchShowDuration: 3000,
      backgroundColor: '#000000',
      showSpinner: false,
    },
    PushNotifications: {
      // Capacitor's own foreground notification handler suppresses banners
      // unless these are explicitly listed.
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
