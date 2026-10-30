export const APP_STORE_ID = "6747908544";
export const PLAY_STORE_ID = "com.flatcove.app";
export const APP_STORE_URL = `https://apps.apple.com/app/flatsby/id${APP_STORE_ID}`;
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_ID}`;

export const ANDROID_SIGNING_CERTS = [
  // Play app signing key, which signs every install from the store
  "3A:E7:D0:C4:C8:E1:DE:EC:50:25:38:47:DA:57:7F:0C:6E:56:AA:33:09:04:29:D8:80:2B:F8:C4:18:B7:8A:CE",
  // EAS upload key, which signs builds installed outside Play
  "26:41:6C:DB:91:BB:13:84:BE:B2:01:A0:8E:79:21:0E:41:3A:22:A4:36:A6:AB:41:B5:D0:C5:92:F5:79:D7:0C",
];
