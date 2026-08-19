import type { IProfileRepository } from "../../repositories/profile-repository.interface";
import {
  EMPTY_PROFILE_FULFILLMENT_SETTINGS,
  type ProfileFulfillmentSettings,
} from "@/features/profile/entities/profile-fulfillment-settings.entity";
import { traceServerLayer } from '../../../../ports/telemetry';

export class GetProfileFulfillmentSettingsQuery {
  constructor(private profileRepository: IProfileRepository) {}

  async execute(uid: string): Promise<ProfileFulfillmentSettings> {
    return traceServerLayer(
      "query-command",
      "GetProfileFulfillmentSettingsQuery",
      async () =>
        (await this.profileRepository.getFulfillmentSettings(uid)) ??
        EMPTY_PROFILE_FULFILLMENT_SETTINGS,
    );
  }
}
