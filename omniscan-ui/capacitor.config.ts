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
      serverClientId: '394571296954-2nkqagdbfjujgdei1aoiq78fg3p9i7nv.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_notification',
      iconColor: '#488AFF',
    }
  }
};

export default config;