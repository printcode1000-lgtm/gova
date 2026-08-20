export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Every server-side port a sealed package names is registered in one place. See
    // `src/core/composition/server-ports.ts` for why the seams stay separately importable.
    const { registerAppServerPorts } = await import('@/core/composition/server-ports');
    await registerAppServerPorts();
  }
}
