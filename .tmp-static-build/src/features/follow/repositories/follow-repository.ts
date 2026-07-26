import "server-only";

import { and, count, eq } from "drizzle-orm";

import { profileDbClient } from "@/core/database/profile-db-client";
import type { IDatabaseClient } from "@/core/database/database-client.interface";
import { follows } from "@/core/database/profile/profile.schema";
import type {
  FollowAudience,
  FollowMutationInput,
  FollowStatusInput,
  FollowTargetType,
} from "../entities/follow.types";

function createFollowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `follow_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export class FollowRepository {
  constructor(private readonly database: IDatabaseClient = profileDbClient) {}

  async getStatus(input: FollowStatusInput): Promise<{
    followerCount: number;
    isFollowing: boolean;
  }> {
    const [countRow] = await this.database.db
      .select({ value: count() })
      .from(follows)
      .where(
        and(
          eq(follows.targetType, input.targetType),
          eq(follows.targetId, input.targetId),
        ),
      );

    let isFollowing = false;
    if (input.viewerUid) {
      const rows = await this.database.db
        .select({ id: follows.id })
        .from(follows)
        .where(
          and(
            eq(follows.followerUid, input.viewerUid),
            eq(follows.targetType, input.targetType),
            eq(follows.targetId, input.targetId),
          ),
        )
        .limit(1);
      isFollowing = rows.length > 0;
    }

    return {
      followerCount: Number(countRow?.value ?? 0),
      isFollowing,
    };
  }

  async follow(input: FollowMutationInput): Promise<boolean> {
    const existing = await this.database.db
      .select({ id: follows.id })
      .from(follows)
      .where(
        and(
          eq(follows.followerUid, input.viewerUid),
          eq(follows.targetType, input.targetType),
          eq(follows.targetId, input.targetId),
        ),
      )
      .limit(1);

    if (existing.length > 0) return false;

    await this.database.db.insert(follows).values({
      id: createFollowId(),
      followerUid: input.viewerUid,
      targetType: input.targetType,
      targetId: input.targetId,
      targetOwnerUid: input.targetOwnerUid ?? "",
      createdAt: new Date().toISOString(),
    });
    return true;
  }

  async unfollow(input: FollowMutationInput): Promise<boolean> {
    const existing = await this.database.db
      .select({ id: follows.id })
      .from(follows)
      .where(
        and(
          eq(follows.followerUid, input.viewerUid),
          eq(follows.targetType, input.targetType),
          eq(follows.targetId, input.targetId),
        ),
      )
      .limit(1);

    if (existing.length === 0) return false;

    await this.database.db
      .delete(follows)
      .where(eq(follows.id, existing[0].id));
    return true;
  }

  async listFollowerUids(
    targetType: FollowTargetType,
    targetId: string,
  ): Promise<FollowAudience> {
    const rows = await this.database.db
      .select({ followerUid: follows.followerUid })
      .from(follows)
      .where(
        and(eq(follows.targetType, targetType), eq(follows.targetId, targetId)),
      );

    return {
      targetType,
      targetId,
      followerUids: rows.map((row: { followerUid: string }) => row.followerUid),
    };
  }
}

export const followRepository = new FollowRepository();
