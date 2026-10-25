import { PLAY_STORE_ID } from "@flatsby/validators/store";

export const dynamic = "force-static";

export function GET() {
  return Response.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: PLAY_STORE_ID,
        sha256_cert_fingerprints: [
          // Play app signing key, which signs every install from the store
          "3A:E7:D0:C4:C8:E1:DE:EC:50:25:38:47:DA:57:7F:0C:6E:56:AA:33:09:04:29:D8:80:2B:F8:C4:18:B7:8A:CE",
          // EAS upload key, which signs builds installed outside Play
          "26:41:6C:DB:91:BB:13:84:BE:B2:01:A0:8E:79:21:0E:41:3A:22:A4:36:A6:AB:41:B5:D0:C5:92:F5:79:D7:0C",
        ],
      },
    },
  ]);
}
