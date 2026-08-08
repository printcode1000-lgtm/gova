import { getAppLinkAssociationConfig } from "@/core/config/server-env";

function associationDetails() {
  const { iosTeamId: teamId, iosBundleId: bundleId } =
    getAppLinkAssociationConfig();
  if (!/^[A-Z0-9]{10}$/.test(teamId)) return [];
  return [
    {
      appID: `${teamId}.${bundleId}`,
      paths: ["/s/product", "/s/profile"],
    },
  ];
}

export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      applinks: {
        apps: [],
        details: associationDetails(),
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "Content-Type": "application/json",
      },
    },
  );
}
