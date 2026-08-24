import "server-only";

export interface NotificationAdminIdentity {
  uid: string;
  phone: string;
}

type NotificationAdminAuthorizer = (identity: NotificationAdminIdentity) => boolean;

let authorizer: NotificationAdminAuthorizer = () => false;

/** Composition-only registration. Defaults fail closed. */
export function configureNotificationAdminAuthorization(
  next: NotificationAdminAuthorizer,
): void {
  authorizer = next;
}

export function assertNotificationAdmin(identity: NotificationAdminIdentity): void {
  if (!authorizer(identity)) throw new Error("forbidden");
}
