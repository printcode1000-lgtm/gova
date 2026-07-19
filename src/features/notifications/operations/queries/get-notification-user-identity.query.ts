import "server-only";

import { UserRepository } from "@/features/auth/repositories/user-repository";

export class GetNotificationUserIdentityQuery {
  constructor(private readonly users = new UserRepository()) {}

  async execute(uid: string): Promise<{ uid: string; phone: string } | null> {
    const user = await this.users.getByUid(uid);
    return user ? { uid: user.uid, phone: user.phone } : null;
  }
}
