import { redirect } from "next/navigation";

export default function OtaReleasesAdminPage() {
  redirect("/super-admin/google-play-store-assets?tab=ota-releases");
}
