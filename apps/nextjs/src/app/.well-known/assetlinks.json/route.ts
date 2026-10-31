import {
  ANDROID_SIGNING_CERTS,
  PLAY_STORE_ID,
} from "@flatsby/validators/store";

export const dynamic = "force-static";

export function GET() {
  return Response.json([
    {
      relation: [
        "delegate_permission/common.handle_all_urls",
        // Lets the app use passkeys made for the website
        "delegate_permission/common.get_login_creds",
      ],
      target: {
        namespace: "android_app",
        package_name: PLAY_STORE_ID,
        sha256_cert_fingerprints: ANDROID_SIGNING_CERTS,
      },
    },
  ]);
}
