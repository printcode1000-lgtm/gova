import { asolApi, ASOL_API_ROUTES } from "@/core/api";
import type {
  FollowActionResult,
  FollowMutationInput,
  FollowStatus,
  FollowStatusInput,
  SendFollowerNotificationInput,
  SendFollowerNotificationResult,
} from "../entities/follow.types";
import { deliverNotificationGrants } from "@/modules/notification-bridge";

function toQuery(input: FollowStatusInput): string {
  const params = new URLSearchParams({
    targetType: input.targetType,
    targetId: input.targetId,
  });
  if (input.viewerUid) params.set("viewerUid", input.viewerUid);
  if (input.targetOwnerUid) params.set("targetOwnerUid", input.targetOwnerUid);
  return params.toString();
}

export const followApiService = {
  getStatus(input: FollowStatusInput) {
    return asolApi.get<FollowStatus>(
      `${ASOL_API_ROUTES.follow.status}?${toQuery(input)}`,
      { suppressErrorLog: true },
    );
  },

  follow(input: FollowMutationInput) {
    return asolApi.post<FollowActionResult>(
      ASOL_API_ROUTES.follow.root,
      input,
      { suppressErrorLog: true },
    );
  },

  unfollow(input: FollowMutationInput) {
    return asolApi.delete<FollowActionResult>(
      `${ASOL_API_ROUTES.follow.root}?${toQuery(input)}`,
      { suppressErrorLog: true },
    );
  },

  async notifyFollowers(
    input: SendFollowerNotificationInput & { sessionToken: string },
  ): Promise<SendFollowerNotificationResult> {
    const { sessionToken, ...body } = input;
    if (!sessionToken.trim()) throw new Error("sessionTokenInvalid");
    const granted = await asolApi.post<SendFollowerNotificationResult>(
      ASOL_API_ROUTES.follow.notifications,
      body,
      {
        headers: { "x-asol-session-token": sessionToken },
        notificationGrantDelivery: "manual",
      },
    );
    const delivery = await deliverNotificationGrants(granted);
    const byUid = new Map(delivery.recipientResults.map((result) => [result.uid, result]));
    const results = granted.results.map((placeholder) =>
      byUid.get(placeholder.uid) ?? {
        uid: placeholder.uid,
        tokenCount: 0,
        status: "failed" as const,
      },
    );
    return {
      ...granted,
      delivered: delivery.delivered,
      unavailable: Math.max(0, granted.requested - delivery.delivered),
      results,
    };
  },
};
