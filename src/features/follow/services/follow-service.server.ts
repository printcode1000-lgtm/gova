import "server-only";

import { FOLLOW_TARGET_TYPES } from "../domain/follow.types";
import type {
  FollowActionResult,
  FollowAudience,
  FollowMutationInput,
  FollowStatus,
  FollowStatusInput,
  FollowTargetType,
} from "../domain/follow.types";
import { FollowRepository } from "@asol/data-core/follow";
import { verifySignedSessionToken } from "@asol/auth-core/server";
import { isSuperAdminIdentity } from "@/features/auth";
import { notificationsServer } from "@/features/notifications/server";
import type { SendFollowerNotificationInput, SendFollowerNotificationResult } from "../domain/follow.types";

const MAX_NOTIFICATION_TITLE_LENGTH = 120;
const MAX_NOTIFICATION_BODY_LENGTH = 1_000;
const MAX_FOLLOWER_NOTIFICATIONS_PER_MINUTE = 3;
const recentFollowerNotifications = new Map<string, number[]>();

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

  async notifyFollowers(
    input: SendFollowerNotificationInput,
    sessionToken: string,
  ): Promise<SendFollowerNotificationResult> {
    const claims = verifySignedSessionToken(sessionToken.trim());
    const actorUid = normalizeUid(input.identity?.uid);
    const actorPhone = normalizeUid(input.identity?.phone);
    if (claims.uid !== actorUid || claims.phone !== actorPhone) {
      throw new Error("forbidden");
    }

    const targetType = normalizeTargetType(input.targetType);
    const targetId = normalizeTargetId(input.targetId);
    const targetOwnerUid = normalizeUid(input.targetOwnerUid) || targetId;
    const canManage =
      (targetType === "store" && actorUid === targetOwnerUid && targetOwnerUid === targetId) ||
      isSuperAdminIdentity(actorUid, actorPhone);
    if (!canManage) throw new Error("forbidden");

    const title = typeof input.title === "string" ? input.title.trim() : "";
    const body = typeof input.body === "string" ? input.body.trim() : "";
    if (!title || !body) throw new Error("notificationContentRequired");
    if (
      title.length > MAX_NOTIFICATION_TITLE_LENGTH ||
      body.length > MAX_NOTIFICATION_BODY_LENGTH
    ) {
      throw new Error("notificationContentTooLong");
    }
    const requestId = typeof input.requestId === "string" ? input.requestId.trim() : "";
    if (!/^[a-zA-Z0-9:_-]{8,160}$/.test(requestId)) {
      throw new Error("notificationRequestInvalid");
    }

    const now = Date.now();
    const recent = (recentFollowerNotifications.get(actorUid) ?? []).filter(
      (timestamp) => now - timestamp < 60_000,
    );
    if (recent.length >= MAX_FOLLOWER_NOTIFICATIONS_PER_MINUTE) {
      throw new Error("notificationRateLimited");
    }
    recentFollowerNotifications.set(actorUid, [...recent, now]);

    const audience = await this.listFollowerUids(targetType, targetId);
    const uids = Array.from(new Set(audience.followerUids.map(normalizeUid).filter(Boolean)));
    if (uids.length === 0) {
      return { requested: 0, delivered: 0, unavailable: 0, results: [] };
    }

    const grants = notificationsServer.createGrantIssuer(actorUid);
    const issued = grants.issue({
      actorUid,
      uids,
      title,
      body,
      dedupeKey: `followers:${targetType}:${targetId}:${requestId}`,
      route: {
        href:
          targetType === "store"
            ? `/profile?mode=preview&uid=${encodeURIComponent(targetId)}`
            : "/notifications",
      },
      metadata: {
        source: "follower_broadcast",
        followTargetType: targetType,
        followTargetId: targetId,
        requestId,
      },
    });
    if (!issued) throw new Error("notificationGrantNotIssued");

    return {
      requested: uids.length,
      delivered: 0,
      unavailable: 0,
      results: uids.map((uid) => ({ uid, tokenCount: 0, status: "granted" as const })),
      notificationGrants: grants.toArray(),
    };
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
