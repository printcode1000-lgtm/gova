export interface ReviewerAvatarPort {
  getAvatarUrl(uid: string): Promise<string | null>;
}

let reviewerAvatarPort: ReviewerAvatarPort | null = null;

export function registerReviewerAvatarPort(port: ReviewerAvatarPort): void {
  reviewerAvatarPort = port;
}

export function getReviewerAvatarPort(): ReviewerAvatarPort {
  if (!reviewerAvatarPort) {
    throw new Error('ReviewerAvatarPort is not registered');
  }
  return reviewerAvatarPort;
}
