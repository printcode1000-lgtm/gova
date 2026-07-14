import { govaApi, GOVA_API_ROUTES } from "@/core/api";
import type {
  FollowActionResult,
  FollowMutationInput,
  FollowStatus,
  FollowStatusInput,
} from "../entities/follow.types";

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
    return govaApi.get<FollowStatus>(
      `${GOVA_API_ROUTES.follow.status}?${toQuery(input)}`,
      { suppressErrorLog: true },
    );
  },

  follow(input: FollowMutationInput) {
    return govaApi.post<FollowActionResult>(
      GOVA_API_ROUTES.follow.root,
      input,
      { suppressErrorLog: true },
    );
  },

  unfollow(input: FollowMutationInput) {
    return govaApi.delete<FollowActionResult>(
      `${GOVA_API_ROUTES.follow.root}?${toQuery(input)}`,
      { suppressErrorLog: true },
    );
  },
};
