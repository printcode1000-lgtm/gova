import "server-only";

import { FOLLOW_TARGET_TYPES } from "../entities/follow.types";
import type {
  FollowActionResult,
  FollowAudience,
  FollowMutationInput,
  FollowStatus,
  FollowStatusInput,
  FollowTargetType,
} from "../entities/follow.types";
import { FollowRepository } from "../repositories/follow-repository";

function normalizeTargetType(value: unknown): FollowTargetType {
  if (typeof value !== "string") throw new Error("invalidFollowTarget");
  if (!FOLLOW_TARGET_TYPES.includes(value as FollowTargetType)) {
    throw new Error("invalidFollowTarget");
  }
  return value as FollowTargetType;
}

function normalizeTargetId(value: unknown): string {
  const targetId = typeof value === "string" ? value.trim() : "";
  if (!targetId) throw new Error("invalidFollowTarget");
  return targetId;
}

function normalizeUid(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export class FollowService {
  constructor(private readonly repository = new FollowRepository()) {}

  async getStatus(input: FollowStatusInput): Promise<FollowStatus> {
    const targetType = normalizeTargetType(input.targetType);
    const targetId = normalizeTargetId(input.targetId);
    const viewerUid = normalizeUid(input.viewerUid);
    const targetOwnerUid = normalizeUid(input.targetOwnerUid);
    const base = await this.repository.getStatus({
      targetType,
      targetId,
      viewerUid,
    });
    const reason =
      viewerUid && targetOwnerUid && viewerUid === targetOwnerUid
        ? "self_not_allowed"
        : viewerUid
          ? undefined
          : "login_required";

    return {
      targetType,
      targetId,
      followerCount: base.followerCount,
      isFollowing: base.isFollowing,
      canFollow: !reason,
      reason,
    };
  }

  async follow(input: FollowMutationInput): Promise<FollowActionResult> {
    const normalized = this.normalizeMutation(input);
    const changed = await this.repository.follow(normalized);
    const status = await this.getStatus(normalized);
    return { ...status, changed };
  }

  async unfollow(input: FollowMutationInput): Promise<FollowActionResult> {
    const normalized = this.normalizeMutation(input);
    const changed = await this.repository.unfollow(normalized);
    const status = await this.getStatus(normalized);
    return { ...status, changed };
  }

  async listFollowerUids(
    targetType: FollowTargetType,
    targetId: string,
  ): Promise<FollowAudience> {
    return this.repository.listFollowerUids(
      normalizeTargetType(targetType),
      normalizeTargetId(targetId),
    );
  }

  private normalizeMutation(input: FollowMutationInput): FollowMutationInput {
    const viewerUid = normalizeUid(input.viewerUid);
    if (!viewerUid) throw new Error("followLoginRequired");
    const targetOwnerUid = normalizeUid(input.targetOwnerUid);
    const targetId = normalizeTargetId(input.targetId);
    if (targetOwnerUid && viewerUid === targetOwnerUid) {
      throw new Error("followSelfNotAllowed");
    }
    return {
      viewerUid,
      targetType: normalizeTargetType(input.targetType),
      targetId,
      targetOwnerUid,
    };
  }
}
