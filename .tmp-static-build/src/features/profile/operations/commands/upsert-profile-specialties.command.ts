import type { ProfileSpecialtiesSelection } from "../../entities/profile-specialties.entity";
import type { IProfileRepository } from "../../repositories/profile-repository.interface";

export class UpsertProfileSpecialtiesCommand {
  constructor(private repository: IProfileRepository) {}
  async execute(
    uid: string,
    selection: ProfileSpecialtiesSelection,
  ): Promise<ProfileSpecialtiesSelection> {
    await this.repository.upsertSpecialties(uid, selection);
    return selection;
  }
}
