const LOCAL_RELEASE_CERT_SHA256 =
  "8D:FC:76:49:83:ED:49:BE:9C:6F:B1:97:2E:C5:C1:91:A3:FE:45:FE:3E:CA:8F:E7:5B:CD:C7:FD:DF:BA:4F:45";
const GOOGLE_PLAY_CERT_SHA256 =
  "63:66:4D:27:20:33:D0:04:D1:CB:11:63:23:EF:AF:96:56:FF:9E:6D:C6:6D:62:40:28:0D:67:4B:1E:A0:41:30";

function normalizeFingerprint(value: string): string | null {
  const hex = value.replace(/[^0-9a-f]/gi, "").toUpperCase();
  if (!/^[0-9A-F]{64}$/.test(hex)) return null;
  return hex.match(/.{2}/g)?.join(":") ?? null;
}

function fingerprints(): string[] {
  const configured = getAppLinkAssociationConfig()
    .androidCertificateFingerprints.map(normalizeFingerprint)
    .filter((value): value is string => Boolean(value));
  return Array.from(
    new Set([
      ...configured,
      GOOGLE_PLAY_CERT_SHA256,
      LOCAL_RELEASE_CERT_SHA256,
    ]),
  );
}

export const dynamic = "force-static";

export function GET() {
  return Response.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "hgh.asol.app",
          sha256_cert_fingerprints: fingerprints(),
        },
      },
    ],
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
import { getAppLinkAssociationConfig } from "@/core/config/server-env";
