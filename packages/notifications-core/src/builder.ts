/**
 *  — the construction objects.
 *
 *  and  are implementation objects: a
 * consumer that can reach one can hold it, mutate it, and depend on its shape. Both halves
 * genuinely need them — the package's send service builds a notification before fan-out,
 * and the application's notification bus builds one before dispatch — so they belong on a
 * door rather than hidden.
 *
 * They are **not** on the  door because the application's own
 *  barrel forbids implementation objects entirely, and it
 * re-exports  wholesale. One blanket re-export leaked  into that
 * barrel and its boundary test caught it. Separating the doors lets each boundary keep its
 * own rule instead of forcing the stricter one to hand-maintain a list of 52 symbols.
 */
export * from './domain/notification-builder';
export * from './domain/notification-template-loader';
