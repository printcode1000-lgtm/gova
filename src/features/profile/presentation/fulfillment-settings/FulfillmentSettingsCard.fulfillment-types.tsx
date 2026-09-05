import type { ProfileSectionStatus } from "../profile-save-controller";

export interface FulfillmentSettingsCardProps {
  onStatusChange?: (status: ProfileSectionStatus) => void;
}
