export interface GoogleIdProfile {
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
}

export function googleProfileFromPayload(payload: {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
}): GoogleIdProfile | null {
  if (!payload.sub || !payload.email) return null;
  const email = payload.email.trim().toLowerCase();
  return {
    providerUserId: payload.sub,
    email,
    emailVerified: payload.email_verified === true,
    fullName: payload.name?.trim() || email.split('@')[0] || email,
  };
}
