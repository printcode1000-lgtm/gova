import type { ComponentType } from "react";

import type { UiDescriptor } from "@asol/ui-registry-core";
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
  /** Per-tab UiRegistry identity, keyed by the tab's own stable domain id. */
  ui: UiDescriptor;
  enabled: (context: { isSuperAdmin: boolean }) => boolean;
}

const enabled = ({ isSuperAdmin }: { isSuperAdmin: boolean }) => isSuperAdmin;

export const RELEASE_CONSOLE_TABS: readonly ReleaseConsoleTabDefinition[] = [
  { id: "overview", labelKey: "releaseConsole.tabs.overview", icon: Activity,
    component: OverviewTab, order: 1,
    ui: { uid: "release-console.tab-overview-SD4jYj", id: "release-console.tab-overview", kind: "action", action: "select-tab", part: "tabs" }, enabled },
  { id: "store-text", labelKey: "releaseConsole.tabs.storeText", icon: FileText,
    component: StoreTextTab, order: 2,
    ui: { uid: "release-console.tab-store-text-n568QT", id: "release-console.tab-store-text", kind: "action", action: "select-tab", part: "tabs" }, enabled },
  { id: "store-images", labelKey: "releaseConsole.tabs.storeImages", icon: Images,
    component: StoreImagesTab, order: 3,
    ui: { uid: "release-console.tab-store-images-6TUSDG", id: "release-console.tab-store-images", kind: "action", action: "select-tab", part: "tabs" }, enabled },
  { id: "play-console", labelKey: "releaseConsole.tabs.playConsole", icon: Store,
    component: PlayConsoleTab, order: 4,
    ui: { uid: "release-console.tab-play-console-5wV9yC", id: "release-console.tab-play-console", kind: "action", action: "select-tab", part: "tabs" }, enabled },
  { id: "play-tracks", labelKey: "releaseConsole.tabs.playTracks", icon: Rocket,
    component: PlayTracksTab, order: 5,
    ui: { uid: "release-console.tab-play-tracks-2tdHjE", id: "release-console.tab-play-tracks", kind: "action", action: "select-tab", part: "tabs" }, enabled },
  { id: "build-publish", labelKey: "releaseConsole.tabs.buildPublish", icon: Play,
    component: BuildPublishTab, order: 6,
    ui: { uid: "release-console.tab-build-publish-5htZPt", id: "release-console.tab-build-publish", kind: "action", action: "select-tab", part: "tabs" }, enabled },
  { id: "jobs", labelKey: "releaseConsole.tabs.jobs", icon: ListChecks,
    component: JobsTab, order: 7,
    ui: { uid: "release-console.tab-jobs-Z4XaN4", id: "release-console.tab-jobs", kind: "action", action: "select-tab", part: "tabs" }, enabled },
  { id: "bundle-analysis", labelKey: "releaseConsole.tabs.bundleAnalysis", icon: Boxes,
    component: BundleAnalysisTab, order: 8,
    ui: { uid: "release-console.tab-bundle-analysis-wLU0SI", id: "release-console.tab-bundle-analysis", kind: "action", action: "select-tab", part: "tabs" }, enabled },
  { id: "ota-releases", labelKey: "releaseConsole.tabs.otaReleases", icon: CloudDownload,
    component: OtaReleasesTab, order: 9,
    ui: { uid: "release-console.tab-ota-releases-3FFYc2", id: "release-console.tab-ota-releases", kind: "action", action: "select-tab", part: "tabs" }, enabled },
];
