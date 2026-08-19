type SessionSigningSecretGetter = () => string;

let getSessionSigningSecretImpl: SessionSigningSecretGetter = () => {
  const secret = process.env.ASOL_SESSION_SIGNING_SECRET?.trim();
  if (!secret) {
    throw new Error('ASOL_SESSION_SIGNING_SECRET is not configured');
  }
  return secret;
};

export function registerSessionSigningSecret(getter: SessionSigningSecretGetter): void {
  getSessionSigningSecretImpl = getter;
}

export function getSessionSigningSecret(): string {
  return getSessionSigningSecretImpl();
}
