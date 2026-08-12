import type { IProfileRepository, UserProfileRow } from "@/modules/data-access/domains/profile/repositories/profile-repository.interface";

export class GetUsersBySpecialtyQuery {
  constructor(private repository: IProfileRepository) {}
  async execute(
    categoryId: number,
    subcategoryId: number,
    offset: number,
    limit: number,
    search?: string,
    minRating?: number,
  ): Promise<UserProfileRow[]> {
    return this.repository.getUsersBySpecialty(categoryId, subcategoryId, offset, limit, search, minRating);
  }
}
