import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.compani.app',
  appName: 'Compani',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
  android: {
    versionCode: 2,
  },
  ios: {
    buildNumber: '2',
  },
};

export default config;
