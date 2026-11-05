import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'website.omniscan.app', // or your app's package ID
  appName: 'OmniScan',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#f8f9fa',
    },
  },
};

export default config;