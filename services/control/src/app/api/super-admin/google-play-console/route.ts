import { googlePlayConsoleEnvironment, googlePlayConsoleService } from '@/control/google-play';
import { runControlSuperAdminRoute } from '@/control/super-admin-route';
import { controlJson } from '@/control/operational-route';

/**
 * The disallowed-environment payload, byte for byte as the application sent it.
 *
 * It omits `config.credentialSource`, which `GooglePlayConsoleConfigStatus`
 * declares as required. That is the application's existing shape — the type was
 * never enforced there because the response helper inferred it from the literal
 * — and a mirror is the wrong place to change what a client receives. Typed as
 * the literal so the omission stays deliberate and visible rather than being
 * quietly filled in here.
 */
function unavailableSnapshot() {
  return {
    environment: googlePlayConsoleEnvironment(),
    fetchedAt: new Date().toISOString(),
    config: {
      packageName: '',
      keyFilePath: '',
      keyFileExists: false,
      serviceAccountEmail: '',
      serviceAccountProjectId: '',
      serviceAccountUniqueId: '',
    },
    editId: null,
    endpoints: [],
    summary: {
      successfulEndpoints: 0,
      failedEndpoints: 0,
      tracks: 0,
      releases: 0,
      listings: 0,
      reviews: 0,
      inAppProducts: 0,
      subscriptions: 0,
    },
  };
}

export async function GET(request: Request) {
  return runControlSuperAdminRoute(request, () => {
    if (!googlePlayConsoleEnvironment().allowed) return controlJson(unavailableSnapshot());
    return googlePlayConsoleService.snapshot();
  });
}
