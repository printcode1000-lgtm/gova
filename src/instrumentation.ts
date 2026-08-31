export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { isGovaFrontendRuntime } = await import('@/core/config/runtime-role');

  // gova is a frontend. Loading the full root here would pull every business
  // package into its server trace to register ports no route in that deployment
  // can reach — which is exactly the graph the cutover removes.
  if (isGovaFrontendRuntime()) {
    const { registerGovaFrontendServerPorts } = await import(
      '@/core/composition/gova-frontend-ports'
    );
    await registerGovaFrontendServerPorts();
    return;
  }

  // Every server-side port a sealed package names is registered in one place. See
  // `src/core/composition/server-ports.ts` for why the seams stay separately importable.
  const { registerAppServerPorts } = await import('@/core/composition/server-ports');
  await registerAppServerPorts();
}
