import type { ProfileSpecialtiesSelection } from "@/features/profile/entities/profile-specialties.entity";
import { EMPTY_PROFILE_SPECIALTIES } from "@/features/profile/entities/profile-specialties.entity";
import type { IProfileRepository } from "@/modules/data-access/domains/profile/repositories/profile-repository.interface";

export class GetProfileSpecialtiesQuery {
  constructor(private repository: IProfileRepository) {}
  async execute(uid: string): Promise<ProfileSpecialtiesSelection> {
    return (
      (await this.repository.getSpecialties(uid)) ?? EMPTY_PROFILE_SPECIALTIES
    );
  }
}
