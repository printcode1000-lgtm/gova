import type { IProfileRepository } from "../../repositories/profile-repository.interface";
import {
  EMPTY_PROFILE_FULFILLMENT_SETTINGS,
  type ProfileFulfillmentSettings,
} from "../../entities/profile-fulfillment-settings.entity";
import { traceServerLayer } from "@/core/monitor/trace-server-layer";

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
