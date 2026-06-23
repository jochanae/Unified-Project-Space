import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.64b14a7ef0484aaaa8b0c285b09183e0',
  appName: 'IntoIQ',
  webDir: 'dist',
  server: {
    url: 'https://64b14a7e-f048-4aaa-a8b0-c285b09183e0.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic'
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
