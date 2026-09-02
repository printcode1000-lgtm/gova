import { profilesDataSource } from "../../../core";
import "server-only";

import type { IDatabaseClient } from "../../../core/database/database-client.interface";
import type {
  FollowAudience,
  FollowMutationInput,
  FollowStatusInput,
  FollowTargetType,
} from "../entities";

function createFollowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `follow_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export class FollowRepository {
  constructor(private readonly database: IDatabaseClient = profilesDataSource) {}

  async getStatus(input: FollowStatusInput): Promise<{
    followerCount: number;
    isFollowing: boolean;
  }> {
    const [countRow] = await this.database.execute(
      "SELECT COUNT(*) AS value FROM follows WHERE target_type = ? AND target_id = ?",
      [input.targetType, input.targetId],
    );

    let isFollowing = false;
    if (input.viewerUid) {
      const rows = await this.database.execute(
        `SELECT id FROM follows
         WHERE follower_uid = ? AND target_type = ? AND target_id = ?
         LIMIT 1`,
        [input.viewerUid, input.targetType, input.targetId],
      );
      isFollowing = rows.length > 0;
    }

    return {
      followerCount: Number(countRow?.value ?? 0),
      isFollowing,
    };
  }

  async follow(input: FollowMutationInput): Promise<boolean> {
    const existing = await this.database.execute(
      `SELECT id FROM follows
       WHERE follower_uid = ? AND target_type = ? AND target_id = ?
       LIMIT 1`,
      [input.viewerUid, input.targetType, input.targetId],
    );

    if (existing.length > 0) return false;

    await this.database.insert("follows", {
      id: createFollowId(),
      follower_uid: input.viewerUid,
      target_type: input.targetType,
      target_id: input.targetId,
      target_owner_uid: input.targetOwnerUid ?? "",
      created_at: new Date().toISOString(),
    });
    return true;
  }

  async unfollow(input: FollowMutationInput): Promise<boolean> {
    const existing = await this.database.execute(
      `SELECT id FROM follows
       WHERE follower_uid = ? AND target_type = ? AND target_id = ?
       LIMIT 1`,
      [input.viewerUid, input.targetType, input.targetId],
    );

    if (existing.length === 0) return false;

    await this.database.delete("follows", { id: existing[0].id });
    return true;
  }

  async listFollowerUids(
    targetType: FollowTargetType,
    targetId: string,
  ): Promise<FollowAudience> {
    const rows = await this.database.execute(
      "SELECT follower_uid AS followerUid FROM follows WHERE target_type = ? AND target_id = ?",
      [targetType, targetId],
    );

    return {
      targetType,
      targetId,
      followerUids: rows.map((row: { followerUid: string }) => row.followerUid),
    };
  }
}

export const followRepository = new FollowRepository();
