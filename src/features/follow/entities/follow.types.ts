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
