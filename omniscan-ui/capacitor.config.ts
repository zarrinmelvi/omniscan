import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'OmniScan',
  webDir: 'dist',
  server: {
    cleartext: true,
    androidScheme: 'https',
    allowNavigation: [
      'omniscan.website',
      '*.omniscan.website',
      'accounts.google.com',
    ],
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#f8f9fa',
    },
    GoogleSignIn: {
      scopes: ['profile', 'email'],
      serverClientId: '394571296954-s5pjiqq3fg7hhcsm0i0tn6l4mfs69s7m.apps.googleusercontent.com',
    },
  },
};

export default config;