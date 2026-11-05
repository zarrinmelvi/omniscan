import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'OmniScan',
  webDir: 'dist',
  server: {
    url: 'https://omniscan.website',
    cleartext: true,
    androidScheme: 'https',
    allowNavigation: [
      'omniscan.website',
      '*.omniscan.website',
      'accounts.google.com'
    ]
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
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    }
  }
};

export default config;