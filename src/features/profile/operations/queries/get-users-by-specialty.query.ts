import type { IProfileRepository, UserProfileRow } from "../../repositories/profile-repository.interface";

export class GetUsersBySpecialtyQuery {
  constructor(private repository: IProfileRepository) {}
  async execute(
    categoryId: number,
    subcategoryId: number,
    offset: number,
    limit: number,
  ): Promise<UserProfileRow[]> {
    return this.repository.getUsersBySpecialty(categoryId, subcategoryId, offset, limit);
  }
}
