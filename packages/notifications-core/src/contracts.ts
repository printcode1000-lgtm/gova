/**
 * Notifications — the type-only entry point.
 *
 * The third and last supported import path, for code that must speak the
 * module's vocabulary without depending on any of its behaviour: the
 * data-access repositories that store device tokens, and anything else that
 * persists a notification shape it did not create.
 *
 * It exports domain types and their constants — nothing else. No service, no
 * adapter, no `server-only` import, and deliberately no `notifications` object:
 * a consumer that needs a use case is on the wrong side of this boundary and
 * should import `@/features/notifications` or `.../server` instead.
 *
 * Why it exists rather than routing those imports through `server.ts`: the
 * notifications microservice is built by walking the import graph from its
 * route entry points (`scripts/sync-notifications-service-sources.ts`), and a
 * data-access file that reaches `server.ts` drags the broadcast service, the
 * token service, and the whole users repository into a deployment that must not
 * contain them. Types cost nothing to reach; services cost correctness.
 */

export * from "./domain/enums";
export * from "./domain/entities";
