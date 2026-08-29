import type { ComponentType } from "react";

import {
  Activity,
  Boxes,
  CloudDownload,
  FileText,
  Images,
  ListChecks,
  Play,
  Rocket,
  Store,
  type LucideIcon,
} from "lucide-react";

import { BuildPublishTab } from "./BuildPublishTab";
import { BundleAnalysisTab } from "./BundleAnalysisTab";
import { JobsTab } from "./JobsTab";
import { OtaReleasesTab } from "./OtaReleasesTab";
import { OverviewTab } from "./OverviewTab";
import { PlayConsoleTab } from "./PlayConsoleTab";
import { PlayTracksTab } from "./PlayTracksTab";
import { StoreImagesTab } from "./StoreImagesTab";
import { StoreTextTab } from "./StoreTextTab";

export interface ReleaseConsoleTabDefinition {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  component: ComponentType;
  order: number;
  enabled: (context: { isSuperAdmin: boolean }) => boolean;
}

const enabled = ({ isSuperAdmin }: { isSuperAdmin: boolean }) => isSuperAdmin;

export const RELEASE_CONSOLE_TABS: readonly ReleaseConsoleTabDefinition[] = [
  { id: "overview", labelKey: "releaseConsole.tabs.overview", icon: Activity,
    component: OverviewTab, order: 1, enabled },
  { id: "store-text", labelKey: "releaseConsole.tabs.storeText", icon: FileText,
    component: StoreTextTab, order: 2, enabled },
  { id: "store-images", labelKey: "releaseConsole.tabs.storeImages", icon: Images,
    component: StoreImagesTab, order: 3, enabled },
  { id: "play-console", labelKey: "releaseConsole.tabs.playConsole", icon: Store,
    component: PlayConsoleTab, order: 4, enabled },
  { id: "play-tracks", labelKey: "releaseConsole.tabs.playTracks", icon: Rocket,
    component: PlayTracksTab, order: 5, enabled },
  { id: "build-publish", labelKey: "releaseConsole.tabs.buildPublish", icon: Play,
    component: BuildPublishTab, order: 6, enabled },
  { id: "jobs", labelKey: "releaseConsole.tabs.jobs", icon: ListChecks,
    component: JobsTab, order: 7, enabled },
  { id: "bundle-analysis", labelKey: "releaseConsole.tabs.bundleAnalysis", icon: Boxes,
    component: BundleAnalysisTab, order: 8, enabled },
  { id: "ota-releases", labelKey: "releaseConsole.tabs.otaReleases", icon: CloudDownload,
    component: OtaReleasesTab, order: 9, enabled },
];
