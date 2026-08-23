import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

const editOwner = new AsyncLocalStorage<boolean>();
let editQueue = Promise.resolve();

export async function withGooglePlayEditLock<T>(operation: () => Promise<T>): Promise<T> {
  if (editOwner.getStore()) return operation();

  const predecessor = editQueue;
  let release!: () => void;
  editQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await predecessor;
  try {
    return await editOwner.run(true, operation);
  } finally {
    release();
  }
}
