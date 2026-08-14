export const FOLLOW_TARGET_TYPES = ["store", "product", "category"] as const;

export type FollowTargetType = (typeof FOLLOW_TARGET_TYPES)[number];

export interface FollowTarget {
  targetType: FollowTargetType;
  targetId: string;
  targetOwnerUid?: string;
}

export interface FollowStatusInput extends FollowTarget {
  viewerUid?: string;
}

export interface FollowMutationInput extends FollowTarget {
  viewerUid: string;
}

export interface FollowStatus {
  targetType: FollowTargetType;
  targetId: string;
  followerCount: number;
  isFollowing: boolean;
  canFollow: boolean;
  reason?: "login_required" | "self_not_allowed";
}

export interface FollowActionResult extends FollowStatus {
  changed: boolean;
}

export interface FollowAudience {
  targetType: FollowTargetType;
  targetId: string;
  followerUids: string[];
}

export interface FollowerNotificationIdentity {
  uid: string;
  phone: string;
}

export interface SendFollowerNotificationInput extends FollowTarget {
  identity: FollowerNotificationIdentity;
  title: string;
  body: string;
  requestId: string;
}

export interface FollowerNotificationRecipientResult {
  uid: string;
  tokenCount: number;
  status: "sent" | "partial" | "queued" | "failed" | "no_tokens" | "granted";
}

export interface SendFollowerNotificationResult {
  requested: number;
  delivered: number;
  unavailable: number;
  results: FollowerNotificationRecipientResult[];
  notificationGrants?: string[];
}
