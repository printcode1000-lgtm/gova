import type { IProfileRepository } from "../../repositories/profile-repository.interface";
import type { ProfileDirectoryEntry } from "../../entities";

export class GetUsersBySpecialtyQuery {
  constructor(private repository: IProfileRepository) {}
  async execute(
    categoryId: number,
    subcategoryId: number,
    offset: number,
    limit: number,
    search?: string,
    minRating?: number,
  ): Promise<ProfileDirectoryEntry[]> {
    return this.repository.getUsersBySpecialty(categoryId, subcategoryId, offset, limit, search, minRating);
  }
}
